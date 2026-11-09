import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError, NotFoundError } from "@/server/errors";
import type { Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import { LEGAL_LIMIT_HOURS, MAX_EXTENSION_HOURS, type DetentionLogInput, type EndDetentionInput, type ExtendDetentionInput, type StartDetentionInput } from "@/server/detention/schemas";

const HOUR = 3_600_000;

export function detentionScopeWhere(actor: Actor): Prisma.DetentionWhereInput {
  switch (actor.scopeLevel) {
    case "NATIONAL":
      return {};
    case "REGIONAL":
      return { station: { regionId: actor.regionId ?? "__none__" } };
    default:
      return { stationId: { in: actor.stationIds && actor.stationIds.length ? actor.stationIds : ["__none__"] } };
  }
}

/** The deadline that counts: the extension when there is one, otherwise the legal limit. */
export function deadlineOf(d: { legalLimitAt: Date; extendedUntil: Date | null }): Date {
  return d.extendedUntil && d.extendedUntil > d.legalLimitAt ? d.extendedUntil : d.legalLimitAt;
}

export const detentionSelect = {
  id: true, number: true, cellNumber: true, startedAt: true, legalLimitAt: true, extendedUntil: true, extensionAuthority: true, extensionReason: true, status: true, endedAt: true, endReason: true, endNotes: true, medicalNotes: true, stationId: true,
  person: { select: { id: true, number: true, firstName: true, lastName: true } },
  arrest: { select: { id: true, number: true, charges: true, status: true } },
  station: { select: { id: true, code: true, name: true, regionId: true } },
  recordedBy: { select: { firstName: true, lastName: true } },
  logs: { orderBy: { occurredAt: "desc" }, select: { id: true, type: true, notes: true, occurredAt: true, recordedBy: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.DetentionSelect;

export async function getDetention(actor: Actor, id: string) {
  const d = await prisma.detention.findFirst({ where: { id, AND: [detentionScopeWhere(actor)] }, select: detentionSelect });
  if (!d) throw new NotFoundError("Detention");
  return d;
}

export async function listDetentions(actor: Actor, filter: { q?: string; status?: string; overdue?: boolean; page?: number; pageSize?: number } = {}) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const q = filter.q?.trim();
  const now = new Date();
  const where: Prisma.DetentionWhereInput = {
    AND: [
      detentionScopeWhere(actor),
      // overdue = still open and past the deadline that counts
      ...(filter.overdue ? [{ status: { not: "ENDED" as const }, OR: [{ extendedUntil: null, legalLimitAt: { lt: now } }, { extendedUntil: { lt: now } }] }] : []),
    ],
    ...(filter.status ? { status: filter.status as never } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { cellNumber: { contains: q, mode: "insensitive" } }, { person: { lastName: { contains: q, mode: "insensitive" } } }, { person: { firstName: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.detention.findMany({ where, orderBy: [{ status: "asc" }, { legalLimitAt: "asc" }], skip: (page - 1) * pageSize, take: pageSize, select: { id: true, number: true, cellNumber: true, startedAt: true, legalLimitAt: true, extendedUntil: true, status: true, person: { select: { id: true, firstName: true, lastName: true } }, station: { select: { name: true } } } }),
    prisma.detention.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

/** Arrests that may still be placed in custody: in scope, not final, and without an open detention. */
export async function arrestsAvailableForDetention(actor: Actor) {
  const scope: Prisma.ArrestWhereInput =
    actor.scopeLevel === "NATIONAL" ? {} : actor.scopeLevel === "REGIONAL" ? { station: { regionId: actor.regionId ?? "__none__" } } : { stationId: { in: actor.stationIds?.length ? actor.stationIds : ["__none__"] } };
  return prisma.arrest.findMany({
    where: { ...scope, status: { in: ["RECORDED", "IN_CUSTODY"] }, detentions: { none: { status: { not: "ENDED" } } } },
    orderBy: { arrestedAt: "desc" },
    take: 100,
    select: { id: true, number: true, person: { select: { firstName: true, lastName: true } } },
  });
}

export async function startDetention(actor: Actor, input: StartDetentionInput, ctx: RequestContext) {
  const a = await prisma.arrest.findFirst({ where: { id: input.arrestId, AND: [{ ...(actor.scopeLevel === "NATIONAL" ? {} : actor.scopeLevel === "REGIONAL" ? { station: { regionId: actor.regionId ?? "__none__" } } : { stationId: { in: actor.stationIds?.length ? actor.stationIds : ["__none__"] } }) }] }, select: { id: true, number: true, status: true, personId: true, stationId: true, arrestedAt: true, detentions: { where: { status: { not: "ENDED" } }, select: { id: true } } } });
  if (!a) throw new NotFoundError("Arrest");
  if (a.status !== "RECORDED" && a.status !== "IN_CUSTODY") throw new BusinessError(`An arrest in status ${a.status} cannot be placed in custody.`, "STATE");
  if (a.detentions.length > 0) throw new BusinessError("This person is already in an open detention.", "CONFLICT");
  if (input.startedAt.getTime() > Date.now() + 5 * 60_000) throw new BusinessError("The start of custody cannot be in the future.", "VALIDATION");
  // The legal clock runs from the arrest, not from the paperwork: custody cannot start before the arrest itself.
  if (input.startedAt < a.arrestedAt) throw new BusinessError("Custody cannot start before the arrest.", "VALIDATION");
  const legalLimitAt = new Date(a.arrestedAt.getTime() + LEGAL_LIMIT_HOURS * HOUR);
  return prisma.$transaction(async (tx) => {
    const number = await nextNumber("DETENTION", tx);
    const d = await tx.detention.create({ data: { number, arrestId: a.id, personId: a.personId, stationId: a.stationId, cellNumber: input.cellNumber || null, startedAt: input.startedAt, legalLimitAt, status: "ACTIVE", medicalNotes: input.medicalNotes || null, recordedById: actor.id }, select: { id: true, number: true, status: true, legalLimitAt: true } });
    if (a.status === "RECORDED") await tx.arrest.update({ where: { id: a.id }, data: { status: "IN_CUSTODY" } });
    await logAudit({ actor, action: "DETENTION_STARTED", module: "detention", entityType: "Detention", entityId: d.id, entityLabel: d.number, summary: `Custody ${d.number} started for arrest ${a.number}; legal limit ${legalLimitAt.toISOString()}`, after: { legalLimitAt }, context: ctx }, tx);
    return d;
  });
}

export async function addDetentionLog(actor: Actor, input: DetentionLogInput, ctx: RequestContext) {
  const d = await getDetention(actor, input.detentionId);
  if (d.status === "ENDED") throw new BusinessError("This custody has ended; no more entries can be added.", "STATE");
  const log = await prisma.detentionLog.create({ data: { detentionId: d.id, type: input.type, notes: input.notes, recordedById: actor.id }, select: { id: true } });
  await logAudit({ actor, action: "DETENTION_LOG_ADDED", module: "detention", entityType: "Detention", entityId: d.id, entityLabel: d.number, summary: `${d.number}: ${input.type} entry`, context: ctx });
  return log;
}

export async function extendDetention(actor: Actor, input: ExtendDetentionInput, ctx: RequestContext) {
  const d = await getDetention(actor, input.detentionId);
  if (d.status === "ENDED") throw new BusinessError("This custody has ended.", "STATE");
  const current = deadlineOf(d);
  if (input.extendedUntil <= current) throw new BusinessError("The new deadline must be after the current one.", "VALIDATION");
  if (input.extendedUntil.getTime() > d.legalLimitAt.getTime() + MAX_EXTENSION_HOURS * HOUR) throw new BusinessError(`An extension cannot exceed ${MAX_EXTENSION_HOURS} hours beyond the legal limit.`, "VALIDATION");
  const after = await prisma.detention.update({ where: { id: d.id }, data: { extendedUntil: input.extendedUntil, extensionAuthority: input.extensionAuthority, extensionReason: input.extensionReason, status: "EXTENDED" }, select: { status: true, extendedUntil: true } });
  await logAudit({ actor, action: "DETENTION_EXTENDED", module: "detention", entityType: "Detention", entityId: d.id, entityLabel: d.number, summary: `${d.number}: extended until ${input.extendedUntil.toISOString()} by ${input.extensionAuthority}`, before: { deadline: current }, after: { deadline: input.extendedUntil }, context: ctx });
  return after;
}

const ARREST_STATUS_FOR_END: Record<string, "RELEASED" | "CHARGED" | "TRANSFERRED" | null> = {
  RELEASED_NO_CHARGE: "RELEASED",
  RELEASED_ON_BAIL: "RELEASED",
  TRANSFERRED_PROSECUTION: "CHARGED",
  COURT_APPEARANCE: "CHARGED",
  TRANSFERRED_STATION: "TRANSFERRED",
  MEDICAL: null,
  OTHER: null,
};

export async function endDetention(actor: Actor, input: EndDetentionInput, ctx: RequestContext) {
  const d = await getDetention(actor, input.detentionId);
  if (d.status === "ENDED") throw new BusinessError("This custody has already ended.", "STATE");
  const arrestStatus = ARREST_STATUS_FOR_END[input.endReason];
  return prisma.$transaction(async (tx) => {
    const after = await tx.detention.update({ where: { id: d.id }, data: { status: "ENDED", endedAt: new Date(), endReason: input.endReason, endNotes: input.endNotes }, select: { status: true, endedAt: true } });
    if (arrestStatus && (d.arrest.status === "IN_CUSTODY" || d.arrest.status === "RECORDED")) await tx.arrest.update({ where: { id: d.arrest.id }, data: { status: arrestStatus } });
    await logAudit({ actor, action: "DETENTION_ENDED", module: "detention", entityType: "Detention", entityId: d.id, entityLabel: d.number, summary: `${d.number}: custody ended (${input.endReason})${arrestStatus ? `; arrest ${d.arrest.number} → ${arrestStatus}` : ""}`, before: { status: d.status }, after: { status: "ENDED", endReason: input.endReason }, context: ctx }, tx);
    return after;
  });
}

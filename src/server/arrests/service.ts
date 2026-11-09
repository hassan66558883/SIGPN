import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError, NotFoundError } from "@/server/errors";
import { inScope, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import type { ArrestInput, ArrestStatusInput } from "@/server/arrests/schemas";

export function arrestScopeWhere(actor: Actor): Prisma.ArrestWhereInput {
  switch (actor.scopeLevel) {
    case "NATIONAL":
      return {};
    case "REGIONAL":
      return { station: { regionId: actor.regionId ?? "__none__" } };
    default:
      return { stationId: { in: actor.stationIds && actor.stationIds.length ? actor.stationIds : ["__none__"] } };
  }
}

export const arrestSelect = {
  id: true, number: true, arrestedAt: true, locationText: true, authority: true, charges: true, circumstances: true, rightsReadAt: true, status: true, notes: true, createdAt: true, stationId: true,
  person: { select: { id: true, number: true, firstName: true, lastName: true } },
  case: { select: { id: true, number: true, title: true } },
  warrant: { select: { id: true, number: true, type: true, status: true } },
  arrestingOfficer: { select: { id: true, badgeNumber: true, firstName: true, lastName: true } },
  station: { select: { id: true, code: true, name: true, regionId: true } },
  recordedBy: { select: { firstName: true, lastName: true } },
  detentions: { orderBy: { startedAt: "desc" }, select: { id: true, number: true, status: true, startedAt: true, legalLimitAt: true } },
} satisfies Prisma.ArrestSelect;

export async function getArrest(actor: Actor, id: string) {
  const a = await prisma.arrest.findFirst({ where: { id, AND: [arrestScopeWhere(actor)] }, select: arrestSelect });
  if (!a) throw new NotFoundError("Arrest");
  return a;
}

export async function listArrests(actor: Actor, filter: { q?: string; status?: string; page?: number; pageSize?: number } = {}) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const q = filter.q?.trim();
  const where: Prisma.ArrestWhereInput = {
    AND: [arrestScopeWhere(actor)],
    ...(filter.status ? { status: filter.status as never } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { charges: { contains: q, mode: "insensitive" } }, { person: { lastName: { contains: q, mode: "insensitive" } } }, { person: { firstName: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.arrest.findMany({ where, orderBy: { arrestedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, number: true, arrestedAt: true, authority: true, charges: true, status: true, person: { select: { id: true, firstName: true, lastName: true } }, station: { select: { code: true, name: true } } } }),
    prisma.arrest.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

/** Officers the actor may name as the arresting officer (within their scope). */
export async function selectableOfficers(actor: Actor) {
  const scope: Prisma.OfficerWhereInput =
    actor.scopeLevel === "NATIONAL" ? {} : actor.scopeLevel === "REGIONAL" ? { station: { regionId: actor.regionId ?? "__none__" } } : { stationId: { in: actor.stationIds?.length ? actor.stationIds : ["__none__"] } };
  return prisma.officer.findMany({ where: { deletedAt: null, ...scope }, orderBy: { lastName: "asc" }, take: 200, select: { id: true, badgeNumber: true, firstName: true, lastName: true } });
}

export async function createArrest(actor: Actor, input: ArrestInput, ctx: RequestContext) {
  const person = await prisma.person.findFirst({ where: { id: input.personId, deletedAt: null }, select: { id: true, firstName: true, lastName: true } });
  if (!person) throw new NotFoundError("Person");
  const officerId = input.arrestingOfficerId || actor.officerId;
  if (!officerId) throw new BusinessError("Select the arresting officer: your account is not linked to an officer record.", "VALIDATION");
  const officer = await prisma.officer.findFirst({ where: { id: officerId, deletedAt: null }, select: { id: true, stationId: true, station: { select: { regionId: true } } } });
  if (!officer || !inScope(actor, { stationId: officer.stationId, regionId: officer.station.regionId })) throw new NotFoundError("Officer");
  if (input.arrestedAt.getTime() > Date.now() + 5 * 60_000) throw new BusinessError("The arrest time cannot be in the future.", "VALIDATION");
  if (input.caseId) {
    const c = await prisma.case.findUnique({ where: { id: input.caseId }, select: { stationId: true, regionId: true } });
    if (!c || !inScope(actor, { stationId: c.stationId, regionId: c.regionId })) throw new NotFoundError("Case");
  }
  if (input.authority === "WARRANT" && !input.warrantId) throw new BusinessError("An arrest under a warrant must reference that warrant.", "VALIDATION");
  if (input.warrantId) {
    const w = await prisma.warrant.findUnique({ where: { id: input.warrantId }, select: { status: true, personId: true, expiresAt: true } });
    if (!w) throw new NotFoundError("Warrant");
    if (w.personId !== person.id) throw new BusinessError("This warrant targets another person.", "STATE");
    if (w.status !== "ACTIVE") throw new BusinessError(`The warrant must be ACTIVE (currently ${w.status}).`, "STATE");
    if (w.expiresAt && w.expiresAt.getTime() < Date.now()) throw new BusinessError("The warrant has expired.", "STATE");
  }
  return prisma.$transaction(async (tx) => {
    const number = await nextNumber("ARREST", tx);
    const a = await tx.arrest.create({
      data: { number, personId: person.id, caseId: input.caseId || null, warrantId: input.warrantId || null, arrestingOfficerId: officer.id, stationId: officer.stationId, arrestedAt: input.arrestedAt, locationText: input.locationText, authority: input.authority, charges: input.charges, circumstances: input.circumstances || null, rightsReadAt: input.rightsReadAt, status: "RECORDED", notes: input.notes || null, recordedById: actor.id },
      select: { id: true, number: true, status: true },
    });
    await logAudit({ actor, action: "ARREST_RECORDED", module: "arrests", entityType: "Arrest", entityId: a.id, entityLabel: a.number, summary: `Arrest ${a.number} recorded for ${person.firstName} ${person.lastName} (${input.authority})`, after: { authority: input.authority, charges: input.charges }, context: ctx }, tx);
    return a;
  });
}

const TRANSITIONS: Record<string, string[]> = {
  RECORDED: ["IN_CUSTODY", "RELEASED", "TRANSFERRED", "CHARGED"],
  IN_CUSTODY: ["RELEASED", "TRANSFERRED", "CHARGED"],
  RELEASED: [],
  TRANSFERRED: [],
  CHARGED: [],
};

export async function changeArrestStatus(actor: Actor, input: ArrestStatusInput, ctx: RequestContext) {
  const a = await getArrest(actor, input.arrestId);
  if (!TRANSITIONS[a.status]?.includes(input.status)) throw new BusinessError(`Cannot move an arrest from ${a.status} to ${input.status}.`, "STATE");
  if (input.status === "RELEASED" && !input.notes) throw new BusinessError("A reason is required to release.", "VALIDATION");
  if (input.status === "RELEASED" && a.detentions.some((d) => d.status !== "ENDED")) throw new BusinessError("End the active detention before releasing.", "STATE");
  const note = input.notes ? [a.notes, `[${new Date().toISOString().slice(0, 10)}] ${input.notes}`].filter(Boolean).join("\n") : undefined;
  const after = await prisma.arrest.update({ where: { id: a.id }, data: { status: input.status, ...(note ? { notes: note } : {}) }, select: { status: true } });
  await logAudit({ actor, action: `ARREST_${input.status}`, module: "arrests", entityType: "Arrest", entityId: a.id, entityLabel: a.number, summary: `${a.number}: ${a.status} → ${input.status}`, before: { status: a.status }, after: { status: after.status }, context: ctx });
  return after;
}

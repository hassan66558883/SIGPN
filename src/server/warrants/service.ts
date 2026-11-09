import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError, NotFoundError } from "@/server/errors";
import { inScope, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import { AuthError } from "@/server/errors";
import { setWarrantStatus } from "@/server/wanted/service";
import type { WarrantDecisionInput, WarrantInput } from "@/server/warrants/schemas";

/** A warrant has no station of its own: it is scoped through the person who requested it, or through its case. */
export function warrantScopeWhere(actor: Actor): Prisma.WarrantWhereInput {
  switch (actor.scopeLevel) {
    case "NATIONAL":
      return {};
    case "REGIONAL": {
      const r = actor.regionId ?? "__none__";
      return { OR: [{ requestedBy: { regionId: r } }, { case: { regionId: r } }] };
    }
    default: {
      const s = actor.stationIds && actor.stationIds.length ? actor.stationIds : ["__none__"];
      return { OR: [{ requestedBy: { stationId: { in: s } } }, { case: { stationId: { in: s } } }] };
    }
  }
}

export const warrantSelect = {
  id: true, number: true, type: true, status: true, issuingAuthority: true, issuingAuthorityRef: true, grounds: true, targetAddress: true,
  issuedAt: true, expiresAt: true, approvedAt: true, decisionNotes: true, executedAt: true, executionNotes: true, cancelledAt: true, cancellationReason: true, createdAt: true,
  person: { select: { id: true, number: true, firstName: true, lastName: true } },
  case: { select: { id: true, number: true, title: true, stationId: true, regionId: true } },
  requestedBy: { select: { id: true, firstName: true, lastName: true, stationId: true, regionId: true } },
  approvedBy: { select: { firstName: true, lastName: true } },
  executedBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.WarrantSelect;

export async function getWarrant(actor: Actor, id: string) {
  const w = await prisma.warrant.findFirst({ where: { id, AND: [warrantScopeWhere(actor)] }, select: warrantSelect });
  if (!w) throw new NotFoundError("Warrant");
  return w;
}

/** Consultation of a warrant: always audited (who looked at which warrant, and when). */
export async function viewWarrant(actor: Actor, id: string, ctx: RequestContext) {
  const w = await getWarrant(actor, id);
  await logAudit({ actor, action: "WARRANT_VIEWED", module: "warrants", entityType: "Warrant", entityId: w.id, entityLabel: w.number, summary: `Warrant ${w.number} consulted`, context: ctx });
  return w;
}

export async function listWarrants(actor: Actor, filter: { q?: string; status?: string; type?: string; page?: number; pageSize?: number } = {}) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const q = filter.q?.trim();
  const where: Prisma.WarrantWhereInput = {
    AND: [warrantScopeWhere(actor)],
    ...(filter.status ? { status: filter.status as never } : {}),
    ...(filter.type ? { type: filter.type as never } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { issuingAuthority: { contains: q, mode: "insensitive" } }, { person: { lastName: { contains: q, mode: "insensitive" } } }, { person: { firstName: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.warrant.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, number: true, type: true, status: true, issuingAuthority: true, expiresAt: true, createdAt: true, person: { select: { id: true, firstName: true, lastName: true } } } }),
    prisma.warrant.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function createWarrant(actor: Actor, input: WarrantInput, ctx: RequestContext) {
  const person = await prisma.person.findFirst({ where: { id: input.personId, deletedAt: null }, select: { id: true, firstName: true, lastName: true } });
  if (!person) throw new NotFoundError("Person");
  if (input.caseId) {
    const c = await prisma.case.findUnique({ where: { id: input.caseId }, select: { stationId: true, regionId: true } });
    if (!c || !inScope(actor, { stationId: c.stationId, regionId: c.regionId })) throw new NotFoundError("Case");
  }
  if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) throw new BusinessError("The expiry date must be in the future.", "VALIDATION");
  const w = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("WARRANT", tx);
    const wr = await tx.warrant.create({ data: { number, type: input.type, personId: person.id, caseId: input.caseId || null, issuingAuthority: input.issuingAuthority, issuingAuthorityRef: input.issuingAuthorityRef || null, grounds: input.grounds, targetAddress: input.targetAddress || null, expiresAt: input.expiresAt ?? null, status: "DRAFT", requestedById: actor.id } });
    await logAudit({ actor, action: "WARRANT_CREATED", module: "warrants", entityType: "Warrant", entityId: wr.id, entityLabel: wr.number, summary: `Warrant ${wr.number} (${input.type}) requested for ${person.firstName} ${person.lastName}`, after: { type: wr.type, issuingAuthority: wr.issuingAuthority }, context: ctx }, tx);
    return wr;
  });
  return w;
}

const NEEDS: Record<WarrantDecisionInput["status"], "warrants:approve" | "warrants:execute" | "warrants:cancel"> = {
  ACTIVE: "warrants:approve",
  REJECTED: "warrants:approve",
  EXECUTED: "warrants:execute",
  CANCELLED: "warrants:cancel",
};

/** Approve / reject / execute / cancel. Four-eyes: the requester can never approve or reject their own warrant. */
export async function decideWarrant(actor: Actor, input: WarrantDecisionInput, ctx: RequestContext) {
  const w = await getWarrant(actor, input.warrantId);
  const need = NEEDS[input.status];
  if (!actor.permissions.has(need)) throw new AuthError("forbidden", `Permission ${need} required`);
  if ((input.status === "ACTIVE" || input.status === "REJECTED") && w.requestedBy.id === actor.id) throw new BusinessError("You cannot approve or reject a warrant you requested yourself.", "STATE");
  if ((input.status === "ACTIVE") && w.expiresAt && w.expiresAt.getTime() <= Date.now()) throw new BusinessError("This warrant has already expired; it cannot be approved.", "STATE");
  if ((input.status === "REJECTED" || input.status === "CANCELLED") && !input.notes) throw new BusinessError("A reason is required.", "VALIDATION");
  return setWarrantStatus(actor, { warrantId: w.id, status: input.status, notes: input.notes }, ctx);
}

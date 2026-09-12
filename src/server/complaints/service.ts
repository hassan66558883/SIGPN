import "server-only";
import type { ComplaintStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError, NotFoundError } from "@/server/errors";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import { notify, notifyPermission } from "@/server/notifications";
import { addCaseEvent } from "@/server/timeline";
import type { ComplaintInput } from "@/server/complaints/schemas";
import { getPerson } from "@/server/persons/service";

const nul = (v: string | undefined | null) => (v ? v : null);

/**
 * Complaint workflow:  DRAFT → REGISTERED → UNDER_REVIEW → ASSIGNED → CONVERTED
 *                                       ↘ CLOSED / REJECTED (from REGISTERED, UNDER_REVIEW, ASSIGNED)
 */
const TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  DRAFT: ["REGISTERED"],
  REGISTERED: ["UNDER_REVIEW", "ASSIGNED", "CLOSED", "REJECTED"],
  UNDER_REVIEW: ["ASSIGNED", "CONVERTED", "CLOSED", "REJECTED"],
  ASSIGNED: ["UNDER_REVIEW", "CONVERTED", "CLOSED", "REJECTED"],
  CONVERTED: [],
  CLOSED: [],
  REJECTED: [],
};

export const complaintSelect = {
  id: true,
  number: true,
  title: true,
  description: true,
  category: true,
  priority: true,
  status: true,
  isAnonymous: true,
  incidentAt: true,
  receivedAt: true,
  locationText: true,
  reviewNotes: true,
  reviewedAt: true,
  closureReason: true,
  closedAt: true,
  caseId: true,
  createdAt: true,
  updatedAt: true,
  regionId: true,
  stationId: true,
  station: { select: { id: true, code: true, name: true, regionId: true } },
  complainant: { select: { id: true, number: true, firstName: true, lastName: true, phone: true } },
  assignedTo: { select: { id: true, username: true, firstName: true, lastName: true } },
  reviewedBy: { select: { id: true, username: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, username: true, firstName: true, lastName: true } },
  case: { select: { id: true, number: true, status: true } },
} satisfies Prisma.ComplaintSelect;

export async function getComplaint(actor: Actor, id: string) {
  const c = await prisma.complaint.findFirst({ where: { id, deletedAt: null }, select: complaintSelect });
  if (!c || !inScope(actor, { stationId: c.stationId, regionId: c.regionId })) throw new NotFoundError("Complaint");
  return c;
}

/** The station of a new record: the actor's own station unless a wider-scope actor picks one in scope. */
async function resolveStation(actor: Actor, stationId: string | null) {
  const id = stationId ?? actor.stationId;
  if (!id) throw new BusinessError("Select the station receiving the complaint.");
  const st = await prisma.station.findUnique({ where: { id }, select: { id: true, regionId: true, isActive: true, name: true } });
  if (!st || !st.isActive) throw new BusinessError("Selected station is invalid or inactive.");
  if (!inScope(actor, { stationId: st.id, regionId: st.regionId })) throw new BusinessError("You can only register complaints for a station inside your scope.", "STATE");
  return st;
}

export async function createComplaint(actor: Actor, input: ComplaintInput, ctx: RequestContext) {
  const st = await resolveStation(actor, nul(input.stationId));
  const complainantId = nul(input.complainantId);
  if (!input.isAnonymous && !complainantId) throw new BusinessError("Select the complainant or mark the complaint as anonymous.");
  if (complainantId) await getPerson(actor, complainantId);
  if (input.incidentAt && input.incidentAt.getTime() > Date.now() + 60_000) throw new BusinessError("The incident date cannot be in the future.");
  const status: ComplaintStatus = input.submit === "register" ? "REGISTERED" : "DRAFT";
  const c = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("COMPLAINT", tx);
    const created = await tx.complaint.create({
      data: {
        number,
        complainantId: input.isAnonymous ? null : complainantId,
        isAnonymous: input.isAnonymous,
        category: input.category,
        title: input.title,
        description: input.description,
        incidentAt: input.incidentAt,
        locationText: nul(input.locationText),
        regionId: st.regionId,
        stationId: st.id,
        priority: input.priority,
        status,
        createdById: actor.id,
      },
      select: complaintSelect,
    });
    await logAudit({ actor, action: status === "REGISTERED" ? "COMPLAINT_REGISTERED" : "COMPLAINT_CREATED", module: "complaints", entityType: "Complaint", entityId: created.id, entityLabel: created.number, summary: `Complaint ${created.number} ${status === "REGISTERED" ? "registered" : "drafted"} at ${st.name} — ${created.title}`, after: { ...created, description: undefined }, context: ctx }, tx);
    return created;
  });
  if (status === "REGISTERED") await notifyPermission({ permission: "complaints:review", stationId: st.id, excludeUserId: actor.id, kind: "APPROVAL", title: "New complaint to review", body: `${c.number} — ${c.title}`, href: `/complaints/${c.id}` });
  return c;
}

export async function updateComplaint(actor: Actor, id: string, input: Omit<ComplaintInput, "submit" | "stationId">, ctx: RequestContext) {
  const before = await getComplaint(actor, id);
  if (!["DRAFT", "REGISTERED", "UNDER_REVIEW"].includes(before.status)) throw new BusinessError(`A complaint in status ${before.status} can no longer be edited.`, "STATE");
  const complainantId = nul(input.complainantId);
  if (!input.isAnonymous && !complainantId) throw new BusinessError("Select the complainant or mark the complaint as anonymous.");
  if (complainantId) await getPerson(actor, complainantId);
  const after = await prisma.complaint.update({
    where: { id },
    data: { complainantId: input.isAnonymous ? null : complainantId, isAnonymous: input.isAnonymous, category: input.category, title: input.title, description: input.description, incidentAt: input.incidentAt, locationText: nul(input.locationText), priority: input.priority },
    select: complaintSelect,
  });
  await logAudit({ actor, action: "COMPLAINT_UPDATED", module: "complaints", entityType: "Complaint", entityId: id, entityLabel: after.number, summary: `Complaint ${after.number} updated`, before: { title: before.title, category: before.category, priority: before.priority, complainantId: before.complainant?.id }, after: { title: after.title, category: after.category, priority: after.priority, complainantId: after.complainant?.id }, context: ctx });
  return after;
}

async function transition(actor: Actor, id: string, to: ComplaintStatus, data: Prisma.ComplaintUncheckedUpdateInput, action: string, summary: string, ctx: RequestContext, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;
  const before = await getComplaint(actor, id);
  if (!TRANSITIONS[before.status].includes(to)) throw new BusinessError(`Cannot move a complaint from ${before.status} to ${to}.`, "STATE");
  const r = await db.complaint.updateMany({ where: { id, status: before.status }, data: { ...data, status: to } });
  if (r.count !== 1) throw new BusinessError("The complaint was modified concurrently. Reload and retry.", "CONFLICT");
  await logAudit({ actor, action, module: "complaints", entityType: "Complaint", entityId: id, entityLabel: before.number, summary: `${before.number}: ${summary}`, before: { status: before.status }, after: { status: to, ...JSON.parse(JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? String(v) : v))) }, context: ctx }, db);
  return before;
}

export async function registerComplaint(actor: Actor, id: string, ctx: RequestContext) {
  const before = await transition(actor, id, "REGISTERED", { receivedAt: new Date() }, "COMPLAINT_REGISTERED", "draft registered", ctx);
  await notifyPermission({ permission: "complaints:review", stationId: before.stationId, excludeUserId: actor.id, kind: "APPROVAL", title: "New complaint to review", body: `${before.number} — ${before.title}`, href: `/complaints/${id}` });
}

export async function reviewComplaint(actor: Actor, id: string, input: { reviewNotes?: string; priority?: string }, ctx: RequestContext) {
  await transition(actor, id, "UNDER_REVIEW", { reviewedById: actor.id, reviewedAt: new Date(), reviewNotes: nul(input.reviewNotes), ...(input.priority ? { priority: input.priority as Prisma.ComplaintUncheckedUpdateInput["priority"] } : {}) }, "COMPLAINT_REVIEWED", `under review by ${actor.username}`, ctx);
}

export async function assignComplaint(actor: Actor, id: string, assignedToId: string, reviewNotes: string | undefined, ctx: RequestContext) {
  const target = await prisma.user.findFirst({ where: { id: assignedToId, status: "ACTIVE", deletedAt: null }, select: { id: true, username: true, firstName: true, lastName: true, stationId: true, regionId: true, role: { select: { permissions: { select: { permission: { select: { code: true } } } } } } } });
  if (!target) throw new BusinessError("Selected investigator is invalid.");
  if (!target.role.permissions.some((p) => p.permission.code === "complaints:update" || p.permission.code === "cases:update")) throw new BusinessError("The selected user cannot handle complaints or cases.");
  const c = await getComplaint(actor, id);
  if (target.stationId && !inScope(actor, { stationId: target.stationId, regionId: target.regionId })) throw new BusinessError("The investigator must be inside your scope.", "STATE");
  if (target.stationId && target.stationId !== c.stationId && actor.scopeLevel !== "NATIONAL" && actor.scopeLevel !== "REGIONAL" && actor.scopeLevel !== "DEPARTMENTAL") {
    // a station actor may only assign to their own station's officers (incl. attached posts)
    if (!actor.stationIds?.includes(target.stationId)) throw new BusinessError("The investigator must belong to the station handling the complaint.", "STATE");
  }
  await transition(actor, id, "ASSIGNED", { assignedToId: target.id, reviewedById: actor.id, reviewedAt: new Date(), ...(reviewNotes ? { reviewNotes } : {}) }, "COMPLAINT_ASSIGNED", `assigned to ${target.username}`, ctx);
  await notify({ userId: target.id, kind: "ASSIGNMENT", title: "Complaint assigned to you", body: `${c.number} — ${c.title}`, href: `/complaints/${id}` });
}

export async function closeComplaint(actor: Actor, id: string, outcome: "CLOSED" | "REJECTED", reason: string, ctx: RequestContext) {
  const before = await transition(actor, id, outcome, { closureReason: reason, closedAt: new Date(), reviewedById: actor.id, reviewedAt: new Date() }, outcome === "CLOSED" ? "COMPLAINT_CLOSED" : "COMPLAINT_REJECTED", `${outcome.toLowerCase()} — ${reason}`, ctx);
  if (before.assignedTo) await notify({ userId: before.assignedTo.id, kind: "INFO", title: `Complaint ${outcome.toLowerCase()}`, body: `${before.number} — ${reason}`, href: `/complaints/${id}` });
}

/** Converts a reviewed/assigned complaint into a case; the complainant becomes a COMPLAINANT party. */
export async function convertToCase(actor: Actor, id: string, input: { title?: string; leadId?: string | null; isSensitive: boolean }, ctx: RequestContext) {
  const c = await getComplaint(actor, id);
  if (!TRANSITIONS[c.status].includes("CONVERTED")) throw new BusinessError(`A complaint in status ${c.status} cannot be converted (review it first).`, "STATE");
  const leadId = nul(input.leadId) ?? c.assignedTo?.id ?? null;
  if (leadId) {
    const lead = await prisma.user.findFirst({ where: { id: leadId, status: "ACTIVE", deletedAt: null }, select: { id: true, firstName: true, lastName: true } });
    if (!lead) throw new BusinessError("Selected lead investigator is invalid.");
  }
  const created = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("CASE", tx);
    const k = await tx.case.create({
      data: {
        number,
        title: nul(input.title) ?? c.title,
        category: c.category,
        description: c.description,
        occurredAt: c.incidentAt,
        reportedAt: c.receivedAt,
        locationText: c.locationText,
        regionId: c.regionId,
        stationId: c.stationId,
        priority: c.priority,
        status: leadId ? "ASSIGNED" : "OPEN",
        isSensitive: input.isSensitive,
        leadId,
        createdById: actor.id,
      },
    });
    if (c.complainant) await tx.caseParty.create({ data: { caseId: k.id, personId: c.complainant.id, role: "COMPLAINANT", addedById: actor.id } });
    if (leadId) await tx.caseAssignment.create({ data: { caseId: k.id, userId: leadId, role: "LEAD", assignedById: actor.id } });
    await addCaseEvent({ caseId: k.id, kind: "CONVERTED_FROM_COMPLAINT", title: `Case ${number} opened from complaint ${c.number}`, description: c.title, actorId: actor.id, entityType: "Complaint", entityId: c.id }, tx);
    if (leadId) await addCaseEvent({ caseId: k.id, kind: "ASSIGNED", title: "Lead investigator assigned at creation", actorId: actor.id }, tx);
    const r = await tx.complaint.updateMany({ where: { id, status: c.status }, data: { status: "CONVERTED", caseId: k.id, reviewedById: actor.id, reviewedAt: new Date() } });
    if (r.count !== 1) throw new BusinessError("The complaint was modified concurrently. Reload and retry.", "CONFLICT");
    await logAudit({ actor, action: "COMPLAINT_CONVERTED", module: "complaints", entityType: "Complaint", entityId: id, entityLabel: c.number, summary: `${c.number} converted to case ${number}`, before: { status: c.status }, after: { status: "CONVERTED", caseId: k.id, caseNumber: number }, context: ctx }, tx);
    await logAudit({ actor, action: "CASE_CREATED", module: "cases", entityType: "Case", entityId: k.id, entityLabel: number, summary: `Case ${number} created from complaint ${c.number} — ${k.title}`, after: { ...k, description: undefined }, context: ctx }, tx);
    return k;
  });
  if (leadId) await notify({ userId: leadId, kind: "ASSIGNMENT", title: "New case assigned to you", body: `${created.number} — ${created.title}`, href: `/cases/${created.id}` });
  return created;
}

export function complaintScopeWhere(actor: Actor): Prisma.ComplaintWhereInput {
  return scopeWhere(actor) as Prisma.ComplaintWhereInput;
}

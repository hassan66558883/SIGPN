import "server-only";
import type { CaseDisposition, CaseRole, CaseStatus, PartyStatus, Prisma, TaskStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError, NotFoundError } from "@/server/errors";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import { notify, notifyPermission } from "@/server/notifications";
import { addCaseEvent } from "@/server/timeline";
import { getPerson } from "@/server/persons/service";
import type { z } from "zod";
import type { caseAssignSchema, caseSchema, noteSchema, partySchema, taskSchema } from "@/server/cases/schemas";

const nul = (v: string | undefined | null) => (v ? v : null);

/**
 * Case-level authorization = territorial scope AND (not sensitive OR cases:view_sensitive OR member of the case team).
 */
export function caseScopeWhere(actor: Actor): Prisma.CaseWhereInput {
  const territorial = scopeWhere(actor) as Prisma.CaseWhereInput;
  if (actor.permissions.has("cases:view_sensitive")) return territorial;
  return { AND: [territorial, { OR: [{ isSensitive: false }, { leadId: actor.id }, { supervisorId: actor.id }, { createdById: actor.id }, { assignments: { some: { userId: actor.id, endedAt: null } } }] }] };
}

export const caseSelect = {
  id: true,
  number: true,
  title: true,
  category: true,
  description: true,
  occurredAt: true,
  reportedAt: true,
  locationText: true,
  priority: true,
  status: true,
  isSensitive: true,
  disposition: true,
  dispositionNotes: true,
  closedAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  regionId: true,
  stationId: true,
  station: { select: { id: true, code: true, name: true, regionId: true } },
  department: { select: { id: true, name: true } },
  lead: { select: { id: true, username: true, firstName: true, lastName: true } },
  supervisor: { select: { id: true, username: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, username: true, firstName: true, lastName: true } },
  complaint: { select: { id: true, number: true } },
  assignments: { where: { endedAt: null }, include: { user: { select: { id: true, username: true, firstName: true, lastName: true, role: { select: { code: true } } } } }, orderBy: { assignedAt: "asc" as const } },
  parties: { include: { person: { select: { id: true, number: true, firstName: true, lastName: true, gender: true, dateOfBirth: true, phone: true } } }, orderBy: { addedAt: "asc" as const } },
  _count: { select: { events: true, notes: true, tasks: true, evidence: true, statements: true, interviews: true, warrants: true, arrests: true, documents: true } },
} satisfies Prisma.CaseSelect;

export async function getCase(actor: Actor, id: string) {
  const k = await prisma.case.findFirst({ where: { id, deletedAt: null, ...caseScopeWhere(actor) }, select: caseSelect });
  if (!k) throw new NotFoundError("Case");
  return k;
}

function isTeam(actor: Actor, k: { lead: { id: string } | null; supervisor: { id: string } | null; createdBy: { id: string }; assignments: { userId: string }[] }) {
  return k.lead?.id === actor.id || k.supervisor?.id === actor.id || k.createdBy.id === actor.id || k.assignments.some((a) => a.userId === actor.id);
}

/** Write access to a case: cases:update AND (team member, or cases:assign/close holder within scope). */
export async function getCaseForWrite(actor: Actor, id: string) {
  const k = await getCase(actor, id);
  if (["CLOSED", "ARCHIVED"].includes(k.status)) throw new BusinessError(`Case ${k.number} is ${k.status.toLowerCase()} and read-only.`, "STATE");
  if (!isTeam(actor, k) && !actor.permissions.has("cases:assign")) throw new BusinessError("Only the case team or a supervisor can modify this case.", "STATE");
  return k;
}

const TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  OPEN: ["ASSIGNED", "UNDER_INVESTIGATION", "CLOSED"],
  ASSIGNED: ["UNDER_INVESTIGATION", "PENDING_REVIEW", "CLOSED"],
  UNDER_INVESTIGATION: ["PENDING_REVIEW", "REFERRED", "CLOSED"],
  PENDING_REVIEW: ["UNDER_INVESTIGATION", "REFERRED", "CLOSED"],
  REFERRED: ["CLOSED"],
  CLOSED: ["ARCHIVED"],
  ARCHIVED: [],
};

export async function createCase(actor: Actor, input: z.infer<typeof caseSchema>, ctx: RequestContext) {
  const stationId = nul(input.stationId) ?? actor.stationId;
  if (!stationId) throw new BusinessError("Select the station in charge of the case.");
  const st = await prisma.station.findUnique({ where: { id: stationId }, select: { id: true, regionId: true, isActive: true, name: true } });
  if (!st || !st.isActive) throw new BusinessError("Selected station is invalid or inactive.");
  if (!inScope(actor, { stationId: st.id, regionId: st.regionId })) throw new BusinessError("You can only open cases for a station inside your scope.", "STATE");
  const departmentId = nul(input.departmentId);
  if (departmentId) {
    const d = await prisma.department.findUnique({ where: { id: departmentId }, select: { stationId: true } });
    if (!d || d.stationId !== st.id) throw new BusinessError("The department must belong to the selected station.");
  }
  const leadId = nul(input.leadId);
  if (leadId && !(await prisma.user.findFirst({ where: { id: leadId, status: "ACTIVE", deletedAt: null } }))) throw new BusinessError("Selected lead investigator is invalid.");
  if (input.isSensitive && !actor.permissions.has("cases:view_sensitive")) throw new BusinessError("Only users allowed to view sensitive cases can flag a case as sensitive.", "STATE");
  const k = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("CASE", tx);
    const created = await tx.case.create({
      data: { number, title: input.title, category: input.category, description: input.description, occurredAt: input.occurredAt, locationText: nul(input.locationText), regionId: st.regionId, stationId: st.id, departmentId, priority: input.priority, isSensitive: input.isSensitive, status: leadId ? "ASSIGNED" : "OPEN", leadId, createdById: actor.id },
    });
    if (leadId) await tx.caseAssignment.create({ data: { caseId: created.id, userId: leadId, role: "LEAD", assignedById: actor.id } });
    await addCaseEvent({ caseId: created.id, kind: "CASE_CREATED", title: `Case ${number} opened`, description: input.title, actorId: actor.id }, tx);
    if (leadId) await addCaseEvent({ caseId: created.id, kind: "ASSIGNED", title: "Lead investigator assigned at creation", actorId: actor.id }, tx);
    await logAudit({ actor, action: "CASE_CREATED", module: "cases", entityType: "Case", entityId: created.id, entityLabel: number, summary: `Case ${number} opened at ${st.name} — ${input.title}`, after: { ...created, description: undefined }, context: ctx }, tx);
    return created;
  });
  if (leadId) await notify({ userId: leadId, kind: "ASSIGNMENT", title: "New case assigned to you", body: `${k.number} — ${k.title}`, href: `/cases/${k.id}` });
  else await notifyPermission({ permission: "cases:assign", stationId: st.id, excludeUserId: actor.id, kind: "APPROVAL", title: "New case awaiting assignment", body: `${k.number} — ${k.title}`, href: `/cases/${k.id}` });
  return k;
}

export async function assignToCase(actor: Actor, input: z.infer<typeof caseAssignSchema>, ctx: RequestContext) {
  const k = await getCase(actor, input.caseId);
  if (["CLOSED", "ARCHIVED"].includes(k.status)) throw new BusinessError("Closed cases cannot be reassigned.", "STATE");
  const u = await prisma.user.findFirst({ where: { id: input.userId, status: "ACTIVE", deletedAt: null }, select: { id: true, username: true, firstName: true, lastName: true, stationId: true, regionId: true } });
  if (!u) throw new BusinessError("Selected user is invalid.");
  if (u.stationId && !inScope(actor, { stationId: u.stationId, regionId: u.regionId })) throw new BusinessError("The user must be inside your scope.", "STATE");
  const role = input.role as CaseRole;
  await prisma.$transaction(async (tx) => {
    if (role === "LEAD" || role === "SUPERVISOR") await tx.caseAssignment.updateMany({ where: { caseId: k.id, role, endedAt: null }, data: { endedAt: new Date() } });
    await tx.caseAssignment.updateMany({ where: { caseId: k.id, userId: u.id, endedAt: null }, data: { endedAt: new Date() } });
    await tx.caseAssignment.create({ data: { caseId: k.id, userId: u.id, role, assignedById: actor.id, notes: nul(input.notes) } });
    await tx.case.update({ where: { id: k.id }, data: { ...(role === "LEAD" ? { leadId: u.id, status: k.status === "OPEN" ? "ASSIGNED" : k.status } : {}), ...(role === "SUPERVISOR" ? { supervisorId: u.id } : {}) } });
    await addCaseEvent({ caseId: k.id, kind: "ASSIGNED", title: `${u.firstName} ${u.lastName} assigned as ${role.toLowerCase()}`, description: nul(input.notes), actorId: actor.id, entityType: "User", entityId: u.id }, tx);
    await logAudit({ actor, action: "CASE_ASSIGNED", module: "cases", entityType: "Case", entityId: k.id, entityLabel: k.number, summary: `${k.number}: ${u.username} assigned as ${role}`, after: { userId: u.id, role }, context: ctx }, tx);
  });
  await notify({ userId: u.id, kind: "ASSIGNMENT", title: `Assigned to case as ${role.toLowerCase()}`, body: `${k.number} — ${k.title}`, href: `/cases/${k.id}` });
}

export async function addParty(actor: Actor, input: z.infer<typeof partySchema>, ctx: RequestContext) {
  const k = await getCaseForWrite(actor, input.caseId);
  const p = await getPerson(actor, input.personId);
  if (p.mergedIntoId) throw new BusinessError("This person record was merged; use the surviving record.", "STATE");
  const exists = await prisma.caseParty.findUnique({ where: { caseId_personId_role: { caseId: k.id, personId: p.id, role: input.role } } });
  if (exists) throw new BusinessError("This person already has this role in the case.", "CONFLICT");
  // Presumption of innocence: suspects/POI start UNDER_INVESTIGATION, never CHARGED automatically.
  const status: PartyStatus = input.role === "SUSPECT" || input.role === "PERSON_OF_INTEREST" || input.role === "ACCUSED" ? "UNDER_INVESTIGATION" : "ACTIVE";
  await prisma.$transaction(async (tx) => {
    await tx.caseParty.create({ data: { caseId: k.id, personId: p.id, role: input.role, status, notes: nul(input.notes), injuries: nul(input.injuries), addedById: actor.id } });
    if (k.status === "ASSIGNED") await tx.case.update({ where: { id: k.id }, data: { status: "UNDER_INVESTIGATION" } });
    await addCaseEvent({ caseId: k.id, kind: "PARTY_ADDED", title: `${input.role.replace(/_/g, " ").toLowerCase()} added: ${p.firstName} ${p.lastName}`, description: nul(input.notes), actorId: actor.id, entityType: "Person", entityId: p.id }, tx);
    await logAudit({ actor, action: "CASE_PARTY_ADDED", module: "cases", entityType: "Case", entityId: k.id, entityLabel: k.number, summary: `${k.number}: ${p.number} added as ${input.role}`, after: { personId: p.id, role: input.role, status }, context: ctx }, tx);
  });
}

export async function setPartyStatus(actor: Actor, partyId: string, status: PartyStatus, notes: string | undefined, ctx: RequestContext) {
  const party = await prisma.caseParty.findUnique({ where: { id: partyId }, include: { person: { select: { number: true, firstName: true, lastName: true } } } });
  if (!party) throw new NotFoundError("Party");
  const k = await getCaseForWrite(actor, party.caseId);
  if ((status === "CHARGED" || status === "REFERRED") && !actor.permissions.has("cases:close")) throw new BusinessError("Only a supervisor can mark a person as charged or referred.", "STATE");
  await prisma.$transaction(async (tx) => {
    await tx.caseParty.update({ where: { id: partyId }, data: { status, ...(notes ? { notes } : {}) } });
    await addCaseEvent({ caseId: k.id, kind: "PARTY_UPDATED", title: `${party.person.firstName} ${party.person.lastName}: ${party.status} → ${status}`, description: nul(notes), actorId: actor.id, entityType: "Person", entityId: party.personId }, tx);
    await logAudit({ actor, action: "CASE_PARTY_STATUS", module: "cases", entityType: "Case", entityId: k.id, entityLabel: k.number, summary: `${k.number}: ${party.person.number} ${party.status} → ${status}`, before: { status: party.status }, after: { status, notes: nul(notes) }, context: ctx }, tx);
  });
}

export async function addNote(actor: Actor, input: z.infer<typeof noteSchema>, ctx: RequestContext) {
  const k = await getCaseForWrite(actor, input.caseId);
  await prisma.$transaction(async (tx) => {
    const n = await tx.caseNote.create({ data: { caseId: k.id, authorId: actor.id, content: input.content, isConfidential: input.isConfidential } });
    await addCaseEvent({ caseId: k.id, kind: "NOTE", title: input.isConfidential ? "Confidential note added" : "Note added", description: input.isConfidential ? null : input.content.slice(0, 300), actorId: actor.id, entityType: "CaseNote", entityId: n.id }, tx);
    await logAudit({ actor, action: "CASE_NOTE_ADDED", module: "cases", entityType: "Case", entityId: k.id, entityLabel: k.number, summary: `${k.number}: note added${input.isConfidential ? " (confidential)" : ""}`, context: ctx }, tx);
  });
}

export async function createTask(actor: Actor, input: z.infer<typeof taskSchema>, ctx: RequestContext) {
  const k = await getCaseForWrite(actor, input.caseId);
  const assignedToId = nul(input.assignedToId);
  if (assignedToId && !(await prisma.user.findFirst({ where: { id: assignedToId, status: "ACTIVE", deletedAt: null } }))) throw new BusinessError("Selected assignee is invalid.");
  const t = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({ data: { caseId: k.id, title: input.title, description: nul(input.description), priority: input.priority, assignedToId, createdById: actor.id, dueAt: input.dueAt } });
    await addCaseEvent({ caseId: k.id, kind: "TASK", title: `Task created: ${input.title}`, actorId: actor.id, entityType: "Task", entityId: created.id }, tx);
    await logAudit({ actor, action: "CASE_TASK_CREATED", module: "cases", entityType: "Task", entityId: created.id, entityLabel: `${k.number} · ${input.title}`, summary: `${k.number}: task "${input.title}" created`, after: created, context: ctx }, tx);
    return created;
  });
  if (assignedToId && assignedToId !== actor.id) await notify({ userId: assignedToId, kind: "ASSIGNMENT", title: "Task assigned to you", body: `${k.number} — ${input.title}`, href: `/cases/${k.id}?tab=tasks` });
  return t;
}

export async function setTaskStatus(actor: Actor, taskId: string, status: TaskStatus, result: string | undefined, ctx: RequestContext) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new NotFoundError("Task");
  const k = await getCaseForWrite(actor, task.caseId);
  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id: taskId }, data: { status, result: nul(result) ?? task.result, completedAt: status === "DONE" ? new Date() : null } });
    await addCaseEvent({ caseId: k.id, kind: "TASK", title: `Task "${task.title}": ${task.status} → ${status}`, description: nul(result), actorId: actor.id, entityType: "Task", entityId: taskId }, tx);
    await logAudit({ actor, action: "CASE_TASK_UPDATED", module: "cases", entityType: "Task", entityId: taskId, entityLabel: `${k.number} · ${task.title}`, summary: `${k.number}: task "${task.title}" ${task.status} → ${status}`, before: { status: task.status }, after: { status, result: nul(result) }, context: ctx }, tx);
  });
}

export async function changeCaseStatus(actor: Actor, caseId: string, status: CaseStatus, disposition: CaseDisposition | null, notes: string | undefined, ctx: RequestContext) {
  const k = await getCase(actor, caseId);
  if (!TRANSITIONS[k.status].includes(status)) throw new BusinessError(`Cannot move a case from ${k.status} to ${status}.`, "STATE");
  if (status === "CLOSED" || status === "REFERRED") {
    if (!actor.permissions.has("cases:close")) throw new BusinessError("Only a supervisor can close or refer a case.", "STATE");
    if (status === "CLOSED" && !disposition) throw new BusinessError("A disposition is required to close a case.");
  }
  if (status === "ARCHIVED" && !actor.permissions.has("cases:archive")) throw new BusinessError("You are not allowed to archive cases.", "STATE");
  if ((status === "UNDER_INVESTIGATION" || status === "PENDING_REVIEW") && !isTeam(actor, k) && !actor.permissions.has("cases:assign")) throw new BusinessError("Only the case team can change the investigation status.", "STATE");
  await prisma.$transaction(async (tx) => {
    const r = await tx.case.updateMany({ where: { id: caseId, status: k.status }, data: { status, ...(status === "CLOSED" ? { disposition, dispositionNotes: nul(notes), closedAt: new Date() } : {}), ...(status === "ARCHIVED" ? { archivedAt: new Date() } : {}) } });
    if (r.count !== 1) throw new BusinessError("The case was modified concurrently. Reload and retry.", "CONFLICT");
    await addCaseEvent({ caseId, kind: status === "CLOSED" ? "DISPOSITION" : "STATUS", title: `${k.status} → ${status}${disposition ? ` (${disposition})` : ""}`, description: nul(notes), actorId: actor.id }, tx);
    await logAudit({ actor, action: status === "CLOSED" ? "CASE_CLOSED" : status === "ARCHIVED" ? "CASE_ARCHIVED" : "CASE_STATUS_CHANGED", module: "cases", entityType: "Case", entityId: caseId, entityLabel: k.number, summary: `${k.number}: ${k.status} → ${status}${disposition ? ` (${disposition})` : ""}`, before: { status: k.status }, after: { status, disposition, notes: nul(notes) }, context: ctx }, tx);
  });
  if (status === "PENDING_REVIEW") await notifyPermission({ permission: "cases:close", stationId: k.stationId, excludeUserId: actor.id, kind: "APPROVAL", title: "Case awaiting supervisor review", body: `${k.number} — ${k.title}`, href: `/cases/${caseId}` });
  if (k.lead && k.lead.id !== actor.id) await notify({ userId: k.lead.id, kind: "INFO", title: `Case ${status.toLowerCase().replace(/_/g, " ")}`, body: `${k.number} — ${k.title}`, href: `/cases/${caseId}` });
}

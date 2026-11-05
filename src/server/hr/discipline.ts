import "server-only";
import { z } from "zod";
import type { DisciplineStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError, NotFoundError } from "@/server/errors";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import type { Permission } from "@/server/rbac/permissions";
import type { RequestContext } from "@/server/request-context";
import { getOfficer } from "@/server/org/service";
import { nextNumber } from "@/server/sequences";
import { dateInput, optionalDate, optionalText } from "@/server/action-utils";

const DAY = 86_400_000;
const nul = (v: string | undefined | null) => (v ? v : null);
const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const SYSTEM_CTX: RequestContext = { ip: "scheduler", userAgent: "sigpn-t/hr-discipline" };

export const DISCIPLINE_STATUSES = ["OPEN", "IN_PROCEDURE", "DECIDED", "CLOSED"] as const;
export const SANCTIONS = ["NO_ACTION", "WARNING", "REPRIMAND", "SUSPENSION", "DISMISSAL"] as const;
export const STEP_KINDS = ["NOTIFICATION", "HEARING", "REPORT", "NOTE"] as const;
export const DISTINCTION_KINDS = ["COMMENDATION", "CITATION", "MEDAL", "REWARD"] as const;

export const openCaseSchema = z.object({ officerId: z.string().min(1), facts: z.string().trim().min(10, "describe the facts").max(4000), factsDate: dateInput });
export const stepSchema = z.object({ caseId: z.string().min(1), kind: z.enum(STEP_KINDS), date: dateInput, note: z.string().trim().min(3).max(2000) });
export const decisionSchema = z.object({
  caseId: z.string().min(1),
  sanction: z.enum(SANCTIONS),
  reason: z.string().trim().min(10, "the decision must be reasoned").max(2000),
  startDate: optionalDate,
  endDate: optionalDate,
});
export const distinctionSchema = z.object({ officerId: z.string().min(1), kind: z.enum(DISTINCTION_KINDS), title: z.string().trim().min(3).max(200), awardedAt: dateInput, reason: optionalText(500), reference: optionalText(60) });
export type OpenCaseInput = z.infer<typeof openCaseSchema>;
export type StepInput = z.infer<typeof stepSchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;
export type DistinctionInput = z.infer<typeof distinctionSchema>;

function need(actor: Actor, permission: Permission) {
  if (!actor.permissions.has(permission)) throw new AuthError("forbidden", `Permission ${permission} required`);
}

const include = {
  officer: { select: { id: true, badgeNumber: true, firstName: true, lastName: true, userId: true, rank: { select: { name: true } }, station: { select: { id: true, name: true, regionId: true } } } },
  openedBy: { select: { username: true } },
  decidedBy: { select: { username: true } },
  steps: { orderBy: [{ date: "asc" as const }, { createdAt: "asc" as const }] },
} satisfies Prisma.DisciplinaryCaseInclude;

async function loadCase(actor: Actor, id: string) {
  const c = await prisma.disciplinaryCase.findUnique({ where: { id }, include });
  if (!c || !inScope(actor, { stationId: c.officer.station.id, regionId: c.officer.station.regionId })) throw new NotFoundError("Disciplinary case");
  return c;
}
export type CaseView = Awaited<ReturnType<typeof loadCase>>;

/** Reading a disciplinary file is itself an audited event. */
export async function getCase(actor: Actor, id: string, ctx?: RequestContext) {
  need(actor, "hr:discipline_view");
  const c = await loadCase(actor, id);
  await logAudit({ actor, action: "HR_DISCIPLINE_VIEWED", module: "hr", entityType: "DisciplinaryCase", entityId: c.id, entityLabel: c.number, summary: `Disciplinary file ${c.number} (${c.officer.badgeNumber}) viewed`, context: ctx });
  return c;
}

export type CaseFilter = { status?: DisciplineStatus; officerId?: string; q?: string; page?: number; pageSize?: number };

export async function listCases(actor: Actor, f: CaseFilter = {}, ctx?: RequestContext) {
  need(actor, "hr:discipline_view");
  const page = Math.max(f.page ?? 1, 1);
  const pageSize = Math.min(f.pageSize ?? 25, 100);
  const where: Prisma.DisciplinaryCaseWhereInput = {
    AND: [
      { officer: scopeWhere(actor, { via: "station" }) as Prisma.OfficerWhereInput },
      f.status ? { status: f.status } : {},
      f.officerId ? { officerId: f.officerId } : {},
      f.q ? { OR: [{ number: { contains: f.q, mode: "insensitive" } }, { officer: { OR: [{ badgeNumber: { contains: f.q, mode: "insensitive" } }, { lastName: { contains: f.q, mode: "insensitive" } }] } }] } : {},
    ],
  };
  const [items, total] = await Promise.all([prisma.disciplinaryCase.findMany({ where, include: { officer: include.officer, openedBy: include.openedBy, decidedBy: include.decidedBy }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), prisma.disciplinaryCase.count({ where })]);
  await logAudit({ actor, action: "HR_DISCIPLINE_LISTED", module: "hr", summary: `Disciplinary files listed (${items.length} of ${total})`, context: ctx });
  return { items, total, page, pageSize };
}

export async function openCase(actor: Actor, input: OpenCaseInput, ctx: RequestContext) {
  need(actor, "hr:discipline_manage");
  const o = await getOfficer(actor, input.officerId);
  const factsDate = utcDay(input.factsDate);
  if (factsDate.getTime() > utcDay(new Date()).getTime()) throw new BusinessError("The facts cannot be dated in the future.", "VALIDATION", { factsDate: "in the future" });
  const stationId = (await prisma.officer.findUniqueOrThrow({ where: { id: o.id }, select: { stationId: true } })).stationId;
  return prisma.$transaction(async (tx) => {
    const number = await nextNumber("DISCIPLINE", tx);
    const c = await tx.disciplinaryCase.create({ data: { number, officerId: o.id, stationId, facts: input.facts, factsDate, openedById: actor.id } });
    await logAudit({ actor, action: "HR_DISCIPLINE_OPENED", module: "hr", entityType: "DisciplinaryCase", entityId: c.id, entityLabel: number, summary: `Disciplinary file ${number} opened for ${o.badgeNumber}`, context: ctx }, tx);
    return c;
  });
}

export async function addStep(actor: Actor, input: StepInput, ctx: RequestContext) {
  need(actor, "hr:discipline_manage");
  const c = await loadCase(actor, input.caseId);
  if (c.status !== "OPEN" && c.status !== "IN_PROCEDURE") throw new BusinessError("This file is closed: no further step can be recorded.", "STATE");
  const date = utcDay(input.date);
  if (date.getTime() > utcDay(new Date()).getTime()) throw new BusinessError("A step cannot be dated in the future.", "VALIDATION", { date: "in the future" });
  if (date < c.factsDate) throw new BusinessError("A step cannot precede the date of the facts.", "VALIDATION", { date: "before the facts" });
  await prisma.$transaction(async (tx) => {
    await tx.disciplinaryStep.create({ data: { caseId: c.id, kind: input.kind, date, note: input.note, recordedById: actor.id } });
    if (c.status === "OPEN") await tx.disciplinaryCase.update({ where: { id: c.id }, data: { status: "IN_PROCEDURE" } });
    await logAudit({ actor, action: "HR_DISCIPLINE_STEP", module: "hr", entityType: "DisciplinaryCase", entityId: c.id, entityLabel: c.number, summary: `Step ${input.kind} recorded on ${c.number}`, context: ctx }, tx);
  });
}

/**
 * Decision by the competent authority (scope covering the officer, different from whoever opened the file).
 * Any sanction needs a recorded hearing (rights of the defence). Effects on the officer are applied here or, for a
 * suspension that has not started, by `applyDueDiscipline`.
 */
export async function decideCase(actor: Actor, input: DecisionInput, ctx: RequestContext) {
  need(actor, "hr:discipline_decide");
  const c = await loadCase(actor, input.caseId);
  if (c.status !== "IN_PROCEDURE") throw new BusinessError("Only a file in procedure can be decided.", "STATE");
  if (c.openedById === actor.id) throw new BusinessError("The deciding authority must be different from the person who opened the file.", "STATE");
  if (input.sanction !== "NO_ACTION" && !c.steps.some((s) => s.kind === "HEARING")) throw new BusinessError("A sanction requires a recorded hearing of the officer (rights of the defence).", "STATE");
  let start: Date | null = null;
  let end: Date | null = null;
  if (input.sanction === "SUSPENSION") {
    if (!input.startDate || !input.endDate) throw new BusinessError("A suspension needs a start and an end date.", "VALIDATION", { endDate: "required" });
    start = utcDay(input.startDate);
    end = utcDay(input.endDate);
    if (end < start) throw new BusinessError("The end date cannot precede the start date.", "VALIDATION", { endDate: "before the start" });
    if ((end.getTime() - start.getTime()) / DAY > 365) throw new BusinessError("A suspension cannot exceed one year.", "VALIDATION", { endDate: "too long" });
    if (start.getTime() < utcDay(new Date()).getTime() - 30 * DAY) throw new BusinessError("The suspension cannot start more than 30 days in the past.", "VALIDATION", { startDate: "too old" });
  }
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const decisionNumber = input.sanction === "NO_ACTION" ? null : await nextNumber("DISCIPLINE_DECISION", tx);
    const closeNow = input.sanction !== "SUSPENSION";
    const u = await tx.disciplinaryCase.updateMany({
      where: { id: c.id, status: "IN_PROCEDURE" },
      data: { status: closeNow ? "CLOSED" : "DECIDED", sanction: input.sanction, sanctionStart: start, sanctionEnd: end, decisionNumber, decisionReason: input.reason, decidedById: actor.id, decidedAt: now, closedAt: closeNow ? now : null },
    });
    if (u.count !== 1) throw new BusinessError("The record was modified concurrently. Reload and retry.", "CONFLICT");
    if (input.sanction === "DISMISSAL") await dismissOfficer(tx, c.officerId, decisionNumber!, input.reason, actor.id);
    await logAudit({ actor, action: "HR_DISCIPLINE_DECIDED", module: "hr", entityType: "DisciplinaryCase", entityId: c.id, entityLabel: c.number, summary: `Disciplinary file ${c.number} decided: ${input.sanction}${decisionNumber ? ` (${decisionNumber})` : ""}`, after: { sanction: input.sanction, start, end }, context: ctx }, tx);
  });
  await applyDueDiscipline(actor, ctx); // a suspension that starts today takes effect now
  return loadCase(actor, c.id);
}

/** Révocation: the officer leaves the service (same effects as a cessation) and the account is disabled. */
async function dismissOfficer(tx: Prisma.TransactionClient, officerId: string, decisionNumber: string, reason: string, actorId: string) {
  const o = await tx.officer.findUniqueOrThrow({ where: { id: officerId }, select: { administrativeStatus: true, userId: true } });
  await tx.officer.update({ where: { id: officerId }, data: { administrativeStatus: "CEASED", dutyStatus: "OFF_DUTY", isActive: false } });
  await tx.officerAssignment.updateMany({ where: { officerId, endDate: null }, data: { endDate: new Date(), reason: "Dismissal" } });
  await tx.station.updateMany({ where: { commanderId: officerId }, data: { commanderId: null } });
  await tx.department.updateMany({ where: { headId: officerId }, data: { headId: null } });
  if (o.userId) await tx.user.updateMany({ where: { id: o.userId, status: "ACTIVE" }, data: { status: "DISABLED" } });
  await tx.careerEvent.create({ data: { officerId, type: "CESSATION", effectiveDate: new Date(), reference: decisionNumber, reason: `Disciplinary dismissal: ${reason}`.slice(0, 500), fromStatus: o.administrativeStatus, toStatus: "CEASED", recordedById: actorId } });
}

/**
 * Starts suspensions whose date has come and ends the ones that are over (reinstatement). Idempotent;
 * run after each decision and by the scheduler. Works without an actor (system).
 */
export async function applyDueDiscipline(actor: Actor | null = null, ctx: RequestContext = SYSTEM_CTX) {
  const today = utcDay(new Date());
  let started = 0;
  let ended = 0;
  const toStart = await prisma.disciplinaryCase.findMany({ where: { status: "DECIDED", sanction: "SUSPENSION", sanctionActive: false, sanctionStart: { lte: today }, sanctionEnd: { gte: today } }, select: { id: true, number: true, officerId: true, decisionNumber: true, sanctionStart: true } });
  for (const c of toStart) {
    await prisma.$transaction(async (tx) => {
      const o = await tx.officer.findUniqueOrThrow({ where: { id: c.officerId }, select: { administrativeStatus: true, isActive: true } });
      if (o.isActive && o.administrativeStatus === "ACTIVE") {
        await tx.officer.update({ where: { id: c.officerId }, data: { administrativeStatus: "SUSPENDED", dutyStatus: "SUSPENDED" } });
        await tx.careerEvent.create({ data: { officerId: c.officerId, type: "SUSPENSION", effectiveDate: c.sanctionStart!, reference: c.decisionNumber!, reason: "Disciplinary suspension", fromStatus: "ACTIVE", toStatus: "SUSPENDED", recordedById: actor?.id ?? null } });
      }
      await tx.disciplinaryCase.update({ where: { id: c.id }, data: { sanctionActive: true } });
      await logAudit({ actor, action: "HR_SUSPENSION_STARTED", module: "hr", entityType: "DisciplinaryCase", entityId: c.id, entityLabel: c.number, summary: `Suspension of ${c.number} started`, context: ctx }, tx);
    });
    started++;
  }
  const toEnd = await prisma.disciplinaryCase.findMany({ where: { status: "DECIDED", sanction: "SUSPENSION", sanctionEnd: { lt: today } }, select: { id: true, number: true, officerId: true, decisionNumber: true, sanctionActive: true, sanctionEnd: true } });
  for (const c of toEnd) {
    await prisma.$transaction(async (tx) => {
      const o = await tx.officer.findUniqueOrThrow({ where: { id: c.officerId }, select: { administrativeStatus: true } });
      if (c.sanctionActive && o.administrativeStatus === "SUSPENDED") {
        await tx.officer.update({ where: { id: c.officerId }, data: { administrativeStatus: "ACTIVE", dutyStatus: "ON_DUTY" } });
        await tx.careerEvent.create({ data: { officerId: c.officerId, type: "REINSTATEMENT", effectiveDate: new Date(c.sanctionEnd!.getTime() + DAY), reference: c.decisionNumber!, reason: "End of the disciplinary suspension", fromStatus: "SUSPENDED", toStatus: "ACTIVE", recordedById: actor?.id ?? null } });
      }
      await tx.disciplinaryCase.update({ where: { id: c.id }, data: { status: "CLOSED", sanctionActive: false, closedAt: new Date() } });
      await logAudit({ actor, action: "HR_SUSPENSION_ENDED", module: "hr", entityType: "DisciplinaryCase", entityId: c.id, entityLabel: c.number, summary: `Suspension of ${c.number} ended; officer reinstated`, context: ctx }, tx);
    });
    ended++;
  }
  return { started, ended };
}

/** Discipline summary for the dossier of one officer (needs hr:discipline_view; counts only, details stay in the file). */
export async function officerDisciplineSummary(actor: Actor, officerId: string) {
  need(actor, "hr:discipline_view");
  await getOfficer(actor, officerId);
  return prisma.disciplinaryCase.findMany({ where: { officerId }, select: { id: true, number: true, status: true, sanction: true, factsDate: true }, orderBy: { createdAt: "desc" }, take: 20 });
}

// ---------------- Distinctions ----------------

export async function listDistinctions(actor: Actor, officerId: string) {
  need(actor, "hr:view");
  await getOfficer(actor, officerId);
  return prisma.distinction.findMany({ where: { officerId }, orderBy: { awardedAt: "desc" } });
}

export async function addDistinction(actor: Actor, input: DistinctionInput, ctx: RequestContext) {
  need(actor, "hr:manage");
  const o = await getOfficer(actor, input.officerId);
  const awardedAt = utcDay(input.awardedAt);
  if (awardedAt.getTime() > utcDay(new Date()).getTime()) throw new BusinessError("The distinction cannot be dated in the future.", "VALIDATION", { awardedAt: "in the future" });
  return prisma.$transaction(async (tx) => {
    const d = await tx.distinction.create({ data: { officerId: o.id, kind: input.kind, title: input.title, awardedAt, reason: nul(input.reason), reference: nul(input.reference), recordedById: actor.id } });
    await logAudit({ actor, action: "HR_DISTINCTION_RECORDED", module: "hr", entityType: "Officer", entityId: o.id, entityLabel: o.badgeNumber, summary: `Distinction "${input.title}" recorded for ${o.badgeNumber}`, after: d, context: ctx }, tx);
    return d;
  });
}

import "server-only";
import type { Prisma, TransferStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError, NotFoundError } from "@/server/errors";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import type { Permission } from "@/server/rbac/permissions";
import type { RequestContext } from "@/server/request-context";
import { getOfficer } from "@/server/org/service";
import { nextNumber } from "@/server/sequences";
import { getRotationSettings } from "@/server/hr/rotation-settings";
import { notify, notifyPermission } from "@/server/notifications";
import type { ProposeTransferInput, TransferDecisionInput } from "@/server/hr/transfer-schemas";

const nul = (v: string | undefined | null) => (v ? v : null);
const OPEN: TransferStatus[] = ["PROPOSED", "HR_APPROVED", "APPROVED"];
const DAY = 86_400_000;

function need(actor: Actor, permission: Permission) {
  if (!actor.permissions.has(permission)) throw new AuthError("forbidden", `Permission ${permission} required`);
}

const include = {
  officer: { select: { id: true, badgeNumber: true, firstName: true, lastName: true, userId: true, rank: { select: { name: true } }, position: { select: { name: true } } } },
  fromStation: { select: { id: true, code: true, name: true, regionId: true, region: { select: { name: true } } } },
  toStation: { select: { id: true, code: true, name: true, regionId: true, region: { select: { name: true } } } },
  proposedBy: { select: { id: true, username: true, firstName: true, lastName: true } },
  reviewedBy: { select: { id: true, username: true, firstName: true, lastName: true } },
  validatedBy: { select: { id: true, username: true, firstName: true, lastName: true } },
} satisfies Prisma.TransferRequestInclude;

/** Transfers whose origin OR destination structure is inside the actor's scope. */
function scopeFilter(actor: Actor): Prisma.TransferRequestWhereInput {
  if (actor.scopeLevel === "NATIONAL") return {};
  const sw = scopeWhere(actor, { stationId: "id", regionId: "regionId" }) as Prisma.StationWhereInput;
  return { OR: [{ fromStation: sw }, { toStation: sw }] };
}

const touches = (actor: Actor, t: { fromStation: { id: string; regionId: string }; toStation: { id: string; regionId: string } }) =>
  inScope(actor, { stationId: t.fromStation.id, regionId: t.fromStation.regionId }) || inScope(actor, { stationId: t.toStation.id, regionId: t.toStation.regionId });

// ---------------- Reads ----------------

export type TransferFilter = { status?: TransferStatus; q?: string; officerId?: string; page?: number; pageSize?: number };

export async function listTransfers(actor: Actor, f: TransferFilter = {}) {
  const page = Math.max(f.page ?? 1, 1);
  const pageSize = Math.min(f.pageSize ?? 25, 100);
  const where: Prisma.TransferRequestWhereInput = {
    AND: [
      scopeFilter(actor),
      f.status ? { status: f.status } : {},
      f.officerId ? { officerId: f.officerId } : {},
      f.q ? { OR: [{ number: { contains: f.q, mode: "insensitive" } }, { decisionNumber: { contains: f.q, mode: "insensitive" } }, { officer: { OR: [{ badgeNumber: { contains: f.q, mode: "insensitive" } }, { lastName: { contains: f.q, mode: "insensitive" } }, { firstName: { contains: f.q, mode: "insensitive" } }] } }] } : {},
    ],
  };
  const [items, total] = await Promise.all([prisma.transferRequest.findMany({ where, include, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), prisma.transferRequest.count({ where })]);
  return { items, total, page, pageSize };
}

export async function countTransfersByStatus(actor: Actor) {
  const g = await prisma.transferRequest.groupBy({ by: ["status"], where: scopeFilter(actor), _count: { _all: true } });
  return Object.fromEntries(g.map((x) => [x.status, x._count._all])) as Partial<Record<TransferStatus, number>>;
}

export async function getTransfer(actor: Actor, id: string) {
  const t = await prisma.transferRequest.findUnique({ where: { id }, include });
  if (!t || !touches(actor, t)) throw new NotFoundError("Transfer");
  const [fromDepartment, toDepartment, toPosition] = await Promise.all([
    t.fromDepartmentId ? prisma.department.findUnique({ where: { id: t.fromDepartmentId }, select: { name: true } }) : null,
    t.toDepartmentId ? prisma.department.findUnique({ where: { id: t.toDepartmentId }, select: { name: true } }) : null,
    t.toPositionId ? prisma.position.findUnique({ where: { id: t.toPositionId }, select: { name: true } }) : null,
  ]);
  return { ...t, fromDepartment, toDepartment, toPosition };
}
export type TransferView = Awaited<ReturnType<typeof getTransfer>>;

// ---------------- Circuit ----------------

/** Step 1-3: detection/identification is manual here (automatic origin comes with phase 5); the proposal is recorded. */
export async function proposeTransfer(actor: Actor, input: ProposeTransferInput, ctx: RequestContext, origin: "MANUAL" | "AUTOMATIC" = "MANUAL") {
  need(actor, "hr:transfer_propose");
  const o = await getOfficer(actor, input.officerId);
  const cur = await prisma.officer.findUniqueOrThrow({ where: { id: o.id }, select: { stationId: true, departmentId: true, isActive: true, administrativeStatus: true } });
  if (!cur.isActive || cur.administrativeStatus !== "ACTIVE") throw new BusinessError("Only an officer in active service can be transferred.", "STATE");
  if (o.commandsStation) throw new BusinessError("This officer commands a station; appoint another commander before transferring them.", "STATE");
  if (o.headsDepartment) throw new BusinessError("This officer heads a department; appoint another head before reassigning them.", "STATE");
  const to = await prisma.station.findUnique({ where: { id: input.toStationId }, select: { id: true, name: true, isActive: true, status: true } });
  if (!to || !to.isActive || to.status !== "ACTIVE") throw new BusinessError("The destination structure does not exist or is not active.", "VALIDATION", { toStationId: "invalid" });
  const toDepartmentId = nul(input.toDepartmentId);
  if (toDepartmentId) {
    const dep = await prisma.department.findUnique({ where: { id: toDepartmentId }, select: { stationId: true, isActive: true } });
    if (!dep || !dep.isActive || dep.stationId !== to.id) throw new BusinessError("The service must be an active service of the destination structure.", "VALIDATION", { toDepartmentId: "invalid" });
  }
  if (to.id === cur.stationId && (toDepartmentId ?? null) === (cur.departmentId ?? null)) throw new BusinessError("The destination is the officer's current posting.", "VALIDATION", { toStationId: "same as current" });
  const toPositionId = nul(input.toPositionId);
  if (toPositionId) {
    const p = await prisma.position.findUnique({ where: { id: toPositionId }, select: { isActive: true } });
    if (!p || !p.isActive) throw new BusinessError("Selected position is invalid or inactive.", "VALIDATION", { toPositionId: "invalid" });
  }
  if (input.effectiveDate.getTime() < Date.now() - 30 * DAY) throw new BusinessError("The effective date cannot be more than 30 days in the past.", "VALIDATION", { effectiveDate: "too far in the past" });
  if (input.effectiveDate.getTime() > Date.now() + 366 * DAY) throw new BusinessError("The effective date is too far in the future.", "VALIDATION", { effectiveDate: "too far in the future" });
  if (await prisma.transferRequest.findFirst({ where: { officerId: o.id, status: { in: OPEN } }, select: { id: true } })) throw new BusinessError("A transfer is already in progress for this officer.", "CONFLICT");

  const t = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("TRANSFER", tx);
    const created = await tx.transferRequest.create({
      data: { number, officerId: o.id, fromStationId: cur.stationId, fromDepartmentId: cur.departmentId, toStationId: to.id, toDepartmentId, toPositionId, effectiveDate: input.effectiveDate, reason: input.reason, origin, proposedById: actor.id },
    });
    await logAudit({ actor, action: "TRANSFER_PROPOSED", module: "hr", entityType: "TransferRequest", entityId: created.id, entityLabel: number, summary: `Transfer ${number} proposed for ${o.badgeNumber} → ${to.name}`, after: created, context: ctx }, tx);
    return created;
  });
  await notifyPermission({ permission: "hr:transfer_review", kind: "APPROVAL", title: "Transfer to examine", body: `${t.number}: ${o.firstName} ${o.lastName} (${o.badgeNumber}) → ${to.name}.`, href: `/hr/transfers/${t.id}`, excludeUserId: actor.id });
  return t;
}

/** Step 4: HR examination. The HR reviewer cannot be the proposer. */
export async function reviewTransfer(actor: Actor, input: TransferDecisionInput, ctx: RequestContext) {
  need(actor, "hr:transfer_review");
  const t = await getTransfer(actor, input.id);
  if (t.status !== "PROPOSED") throw new BusinessError("This transfer is not awaiting HR examination.", "STATE");
  if (t.proposedById === actor.id) throw new BusinessError("You cannot examine a transfer you proposed.", "STATE");
  if (input.decision === "REJECT" && !(input.note && input.note.trim().length >= 5)) throw new BusinessError("A reason is required to reject.", "VALIDATION", { note: "required" });
  const status: TransferStatus = input.decision === "APPROVE" ? "HR_APPROVED" : "REJECTED";
  const r = await prisma.$transaction(async (tx) => {
    const u = await tx.transferRequest.updateMany({ where: { id: t.id, status: "PROPOSED" }, data: { status, reviewedById: actor.id, reviewedAt: new Date(), reviewNote: nul(input.note), ...(status === "REJECTED" ? { closeReason: nul(input.note) } : {}) } });
    if (u.count !== 1) throw new BusinessError("The record was modified concurrently. Reload and retry.", "CONFLICT");
    await logAudit({ actor, action: status === "HR_APPROVED" ? "TRANSFER_HR_APPROVED" : "TRANSFER_HR_REJECTED", module: "hr", entityType: "TransferRequest", entityId: t.id, entityLabel: t.number, summary: `Transfer ${t.number} ${status === "HR_APPROVED" ? "approved by HR and sent to the competent authority" : "rejected by HR"}`, before: { status: t.status }, after: { status, note: nul(input.note) }, context: ctx }, tx);
    return status;
  });
  if (r === "HR_APPROVED") await notifyValidators(t);
  else if (t.proposedById) await notify({ userId: t.proposedById, kind: "INFO", title: "Transfer rejected by HR", body: `${t.number}: ${input.note ?? ""}`, href: `/hr/transfers/${t.id}` });
  return getTransfer(actor, t.id);
}

/**
 * Step 5-8: validation by the competent authority = an actor whose scope covers BOTH structures, who is neither the
 * proposer nor the HR reviewer. Approval generates the decision number and, when the effective date has come,
 * executes the transfer (dossier, assignment history, career history, notifications) in the same transaction.
 */
export async function validateTransfer(actor: Actor, input: TransferDecisionInput, ctx: RequestContext) {
  need(actor, "hr:transfer_validate");
  const t = await getTransfer(actor, input.id);
  if (t.status !== "HR_APPROVED") throw new BusinessError("This transfer has not been approved by HR yet, or is already closed.", "STATE");
  if (t.proposedById === actor.id || t.reviewedById === actor.id) throw new BusinessError("The validating authority must be different from the proposer and the HR reviewer.", "STATE");
  const covers = (s: { id: string; regionId: string }) => inScope(actor, { stationId: s.id, regionId: s.regionId });
  if (!covers(t.fromStation) || !covers(t.toStation)) throw new BusinessError("The competent authority must cover both the origin and the destination structures.", "STATE");
  if (t.origin === "AUTOMATIC") {
    const cfg = await getRotationSettings();
    if (cfg.validatorRoleCodes.length > 0 && !cfg.validatorRoleCodes.includes(actor.roleCode)) throw new BusinessError("This automatic proposal must be validated by one of the authorities defined in the settings.", "STATE");
  }
  if (input.decision === "REJECT" && !(input.note && input.note.trim().length >= 5)) throw new BusinessError("A reason is required to reject.", "VALIDATION", { note: "required" });

  if (input.decision === "REJECT") {
    await prisma.$transaction(async (tx) => {
      const u = await tx.transferRequest.updateMany({ where: { id: t.id, status: "HR_APPROVED" }, data: { status: "REJECTED", validatedById: actor.id, validatedAt: new Date(), validationNote: nul(input.note), closeReason: nul(input.note) } });
      if (u.count !== 1) throw new BusinessError("The record was modified concurrently. Reload and retry.", "CONFLICT");
      await logAudit({ actor, action: "TRANSFER_REJECTED", module: "hr", entityType: "TransferRequest", entityId: t.id, entityLabel: t.number, summary: `Transfer ${t.number} rejected by the competent authority`, before: { status: t.status }, after: { status: "REJECTED", note: nul(input.note) }, context: ctx }, tx);
    });
    if (t.proposedById) await notify({ userId: t.proposedById, kind: "INFO", title: "Transfer rejected", body: `${t.number}: ${input.note ?? ""}`, href: `/hr/transfers/${t.id}` });
    return getTransfer(actor, t.id);
  }

  const due = t.effectiveDate.getTime() <= Date.now() + DAY;
  const notifications = await prisma.$transaction(async (tx) => {
    const decisionNumber = await nextNumber("TRANSFER_DECISION", tx);
    const u = await tx.transferRequest.updateMany({ where: { id: t.id, status: "HR_APPROVED" }, data: { status: "APPROVED", validatedById: actor.id, validatedAt: new Date(), validationNote: nul(input.note), decisionNumber } });
    if (u.count !== 1) throw new BusinessError("The record was modified concurrently. Reload and retry.", "CONFLICT");
    await logAudit({ actor, action: "TRANSFER_APPROVED", module: "hr", entityType: "TransferRequest", entityId: t.id, entityLabel: t.number, summary: `Transfer ${t.number} validated: decision ${decisionNumber}`, before: { status: t.status }, after: { status: "APPROVED", decisionNumber }, context: ctx }, tx);
    return due ? applyTransfer(tx, t.id, actor, ctx) : null;
  });
  if (notifications) await sendExecutionNotices(notifications);
  return getTransfer(actor, t.id);
}

/** Executes an APPROVED transfer whose effective date has come (HR, or the scheduler in phase 5). */
export async function executeTransfer(actor: Actor, id: string, ctx: RequestContext) {
  need(actor, "hr:transfer_review");
  const t = await getTransfer(actor, id);
  if (t.status !== "APPROVED") throw new BusinessError("Only a transfer validated by the competent authority can be executed.", "STATE");
  if (t.effectiveDate.getTime() > Date.now() + DAY) throw new BusinessError("The effective date of this transfer has not come yet.", "STATE");
  const notices = await prisma.$transaction((tx) => applyTransfer(tx, id, actor, ctx));
  await sendExecutionNotices(notices);
  return getTransfer(actor, id);
}

export async function cancelTransfer(actor: Actor, id: string, reason: string, ctx: RequestContext) {
  const t = await getTransfer(actor, id);
  if (!OPEN.includes(t.status)) throw new BusinessError("This transfer is already closed.", "STATE");
  if (t.proposedById !== actor.id && !actor.permissions.has("hr:transfer_review")) throw new AuthError("forbidden", "Only the proposer or HR can cancel a transfer");
  await prisma.$transaction(async (tx) => {
    const u = await tx.transferRequest.updateMany({ where: { id, status: { in: OPEN } }, data: { status: "CANCELLED", closeReason: reason } });
    if (u.count !== 1) throw new BusinessError("The record was modified concurrently. Reload and retry.", "CONFLICT");
    await logAudit({ actor, action: "TRANSFER_CANCELLED", module: "hr", entityType: "TransferRequest", entityId: id, entityLabel: t.number, summary: `Transfer ${t.number} cancelled`, before: { status: t.status }, after: { status: "CANCELLED", reason }, context: ctx }, tx);
  });
  return getTransfer(actor, id);
}

// ---------------- Execution ----------------

export type Notice = { transferId: string; number: string; decisionNumber: string; officerName: string; badgeNumber: string; officerUserId: string | null; proposedById: string | null; fromStationId: string; toStationId: string; fromName: string; toName: string };

/** Moves the officer. Re-checks every precondition against the CURRENT state: a stale approval cannot corrupt the dossier. */
export async function applyTransfer(tx: Prisma.TransactionClient, id: string, actor: Actor | null, ctx: RequestContext): Promise<Notice> {
  const t = await tx.transferRequest.findUniqueOrThrow({ where: { id }, include: { officer: { include: { commandsStation: { select: { id: true } }, headsDepartment: { select: { id: true } } } }, fromStation: { select: { name: true } }, toStation: { select: { id: true, name: true, regionId: true, adminDepartmentId: true, isActive: true, status: true } } } });
  const o = t.officer;
  if (t.status !== "APPROVED" || !t.decisionNumber) throw new BusinessError("Only a validated transfer can be executed.", "STATE");
  if (!o.isActive || o.administrativeStatus !== "ACTIVE") throw new BusinessError("The officer is no longer in active service; cancel this transfer.", "STATE");
  if (o.stationId !== t.fromStationId) throw new BusinessError("The officer has been moved since this proposal; cancel it and propose a new transfer.", "STATE");
  if (o.commandsStation) throw new BusinessError("This officer commands a station; appoint another commander before transferring them.", "STATE");
  if (o.headsDepartment) throw new BusinessError("This officer heads a department; appoint another head before reassigning them.", "STATE");
  if (!t.toStation.isActive || t.toStation.status !== "ACTIVE") throw new BusinessError("The destination structure is no longer active.", "STATE");
  const position = t.toPositionId ? await tx.position.findUnique({ where: { id: t.toPositionId }, select: { id: true, name: true, isActive: true } }) : null;
  if (t.toPositionId && (!position || !position.isActive)) throw new BusinessError("The planned position is no longer active.", "STATE");

  await tx.officerAssignment.updateMany({ where: { officerId: o.id, endDate: null }, data: { endDate: t.effectiveDate } });
  await tx.officerAssignment.create({
    data: { officerId: o.id, stationId: t.toStationId, departmentId: t.toDepartmentId, rankId: o.rankId, positionId: position?.id ?? o.positionId, position: position?.name ?? null, startDate: t.effectiveDate, reason: `Transfer ${t.number} — decision ${t.decisionNumber}`, createdById: actor?.id ?? null },
  });
  await tx.officer.update({ where: { id: o.id }, data: { stationId: t.toStationId, departmentId: t.toDepartmentId, currentPostSince: t.effectiveDate, ...(position ? { positionId: position.id } : {}) } });
  await tx.rotationAlert.deleteMany({ where: { officerId: o.id } }); // a new post tenure starts: rotation alerts of the previous one no longer apply
  if (o.userId) await tx.user.update({ where: { id: o.userId }, data: { stationId: t.toStationId, regionId: t.toStation.regionId, adminDepartmentId: t.toStation.adminDepartmentId } });
  await tx.careerEvent.create({
    data: { officerId: o.id, type: "TRANSFER", effectiveDate: t.effectiveDate, reference: t.decisionNumber, reason: t.reason, fromStationId: t.fromStationId, toStationId: t.toStationId, fromPositionId: position ? o.positionId : null, toPositionId: position?.id ?? null, recordedById: actor?.id ?? null },
  });
  const u = await tx.transferRequest.updateMany({ where: { id, status: "APPROVED" }, data: { status: "EXECUTED", executedAt: new Date() } });
  if (u.count !== 1) throw new BusinessError("The record was modified concurrently. Reload and retry.", "CONFLICT");
  await logAudit({ actor, action: "TRANSFER_EXECUTED", module: "hr", entityType: "TransferRequest", entityId: id, entityLabel: t.number, summary: `Transfer ${t.number} executed (${t.decisionNumber}): ${o.badgeNumber} ${t.fromStation.name} → ${t.toStation.name}`, before: { stationId: t.fromStationId, departmentId: t.fromDepartmentId }, after: { stationId: t.toStationId, departmentId: t.toDepartmentId, effectiveDate: t.effectiveDate }, context: ctx }, tx);
  return { transferId: id, number: t.number, decisionNumber: t.decisionNumber, officerName: `${o.firstName} ${o.lastName}`, badgeNumber: o.badgeNumber, officerUserId: o.userId, proposedById: t.proposedById, fromStationId: t.fromStationId, toStationId: t.toStationId, fromName: t.fromStation.name, toName: t.toStation.name };
}

/** Step 7: notify the officer, the proposer and the HR/command users of both structures. */
export async function sendExecutionNotices(n: Notice) {
  const href = `/hr/transfers/${n.transferId}`;
  const body = `${n.decisionNumber}: ${n.officerName} (${n.badgeNumber}), ${n.fromName} → ${n.toName}.`;
  if (n.officerUserId) await notify({ userId: n.officerUserId, kind: "ASSIGNMENT", title: "New posting", body, href });
  if (n.proposedById) await notify({ userId: n.proposedById, kind: "INFO", title: "Transfer executed", body, href });
  for (const stationId of [n.fromStationId, n.toStationId]) await notifyPermission({ permission: "hr:view", kind: "ASSIGNMENT", title: stationId === n.toStationId ? "Officer arriving" : "Officer leaving", body, href, stationId, excludeUserId: n.proposedById });
}

/** Step 5: tell the authorities able to validate (national, plus the region when both structures are in the same region). */
async function notifyValidators(t: TransferView) {
  const sameRegion = t.fromStation.regionId === t.toStation.regionId;
  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      id: { notIn: [t.proposedById, t.reviewedById].filter((x): x is string => !!x) },
      role: { isActive: true, permissions: { some: { permission: { code: "hr:transfer_validate" } } } },
      OR: [{ role: { scopeLevel: "NATIONAL" } }, ...(sameRegion ? [{ regionId: t.fromStation.regionId }] : [])],
    },
    select: { id: true },
  });
  if (!users.length) return;
  await prisma.notification.createMany({ data: users.map((u) => ({ userId: u.id, kind: "APPROVAL" as const, title: "Transfer awaiting validation", body: `${t.number}: ${t.officer.firstName} ${t.officer.lastName} (${t.officer.badgeNumber}) → ${t.toStation.name}.`, href: `/hr/transfers/${t.id}` })) });
}

import "server-only";
import type { AttendanceStatus, LeaveStatus, LeaveType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError, NotFoundError } from "@/server/errors";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import type { Permission } from "@/server/rbac/permissions";
import type { RequestContext } from "@/server/request-context";
import { getOfficer } from "@/server/org/service";
import { nextNumber } from "@/server/sequences";
import { notify, notifyPermission } from "@/server/notifications";
import { leaveSettingsSchema, type LeaveDecisionInput, type LeaveRequestInput, type LeaveSettings, type RollCallInput } from "@/server/hr/attendance-schemas";

const DAY = 86_400_000;
const nul = (v: string | undefined | null) => (v ? v : null);
export const LEAVE_SETTING_KEY = "hr.leave";
const MAX_BACKDATE_DAYS = 60;
const MAX_SHORT_DAYS = 3;

function need(actor: Actor, permission: Permission) {
  if (!actor.permissions.has(permission)) throw new AuthError("forbidden", `Permission ${permission} required`);
}
export const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const dayCount = (a: Date, b: Date) => Math.round((utcDay(b).getTime() - utcDay(a).getTime()) / DAY) + 1;
const ATT_OF_LEAVE: Record<LeaveType, AttendanceStatus> = { ANNUAL: "ON_LEAVE", EXCEPTIONAL: "ON_LEAVE", PERMISSION: "PERMISSION", ABSENCE_AUTHORIZATION: "PERMISSION", UNAVAILABILITY: "UNAVAILABLE" };
const OPEN_LEAVE: LeaveStatus[] = ["REQUESTED", "APPROVED"];

export async function getLeaveSettings(): Promise<LeaveSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: LEAVE_SETTING_KEY }, select: { value: true } });
  const p = leaveSettingsSchema.safeParse(row?.value ?? {});
  return p.success ? p.data : leaveSettingsSchema.parse({});
}

export async function updateLeaveSettings(actor: Actor, input: LeaveSettings, ctx: RequestContext) {
  need(actor, "system:settings");
  const before = await getLeaveSettings();
  const value = leaveSettingsSchema.parse(input);
  await prisma.$transaction(async (tx) => {
    await tx.systemSetting.upsert({ where: { key: LEAVE_SETTING_KEY }, update: { value, updatedById: actor.id }, create: { key: LEAVE_SETTING_KEY, value, description: "Droits à congé annuel (jours calendaires par an).", updatedById: actor.id } });
    await logAudit({ actor, action: "HR_LEAVE_SETTINGS_UPDATED", module: "hr", entityType: "SystemSetting", entityId: LEAVE_SETTING_KEY, summary: `Annual leave entitlement: ${before.annualDays} → ${value.annualDays} days`, before, after: value, context: ctx }, tx);
  });
  return value;
}

// ---------------- Daily roll-call ----------------

async function stationInScope(actor: Actor, stationId: string) {
  const st = await prisma.station.findUnique({ where: { id: stationId }, select: { id: true, name: true, regionId: true, isActive: true } });
  if (!st || !inScope(actor, { stationId: st.id, regionId: st.regionId })) throw new NotFoundError("Station");
  return st;
}

/** Officers of a structure for a given day with their record (if any). */
export async function getRollCall(actor: Actor, stationId: string, date: Date) {
  need(actor, "hr:view");
  const st = await stationInScope(actor, stationId);
  const day = utcDay(date);
  const officers = await prisma.officer.findMany({
    where: { stationId, isActive: true, deletedAt: null, administrativeStatus: "ACTIVE" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, badgeNumber: true, firstName: true, lastName: true, rank: { select: { name: true } }, attendance: { where: { date: day }, select: { status: true, lateMinutes: true, note: true, leaveId: true } } },
    take: 1000,
  });
  return { station: st, date: day, officers: officers.map((o) => ({ id: o.id, badgeNumber: o.badgeNumber, firstName: o.firstName, lastName: o.lastName, rank: o.rank.name, record: o.attendance[0] ?? null })) };
}

/**
 * Records the roll-call of one structure for one day. Days covered by an approved leave keep their generated status
 * (they are reported back as `locked`); an officer who is not posted at the structure is refused.
 */
export async function recordRollCall(actor: Actor, input: RollCallInput, ctx: RequestContext) {
  need(actor, "hr:attendance_record");
  const st = await stationInScope(actor, input.stationId);
  const day = utcDay(input.date);
  const today = utcDay(new Date());
  if (day.getTime() > today.getTime()) throw new BusinessError("The roll-call cannot be recorded for a future day.", "VALIDATION", { date: "in the future" });
  if (today.getTime() - day.getTime() > MAX_BACKDATE_DAYS * DAY) throw new BusinessError(`A roll-call cannot be recorded more than ${MAX_BACKDATE_DAYS} days late.`, "VALIDATION", { date: "too old" });
  const ids = [...new Set(input.entries.map((e) => e.officerId))];
  const officers = await prisma.officer.findMany({ where: { id: { in: ids }, stationId: input.stationId, isActive: true, deletedAt: null, administrativeStatus: "ACTIVE" }, select: { id: true } });
  if (officers.length !== ids.length) throw new BusinessError("Some officers are not active members of this structure.", "VALIDATION");
  for (const e of input.entries) {
    if (e.status === "LATE" && !e.lateMinutes) throw new BusinessError("Lateness needs a number of minutes.", "VALIDATION");
    if (e.status !== "LATE" && e.lateMinutes) throw new BusinessError("Minutes only apply to lateness.", "VALIDATION");
  }
  const locked = await prisma.attendanceRecord.findMany({ where: { officerId: { in: ids }, date: day, leaveId: { not: null } }, select: { officerId: true } });
  const lockedIds = new Set(locked.map((l) => l.officerId));
  const toWrite = input.entries.filter((e) => !lockedIds.has(e.officerId));
  await prisma.$transaction(async (tx) => {
    for (const e of toWrite) {
      await tx.attendanceRecord.upsert({
        where: { officerId_date: { officerId: e.officerId, date: day } },
        update: { status: e.status, lateMinutes: e.status === "LATE" ? e.lateMinutes : null, note: nul(e.note), stationId: st.id, recordedById: actor.id },
        create: { officerId: e.officerId, date: day, stationId: st.id, status: e.status, lateMinutes: e.status === "LATE" ? e.lateMinutes : null, note: nul(e.note), recordedById: actor.id },
      });
    }
    await logAudit({ actor, action: "HR_ATTENDANCE_RECORDED", module: "hr", entityType: "Station", entityId: st.id, entityLabel: st.name, summary: `Roll-call ${day.toISOString().slice(0, 10)} at ${st.name}: ${toWrite.length} recorded, ${lockedIds.size} locked by leave`, after: { date: day, count: toWrite.length }, context: ctx }, tx);
  });
  return { recorded: toWrite.length, locked: [...lockedIds] };
}

// ---------------- Leave ----------------

/** Days of annual leave already taken or booked (APPROVED + REQUESTED) for the year of `year`. */
export async function annualLeaveUsed(officerId: string, year: number, excludeId?: string) {
  const rows = await prisma.leaveRequest.findMany({ where: { officerId, type: "ANNUAL", status: { in: OPEN_LEAVE }, startDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) }, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { days: true } });
  return rows.reduce((n, r) => n + r.days, 0);
}

export async function leaveBalance(officerId: string, year = new Date().getUTCFullYear()) {
  const { annualDays } = await getLeaveSettings();
  const used = await annualLeaveUsed(officerId, year);
  return { year, entitlement: annualDays, used, remaining: annualDays - used };
}

const leaveInclude = { officer: { select: { id: true, badgeNumber: true, firstName: true, lastName: true, userId: true } }, station: { select: { id: true, name: true, regionId: true, parentId: true } }, requestedBy: { select: { username: true } }, decidedBy: { select: { username: true } } } satisfies Prisma.LeaveRequestInclude;

export async function requestLeave(actor: Actor, input: LeaveRequestInput, ctx: RequestContext) {
  const officerId = nul(input.officerId) ?? actor.officerId;
  if (!officerId) throw new BusinessError("Select the officer concerned.", "VALIDATION", { officerId: "required" });
  const own = officerId === actor.officerId;
  if (!own) need(actor, "hr:leave_request");
  const o = own ? await prisma.officer.findFirstOrThrow({ where: { id: officerId, deletedAt: null }, select: { id: true, badgeNumber: true, firstName: true, lastName: true, stationId: true, isActive: true, administrativeStatus: true, userId: true } }) : await getOfficer(actor, officerId);
  const cur = await prisma.officer.findUniqueOrThrow({ where: { id: o.id }, select: { stationId: true, isActive: true, administrativeStatus: true } });
  if (!cur.isActive || cur.administrativeStatus !== "ACTIVE") throw new BusinessError("Only an officer in active service can take leave.", "STATE");
  const start = utcDay(input.startDate);
  const end = utcDay(input.endDate);
  if (end < start) throw new BusinessError("The end date cannot precede the start date.", "VALIDATION", { endDate: "before the start" });
  const days = dayCount(start, end);
  const today = utcDay(new Date());
  if (start.getTime() < today.getTime() - MAX_BACKDATE_DAYS * DAY) throw new BusinessError("The leave cannot start more than 60 days in the past.", "VALIDATION", { startDate: "too old" });
  if (start.getTime() > today.getTime() + 366 * DAY) throw new BusinessError("The leave starts too far in the future.", "VALIDATION", { startDate: "too far" });
  if (days > 366) throw new BusinessError("A leave cannot exceed one year.", "VALIDATION", { endDate: "too long" });
  if ((input.type === "PERMISSION" || input.type === "ABSENCE_AUTHORIZATION") && days > MAX_SHORT_DAYS) throw new BusinessError(`A permission or absence authorisation cannot exceed ${MAX_SHORT_DAYS} days; request a leave instead.`, "VALIDATION", { endDate: "too long" });
  if (input.type !== "UNAVAILABILITY" && !input.reason && input.type !== "ANNUAL") throw new BusinessError("A reason is required for this request.", "VALIDATION", { reason: "required" });
  const overlap = await prisma.leaveRequest.findFirst({ where: { officerId: o.id, status: { in: OPEN_LEAVE }, startDate: { lte: end }, endDate: { gte: start } }, select: { number: true } });
  if (overlap) throw new BusinessError(`This period overlaps the request ${overlap.number}.`, "CONFLICT");
  if (input.type === "ANNUAL") {
    const { annualDays } = await getLeaveSettings();
    const used = await annualLeaveUsed(o.id, start.getUTCFullYear());
    if (used + days > annualDays) throw new BusinessError(`Insufficient annual leave balance: ${annualDays - used} day(s) left, ${days} requested.`, "VALIDATION", { endDate: "exceeds the balance" });
  }
  const lr = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("LEAVE", tx);
    const created = await tx.leaveRequest.create({ data: { number, officerId: o.id, stationId: cur.stationId, type: input.type, startDate: start, endDate: end, days, reason: nul(input.reason), requestedById: actor.id } });
    await logAudit({ actor, action: "HR_LEAVE_REQUESTED", module: "hr", entityType: "LeaveRequest", entityId: created.id, entityLabel: number, summary: `${input.type} request ${number} for ${o.badgeNumber}: ${days} day(s) from ${start.toISOString().slice(0, 10)}`, after: created, context: ctx }, tx);
    return created;
  });
  const st = await prisma.station.findUnique({ where: { id: cur.stationId }, select: { parentId: true } });
  for (const stationId of [cur.stationId, st?.parentId].filter((x): x is string => !!x)) {
    await notifyPermission({ permission: "hr:leave_approve", stationId, kind: "APPROVAL", title: "Leave request to decide", body: `${lr.number}: ${o.firstName} ${o.lastName} (${o.badgeNumber}), ${days} day(s).`, href: "/hr/leaves?status=REQUESTED", excludeUserId: actor.id });
  }
  return lr;
}

export async function decideLeave(actor: Actor, input: LeaveDecisionInput, ctx: RequestContext) {
  need(actor, "hr:leave_approve");
  const l = await prisma.leaveRequest.findUnique({ where: { id: input.id }, include: leaveInclude });
  if (!l || !inScope(actor, { stationId: l.station.id, regionId: l.station.regionId })) throw new NotFoundError("Leave request");
  if (l.status !== "REQUESTED") throw new BusinessError("This request has already been decided or closed.", "STATE");
  if (l.officerId === actor.officerId || l.requestedById === actor.id) throw new BusinessError("You cannot decide a request you filed or that concerns you.", "STATE");
  if (input.decision === "REJECT" && !(input.note && input.note.trim().length >= 3)) throw new BusinessError("A reason is required to reject.", "VALIDATION", { note: "required" });

  if (input.decision === "REJECT") {
    await prisma.$transaction(async (tx) => {
      const u = await tx.leaveRequest.updateMany({ where: { id: l.id, status: "REQUESTED" }, data: { status: "REJECTED", decidedById: actor.id, decidedAt: new Date(), decisionNote: nul(input.note) } });
      if (u.count !== 1) throw new BusinessError("The record was modified concurrently. Reload and retry.", "CONFLICT");
      await logAudit({ actor, action: "HR_LEAVE_REJECTED", module: "hr", entityType: "LeaveRequest", entityId: l.id, entityLabel: l.number, summary: `Leave ${l.number} rejected`, after: { note: nul(input.note) }, context: ctx }, tx);
    });
  } else {
    if (l.type === "ANNUAL") {
      const { annualDays } = await getLeaveSettings();
      const used = await annualLeaveUsed(l.officerId, l.startDate.getUTCFullYear(), l.id);
      if (used + l.days > annualDays) throw new BusinessError(`Insufficient annual leave balance: ${annualDays - used} day(s) left, ${l.days} requested.`, "STATE");
    }
    const status = ATT_OF_LEAVE[l.type];
    const stationId = (await prisma.officer.findUniqueOrThrow({ where: { id: l.officerId }, select: { stationId: true } })).stationId;
    await prisma.$transaction(async (tx) => {
      const u = await tx.leaveRequest.updateMany({ where: { id: l.id, status: "REQUESTED" }, data: { status: "APPROVED", decidedById: actor.id, decidedAt: new Date(), decisionNote: nul(input.note) } });
      if (u.count !== 1) throw new BusinessError("The record was modified concurrently. Reload and retry.", "CONFLICT");
      // Generate the attendance of every covered day (replacing roll-call rows that are not themselves leave).
      const dates = Array.from({ length: l.days }, (_, i) => addDays(l.startDate, i));
      await tx.attendanceRecord.deleteMany({ where: { officerId: l.officerId, date: { in: dates }, leaveId: null } });
      await tx.attendanceRecord.createMany({ data: dates.map((date) => ({ officerId: l.officerId, date, stationId, status, leaveId: l.id, recordedById: actor.id })), skipDuplicates: true });
      await logAudit({ actor, action: "HR_LEAVE_APPROVED", module: "hr", entityType: "LeaveRequest", entityId: l.id, entityLabel: l.number, summary: `Leave ${l.number} approved (${l.days} day(s))`, after: { note: nul(input.note) }, context: ctx }, tx);
    });
  }
  const verdict = input.decision === "APPROVE" ? "approved" : "rejected";
  for (const userId of [l.requestedById, l.officer.userId].filter((x): x is string => !!x)) {
    await notify({ userId, kind: "INFO", title: `Leave request ${verdict}`, body: `${l.number}: ${input.note ?? ""}`.trim(), href: "/hr/leaves" });
  }
  return prisma.leaveRequest.findUniqueOrThrow({ where: { id: l.id }, include: leaveInclude });
}

export async function cancelLeave(actor: Actor, id: string, reason: string, ctx: RequestContext) {
  const l = await prisma.leaveRequest.findUnique({ where: { id }, include: leaveInclude });
  if (!l || !(inScope(actor, { stationId: l.station.id, regionId: l.station.regionId }) || l.officerId === actor.officerId)) throw new NotFoundError("Leave request");
  if (!OPEN_LEAVE.includes(l.status)) throw new BusinessError("This request is already closed.", "STATE");
  const allowed = l.requestedById === actor.id || l.officerId === actor.officerId || actor.permissions.has("hr:leave_approve");
  if (!allowed) throw new AuthError("forbidden", "Only the requester, the officer or an approver can cancel a leave request");
  const today = utcDay(new Date());
  if (l.status === "APPROVED" && l.endDate < today) throw new BusinessError("A leave that is over cannot be cancelled.", "STATE");
  await prisma.$transaction(async (tx) => {
    const u = await tx.leaveRequest.updateMany({ where: { id, status: { in: OPEN_LEAVE } }, data: { status: "CANCELLED", decisionNote: reason } });
    if (u.count !== 1) throw new BusinessError("The record was modified concurrently. Reload and retry.", "CONFLICT");
    await tx.attendanceRecord.deleteMany({ where: { leaveId: id, date: { gte: today } } }); // days already elapsed keep their record
    await logAudit({ actor, action: "HR_LEAVE_CANCELLED", module: "hr", entityType: "LeaveRequest", entityId: id, entityLabel: l.number, summary: `Leave ${l.number} cancelled`, before: { status: l.status }, after: { reason }, context: ctx }, tx);
  });
  return prisma.leaveRequest.findUniqueOrThrow({ where: { id }, include: leaveInclude });
}

export type LeaveFilter = { status?: LeaveStatus; type?: LeaveType; officerId?: string; q?: string; page?: number; pageSize?: number };

export async function listLeaves(actor: Actor, f: LeaveFilter = {}) {
  need(actor, "hr:view");
  const page = Math.max(f.page ?? 1, 1);
  const pageSize = Math.min(f.pageSize ?? 25, 100);
  const where: Prisma.LeaveRequestWhereInput = {
    AND: [
      scopeWhere(actor, { stationId: "stationId", regionId: "regionId", via: "station" }) as Prisma.LeaveRequestWhereInput,
      f.status ? { status: f.status } : {},
      f.type ? { type: f.type } : {},
      f.officerId ? { officerId: f.officerId } : {},
      f.q ? { OR: [{ number: { contains: f.q, mode: "insensitive" } }, { officer: { OR: [{ badgeNumber: { contains: f.q, mode: "insensitive" } }, { lastName: { contains: f.q, mode: "insensitive" } }] } }] } : {},
    ],
  };
  const [items, total] = await Promise.all([prisma.leaveRequest.findMany({ where, include: leaveInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), prisma.leaveRequest.count({ where })]);
  return { items, total, page, pageSize };
}

/** Leave of the connected officer (self-service), without the HR scope requirement. */
export async function myLeaves(actor: Actor) {
  if (!actor.officerId) return [];
  return prisma.leaveRequest.findMany({ where: { officerId: actor.officerId }, include: leaveInclude, orderBy: { createdAt: "desc" }, take: 20 });
}

export async function officerLeaves(actor: Actor, officerId: string) {
  await getOfficer(actor, officerId);
  return prisma.leaveRequest.findMany({ where: { officerId }, include: leaveInclude, orderBy: { startDate: "desc" }, take: 20 });
}

// ---------------- Statistics ----------------

export type AttendanceStatsFilter = { from: Date; to: Date; stationId?: string };

export async function attendanceStats(actor: Actor, f: AttendanceStatsFilter) {
  need(actor, "hr:view");
  const from = utcDay(f.from);
  const to = utcDay(f.to);
  if (to < from) throw new BusinessError("The end date cannot precede the start date.", "VALIDATION", { to: "before the start" });
  if (to.getTime() - from.getTime() > 366 * DAY) throw new BusinessError("The period cannot exceed one year.", "VALIDATION", { to: "too long" });
  const where: Prisma.AttendanceRecordWhereInput = { date: { gte: from, lte: to }, ...(scopeWhere(actor, { stationId: "stationId", regionId: "regionId", via: "station" }) as Prisma.AttendanceRecordWhereInput), ...(f.stationId ? { stationId: f.stationId } : {}) };
  const [byStatus, lateAgg, byStation, absentees, byDay] = await Promise.all([
    prisma.attendanceRecord.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.attendanceRecord.aggregate({ where: { ...where, status: "LATE" }, _sum: { lateMinutes: true } }),
    prisma.attendanceRecord.groupBy({ by: ["stationId", "status"], where, _count: { _all: true } }),
    prisma.attendanceRecord.groupBy({ by: ["officerId"], where: { ...where, status: "ABSENT" }, _count: { _all: true }, orderBy: { _count: { officerId: "desc" } }, take: 10 }),
    prisma.attendanceRecord.groupBy({ by: ["date", "status"], where, _count: { _all: true }, orderBy: { date: "asc" } }),
  ]);
  const counts = Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])) as Partial<Record<AttendanceStatus, number>>;
  const n = (s: AttendanceStatus) => counts[s] ?? 0;
  const working = n("PRESENT") + n("LATE") + n("ABSENT"); // authorised absences are not "working" days
  const stationIds = [...new Set(byStation.map((b) => b.stationId))];
  const [stations, officers] = await Promise.all([
    prisma.station.findMany({ where: { id: { in: stationIds } }, select: { id: true, code: true, name: true } }),
    prisma.officer.findMany({ where: { id: { in: absentees.map((a) => a.officerId) } }, select: { id: true, badgeNumber: true, firstName: true, lastName: true } }),
  ]);
  const sn = new Map(stations.map((s) => [s.id, s]));
  const on = new Map(officers.map((o) => [o.id, o]));
  const perStation = new Map<string, Partial<Record<AttendanceStatus, number>>>();
  for (const b of byStation) (perStation.get(b.stationId) ?? perStation.set(b.stationId, {}).get(b.stationId)!)[b.status] = b._count._all;
  return {
    from,
    to,
    counts,
    total: byStatus.reduce((a, g) => a + g._count._all, 0),
    presenceRate: working ? (n("PRESENT") + n("LATE")) / working : null,
    absenceRate: working ? n("ABSENT") / working : null,
    lateMinutes: lateAgg._sum.lateMinutes ?? 0,
    stations: [...perStation.entries()]
      .map(([id, c]) => {
        const w = (c.PRESENT ?? 0) + (c.LATE ?? 0) + (c.ABSENT ?? 0);
        return { id, code: sn.get(id)?.code ?? "?", name: sn.get(id)?.name ?? "?", counts: c, presenceRate: w ? ((c.PRESENT ?? 0) + (c.LATE ?? 0)) / w : null };
      })
      .sort((a, b) => (a.presenceRate ?? 2) - (b.presenceRate ?? 2))
      .slice(0, 30),
    topAbsentees: absentees.map((a) => ({ ...on.get(a.officerId)!, absences: a._count._all })),
    daily: byDay.map((d) => ({ date: d.date, status: d.status, n: d._count._all })),
  };
}

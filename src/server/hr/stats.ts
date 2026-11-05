import "server-only";
import { z } from "zod";
import type { AdministrativeStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError } from "@/server/errors";
import { scopeWhere, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";

const DAY = 86_400_000;
export const STATS_SETTING_KEY = "hr.stats";

/** Parameters the statistics need and the law (not the code) decides: retirement age and seniority for promotion. */
export const statsSettingsSchema = z.object({
  retirementAge: z.number().int().min(45).max(75).default(60),
  promotionMinYears: z.number().int().min(1).max(15).default(3),
});
export type StatsSettings = z.infer<typeof statsSettingsSchema>;

export async function getStatsSettings(): Promise<StatsSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: STATS_SETTING_KEY }, select: { value: true } });
  const p = statsSettingsSchema.safeParse(row?.value ?? {});
  return p.success ? p.data : statsSettingsSchema.parse({});
}

export async function updateStatsSettings(actor: Actor, input: StatsSettings, ctx: RequestContext) {
  if (!actor.permissions.has("system:settings")) throw new AuthError("forbidden", "Permission system:settings required");
  const before = await getStatsSettings();
  const value = statsSettingsSchema.parse(input);
  await prisma.$transaction(async (tx) => {
    await tx.systemSetting.upsert({ where: { key: STATS_SETTING_KEY }, update: { value, updatedById: actor.id }, create: { key: STATS_SETTING_KEY, value, description: "Paramètres des statistiques RH : âge de départ à la retraite et ancienneté minimale pour la promotion.", updatedById: actor.id } });
    await logAudit({ actor, action: "HR_STATS_SETTINGS_UPDATED", module: "hr", entityType: "SystemSetting", entityId: STATS_SETTING_KEY, summary: `HR statistics settings: retirement age ${before.retirementAge} → ${value.retirementAge}, promotion seniority ${before.promotionMinYears} → ${value.promotionMinYears}`, before, after: value, context: ctx }, tx);
  });
  return value;
}

export const statsQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  regionId: z.string().max(64).optional(),
  stationId: z.string().max(64).optional(),
  rankId: z.string().max(64).optional(),
});

export type StatsFilter = { from?: Date; to?: Date; regionId?: string; stationId?: string; rankId?: string };

const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

/** Every month key between two dates, so that empty months still show on a chart. */
function monthKeys(from: Date, to: Date) {
  const out: string[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  while (d <= to) {
    out.push(monthKey(d));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}
function series(keys: string[], rows: Date[]) {
  const m = new Map(keys.map((k) => [k, 0]));
  for (const d of rows) m.set(monthKey(d), (m.get(monthKey(d)) ?? 0) + 1);
  return keys.map((k) => ({ month: k, value: m.get(k) ?? 0 }));
}

export function resolvePeriod(f: StatsFilter) {
  const to = utcDay(f.to ?? new Date());
  const from = f.from ? utcDay(f.from) : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1));
  if (to < from) throw new BusinessError("The end date cannot precede the start date.", "VALIDATION", { to: "before the start" });
  if (to.getTime() - from.getTime() > 731 * DAY) throw new BusinessError("The period cannot exceed two years.", "VALIDATION", { to: "too long" });
  return { from, to, end: new Date(to.getTime() + DAY - 1) };
}

/**
 * National HR statistics inside the actor's scope. Stock figures (workforce, tenure, retirement forecast, promotion
 * eligibility) describe today; flow figures (movements, training, absences) cover the selected period.
 * Filters (province = délégation, structure, grade) apply to both.
 */
export async function hrStatistics(actor: Actor, f: StatsFilter = {}) {
  if (!actor.permissions.has("hr:view")) throw new AuthError("forbidden", "Permission hr:view required");
  const { from, to, end } = resolvePeriod(f);
  const settings = await getStatsSettings();
  const now = new Date();

  const officerWhere: Prisma.OfficerWhereInput = {
    AND: [
      { deletedAt: null },
      scopeWhere(actor, { via: "station" }) as Prisma.OfficerWhereInput,
      f.stationId ? { stationId: f.stationId } : {},
      f.regionId ? { station: { regionId: f.regionId } } : {},
      f.rankId ? { rankId: f.rankId } : {},
    ],
  };
  const live: Prisma.OfficerWhereInput = { AND: [officerWhere, { isActive: true }] };
  const inPeriod = { gte: from, lte: end };
  const months = monthKeys(from, to);

  const [byStatusRaw, byRankRaw, byStationRaw, byGenderRaw, transfersByStatus, executedTransfers, careerRows, trainingByKind, trainingByStatus, trainingPassed, trainingEvaluated, expiring, attendanceByStatus, attendanceDaily, activeOfficers, ranks, stations] = await Promise.all([
    prisma.officer.groupBy({ by: ["administrativeStatus"], where: live, _count: { _all: true } }),
    prisma.officer.groupBy({ by: ["rankId"], where: live, _count: { _all: true } }),
    prisma.officer.groupBy({ by: ["stationId"], where: live, _count: { _all: true } }),
    prisma.officer.groupBy({ by: ["gender"], where: live, _count: { _all: true } }),
    prisma.transferRequest.groupBy({ by: ["status"], where: { officer: officerWhere, createdAt: inPeriod }, _count: { _all: true } }),
    prisma.transferRequest.findMany({ where: { officer: officerWhere, status: "EXECUTED", executedAt: inPeriod }, select: { executedAt: true } }),
    prisma.careerEvent.findMany({ where: { officer: officerWhere, effectiveDate: inPeriod }, select: { type: true, effectiveDate: true } }),
    prisma.training.groupBy({ by: ["kind"], where: { officer: officerWhere, startDate: inPeriod }, _count: { _all: true } }),
    prisma.training.groupBy({ by: ["status"], where: { officer: officerWhere, startDate: inPeriod }, _count: { _all: true } }),
    prisma.training.count({ where: { officer: officerWhere, evaluatedAt: inPeriod, passed: true } }),
    prisma.training.count({ where: { officer: officerWhere, evaluatedAt: inPeriod } }),
    prisma.training.count({ where: { officer: officerWhere, expiresAt: { gte: now, lte: new Date(now.getTime() + 90 * DAY) } } }),
    prisma.attendanceRecord.groupBy({ by: ["status"], where: { officer: officerWhere, date: inPeriod }, _count: { _all: true } }),
    prisma.attendanceRecord.groupBy({ by: ["date", "status"], where: { officer: officerWhere, date: inPeriod, status: { in: ["ABSENT", "LATE"] } }, _count: { _all: true } }),
    prisma.officer.findMany({ where: { AND: [live, { administrativeStatus: "ACTIVE" }] }, select: { id: true, rankId: true, hiredAt: true, dateOfBirth: true, currentPostSince: true }, take: 40_000 }),
    prisma.rank.findMany({ select: { id: true, name: true, level: true, code: true } }),
    prisma.station.findMany({ select: { id: true, code: true, name: true, regionId: true, region: { select: { id: true, name: true } } } }),
  ]);

  const rank = new Map(ranks.map((r) => [r.id, r]));
  const station = new Map(stations.map((s) => [s.id, s]));
  const total = byStatusRaw.reduce((a, g) => a + g._count._all, 0);

  const byRank = byRankRaw.map((g) => ({ id: g.rankId, name: rank.get(g.rankId)?.name ?? "—", level: rank.get(g.rankId)?.level ?? 0, n: g._count._all })).sort((a, b) => b.level - a.level);
  const byStation = byStationRaw.map((g) => ({ id: g.stationId, name: station.get(g.stationId)?.name ?? "—", code: station.get(g.stationId)?.code ?? "", n: g._count._all })).sort((a, b) => b.n - a.n);
  const regionMap = new Map<string, { id: string; name: string; n: number }>();
  for (const g of byStationRaw) {
    const r = station.get(g.stationId)?.region;
    if (!r) continue;
    const cur = regionMap.get(r.id) ?? { id: r.id, name: r.name, n: 0 };
    cur.n += g._count._all;
    regionMap.set(r.id, cur);
  }
  const byRegion = [...regionMap.values()].sort((a, b) => b.n - a.n);

  // ---- tenure at the current post ----
  const tenureBuckets = [
    { key: "lt6", from: 0, to: 6 },
    { key: "6to12", from: 6, to: 12 },
    { key: "12to24", from: 12, to: 24 },
    { key: "gt24", from: 24, to: Infinity },
  ].map((b) => ({ key: b.key, n: 0, from: b.from, to: b.to }));
  let noTenure = 0;
  for (const o of activeOfficers) {
    if (!o.currentPostSince) {
      noTenure++;
      continue;
    }
    const months = (now.getTime() - o.currentPostSince.getTime()) / (30.44 * DAY);
    const b = tenureBuckets.find((x) => months >= x.from && months < x.to);
    if (b) b.n++;
  }

  // ---- retirement forecast (dateOfBirth + retirementAge) ----
  const thisYear = now.getUTCFullYear();
  const retirementYears = Array.from({ length: 6 }, (_, i) => ({ year: thisYear + i, n: 0 }));
  let retiringNext12 = 0;
  let noBirthDate = 0;
  for (const o of activeOfficers) {
    if (!o.dateOfBirth) {
      noBirthDate++;
      continue;
    }
    const at = new Date(Date.UTC(o.dateOfBirth.getUTCFullYear() + settings.retirementAge, o.dateOfBirth.getUTCMonth(), o.dateOfBirth.getUTCDate()));
    const slot = retirementYears.find((y) => y.year === at.getUTCFullYear());
    if (slot) slot.n++;
    if (at >= now && at <= new Date(now.getTime() + 365 * DAY)) retiringNext12++;
  }
  const overdue = activeOfficers.filter((o) => o.dateOfBirth && new Date(Date.UTC(o.dateOfBirth.getUTCFullYear() + settings.retirementAge, o.dateOfBirth.getUTCMonth(), o.dateOfBirth.getUTCDate())) < now).length;

  // ---- promotions: seniority in rank >= promotionMinYears, below the top rank ----
  const topLevel = Math.max(0, ...ranks.map((r) => r.level));
  const lastRankChange = await prisma.careerEvent.groupBy({ by: ["officerId"], where: { officerId: { in: activeOfficers.map((o) => o.id) }, type: { in: ["RECRUITMENT", "PROMOTION", "ADVANCEMENT"] } }, _max: { effectiveDate: true } });
  const lastChange = new Map(lastRankChange.map((r) => [r.officerId, r._max.effectiveDate]));
  const minDate = new Date(now.getTime() - settings.promotionMinYears * 365.25 * DAY);
  const eligibleByRank = new Map<string, number>();
  let eligible = 0;
  for (const o of activeOfficers) {
    const lvl = rank.get(o.rankId)?.level ?? 0;
    if (lvl >= topLevel) continue;
    const since = lastChange.get(o.id) ?? o.hiredAt;
    if (since && since <= minDate) {
      eligible++;
      eligibleByRank.set(o.rankId, (eligibleByRank.get(o.rankId) ?? 0) + 1);
    }
  }
  const eligibleList = [...eligibleByRank.entries()].map(([id, n]) => ({ id, name: rank.get(id)?.name ?? "—", level: rank.get(id)?.level ?? 0, n })).sort((a, b) => b.level - a.level);

  // ---- movements ----
  const eventCount = (t: string) => careerRows.filter((e) => e.type === t).length;
  const eventsByType = Object.entries(careerRows.reduce<Record<string, number>>((m, e) => ((m[e.type] = (m[e.type] ?? 0) + 1), m), {})).map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n);

  // ---- attendance ----
  const att = Object.fromEntries(attendanceByStatus.map((g) => [g.status, g._count._all])) as Record<string, number>;
  const working = (att.PRESENT ?? 0) + (att.LATE ?? 0) + (att.ABSENT ?? 0);
  const absMonthly = new Map(months.map((k) => [k, { absent: 0, late: 0 }]));
  for (const d of attendanceDaily) {
    const m = absMonthly.get(monthKey(d.date));
    if (!m) continue;
    if (d.status === "ABSENT") m.absent += d._count._all;
    else m.late += d._count._all;
  }

  const t = (s: AdministrativeStatus) => byStatusRaw.find((g) => g.administrativeStatus === s)?._count._all ?? 0;
  return {
    period: { from, to },
    settings,
    filters: { regionId: f.regionId ?? null, stationId: f.stationId ?? null, rankId: f.rankId ?? null },
    workforce: {
      total,
      active: t("ACTIVE"),
      byStatus: byStatusRaw.map((g) => ({ key: g.administrativeStatus, n: g._count._all })),
      byRank,
      byRegion,
      byStation: byStation.slice(0, 40),
      stationCount: byStation.length,
      byGender: byGenderRaw.map((g) => ({ key: g.gender, n: g._count._all })),
    },
    assignments: { tenure: tenureBuckets.map(({ key, n }) => ({ key, n })), noTenure, openTransfers: await prisma.transferRequest.count({ where: { officer: officerWhere, status: { in: ["PROPOSED", "HR_APPROVED", "APPROVED"] } } }) },
    movements: {
      transfersByStatus: transfersByStatus.map((g) => ({ key: g.status, n: g._count._all })),
      transfersExecuted: executedTransfers.length,
      transfersMonthly: series(months, executedTransfers.map((x) => x.executedAt!)),
      promotions: eventCount("PROMOTION"),
      promotionsMonthly: series(months, careerRows.filter((e) => e.type === "PROMOTION").map((e) => e.effectiveDate)),
      eventsByType,
      retirements: eventCount("RETIREMENT"),
    },
    retirement: { age: settings.retirementAge, byYear: retirementYears, next12Months: retiringNext12, overdue, noBirthDate },
    promotionsPending: { minYears: settings.promotionMinYears, eligible, byRank: eligibleList },
    training: {
      byKind: trainingByKind.map((g) => ({ key: g.kind, n: g._count._all })),
      byStatus: trainingByStatus.map((g) => ({ key: g.status, n: g._count._all })),
      evaluated: trainingEvaluated,
      passed: trainingPassed,
      passRate: trainingEvaluated ? trainingPassed / trainingEvaluated : null,
      expiring90: expiring,
    },
    attendance: {
      byStatus: Object.entries(att).map(([key, n]) => ({ key, n })),
      presenceRate: working ? ((att.PRESENT ?? 0) + (att.LATE ?? 0)) / working : null,
      absenceRate: working ? (att.ABSENT ?? 0) / working : null,
      monthly: months.map((k) => ({ month: k, absent: absMonthly.get(k)!.absent, late: absMonthly.get(k)!.late })),
    },
  };
}
export type HrStats = Awaited<ReturnType<typeof hrStatistics>>;

/** Flat CSV of the statistics (one row per figure) for spreadsheets and the financial/administrative services. */
export function statsToCsv(s: HrStats): string {
  const rows: (string | number)[][] = [["section", "item", "value"]];
  const add = (section: string, item: string, v: number | string | null) => rows.push([section, item, v ?? ""]);
  add("period", "from", s.period.from.toISOString().slice(0, 10));
  add("period", "to", s.period.to.toISOString().slice(0, 10));
  add("workforce", "total", s.workforce.total);
  for (const g of s.workforce.byStatus) add("workforce.status", g.key, g.n);
  for (const g of s.workforce.byRank) add("workforce.rank", g.name, g.n);
  for (const g of s.workforce.byRegion) add("workforce.delegation", g.name, g.n);
  for (const g of s.workforce.byStation) add("workforce.station", `${g.code} ${g.name}`, g.n);
  for (const g of s.workforce.byGender) add("workforce.gender", g.key, g.n);
  for (const g of s.assignments.tenure) add("assignments.tenure", g.key, g.n);
  add("assignments", "open_transfers", s.assignments.openTransfers);
  for (const g of s.movements.transfersByStatus) add("transfers.status", g.key, g.n);
  add("transfers", "executed", s.movements.transfersExecuted);
  for (const m of s.movements.transfersMonthly) add("transfers.monthly", m.month, m.value);
  for (const m of s.movements.promotionsMonthly) add("promotions.monthly", m.month, m.value);
  for (const g of s.movements.eventsByType) add("career_events", g.key, g.n);
  for (const y of s.retirement.byYear) add("retirement.forecast", String(y.year), y.n);
  add("retirement", "next_12_months", s.retirement.next12Months);
  add("promotions_pending", "eligible", s.promotionsPending.eligible);
  for (const g of s.promotionsPending.byRank) add("promotions_pending.rank", g.name, g.n);
  for (const g of s.training.byKind) add("training.kind", g.key, g.n);
  for (const g of s.training.byStatus) add("training.status", g.key, g.n);
  add("training", "pass_rate", s.training.passRate === null ? "" : s.training.passRate.toFixed(4));
  for (const g of s.attendance.byStatus) add("attendance.status", g.key, g.n);
  add("attendance", "presence_rate", s.attendance.presenceRate === null ? "" : s.attendance.presenceRate.toFixed(4));
  for (const m of s.attendance.monthly) add("attendance.monthly.absent", m.month, m.absent);
  const esc = (v: string | number) => {
    const t = String(v);
    return /^[=+\-@]/.test(t) || /[",\n;]/.test(t) ? `"${(/^[=+\-@]/.test(t) ? `'${t}` : t).replace(/"/g, '""')}"` : t;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}

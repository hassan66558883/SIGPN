import "server-only";
import type { Prisma, Station } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError } from "@/server/errors";
import { scopeWhere, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { getOfficer } from "@/server/org/service";
import { nextNumber } from "@/server/sequences";
import { notifyPermission } from "@/server/notifications";
import { applyTransfer, sendExecutionNotices } from "@/server/hr/transfers";
import { ROTATION_LAST_RUN_KEY, getRotationSettings, type RotationSettings } from "@/server/hr/rotation-settings";

const DAY = 86_400_000;
const SYSTEM_CTX: RequestContext = { ip: "scheduler", userAgent: "sigpn-t/hr-rotation" };
const OPEN = ["PROPOSED", "HR_APPROVED", "APPROVED"] as const;

function monthsAgo(months: number, from = new Date()) {
  const d = new Date(from);
  d.setMonth(d.getMonth() - months);
  return d;
}

/** Officers the rotation could ever concern (feature settings applied). Open transfers / exceptions are handled separately so they can be reported. */
function candidateWhere(cfg: RotationSettings): Prisma.OfficerWhereInput {
  return {
    isActive: true,
    deletedAt: null,
    administrativeStatus: "ACTIVE",
    dutyStatus: { notIn: ["SUSPENDED", "RETIRED", "DECEASED"] },
    currentPostSince: { not: null },
    ...(cfg.pilotStationIds.length ? { stationId: { in: cfg.pilotStationIds } } : {}),
    commandsStation: { is: null },
    headsDepartment: { is: null },
    ...(cfg.categories.length ? { rank: { category: { in: cfg.categories } } } : {}),
    ...(cfg.excludedPositionIds.length ? { OR: [{ positionId: null }, { positionId: { notIn: cfg.excludedPositionIds } }] } : {}),
  };
}

const activeException = (now: Date): Prisma.RotationExceptionWhereInput => ({ startsAt: { lte: now }, endedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] });

export type RotationRunSummary = {
  enabled: boolean;
  trigger: "MANUAL" | "SCHEDULER";
  at: string;
  upcomingAlerts: number;
  proposals: number;
  alreadyHandled: number;
  noDestination: number;
  skippedException: number;
  skippedOpenTransfer: number;
  executedDue: number;
  failedExecutions: number;
  truncated: boolean;
};

const emptySummary = (enabled: boolean, trigger: RotationRunSummary["trigger"]): RotationRunSummary => ({ enabled, trigger, at: new Date().toISOString(), upcomingAlerts: 0, proposals: 0, alreadyHandled: 0, noDestination: 0, skippedException: 0, skippedOpenTransfer: 0, executedDue: 0, failedExecutions: 0, truncated: false });

/**
 * One pass of the automatic assignment (idempotent, safe to run from several instances):
 * 1. does nothing when AFFECTATION_AUTOMATIQUE is disabled;
 * 2. alerts the structures about officers who will soon reach the reference duration;
 * 3. creates ONE automatic proposal (status PROPOSED) per officer and post tenure for those who reached it;
 * 4. executes validated transfers whose effective date has come.
 * It never moves anybody on its own initiative: a proposal still needs HR examination and the authority's validation.
 */
export async function runRotation(opts: { actor?: Actor | null; trigger: "MANUAL" | "SCHEDULER"; ctx?: RequestContext }): Promise<RotationRunSummary> {
  const actor = opts.actor ?? null;
  const ctx = opts.ctx ?? SYSTEM_CTX;
  const cfg = await getRotationSettings();
  const out = emptySummary(cfg.enabled, opts.trigger);
  if (!cfg.enabled) return out;

  const now = new Date();
  const dueCutoff = monthsAgo(cfg.durationMonths, now);
  const warnCutoff = new Date(dueCutoff.getTime() + cfg.warningDays * DAY);
  const base = candidateWhere(cfg);

  // ---- 2. soon eligible: one alert per officer and tenure, one notification per structure ----
  if (cfg.warningDays > 0) {
    const upcoming = await prisma.officer.findMany({
      where: { ...base, currentPostSince: { gt: dueCutoff, lte: warnCutoff }, rotationAlerts: { none: { kind: "UPCOMING" } } },
      select: { id: true, stationId: true, currentPostSince: true },
      take: 5000,
    });
    const byStation = new Map<string, number>();
    for (const o of upcoming) {
      try {
        await prisma.rotationAlert.create({ data: { officerId: o.id, kind: "UPCOMING", postSince: o.currentPostSince! } });
        byStation.set(o.stationId, (byStation.get(o.stationId) ?? 0) + 1);
        out.upcomingAlerts++;
      } catch {
        /* unique violation: another instance already alerted */
      }
    }
    for (const [stationId, n] of byStation) {
      await notifyPermission({ permission: "hr:view", stationId, kind: "DEADLINE", title: "Officers soon eligible for rotation", body: `${n} officer(s) will reach ${cfg.durationMonths} months at their post within ${cfg.warningDays} days.`, href: "/hr/rotation" });
    }
    if (out.upcomingAlerts) await notifyPermission({ permission: "hr:transfer_review", kind: "DEADLINE", title: "Officers soon eligible for rotation", body: `${out.upcomingAlerts} officer(s) will reach ${cfg.durationMonths} months at their post within ${cfg.warningDays} days.`, href: "/hr/rotation" });
  }

  // ---- 3. proposals ----
  const dueWhere: Prisma.OfficerWhereInput = { ...base, currentPostSince: { lte: dueCutoff } };
  const [skippedException, skippedOpen] = await Promise.all([
    prisma.officer.count({ where: { ...dueWhere, rotationExceptions: { some: activeException(now) } } }),
    prisma.officer.count({ where: { ...dueWhere, transferRequests: { some: { status: { in: [...OPEN] } } } } }),
  ]);
  out.skippedException = skippedException;
  out.skippedOpenTransfer = skippedOpen;
  const eligible: Prisma.OfficerWhereInput = { ...dueWhere, rotationExceptions: { none: activeException(now) }, transferRequests: { none: { status: { in: [...OPEN] } } }, rotationAlerts: { none: { kind: "DUE" } } };
  const PAGE = 500;
  const MAX_SCANNED = 20_000; // 14 000 officers fit; a hard bound protects the server
  let cursor: string | undefined;
  let scanned = 0;
  let plan: Awaited<ReturnType<typeof buildDestinationPlanner>> | null = null;
  scan: while (scanned < MAX_SCANNED) {
    // Officers without any possible destination stay "eligible" run after run: page through them instead of re-reading the same oldest rows.
    const page = await prisma.officer.findMany({
      where: eligible,
      orderBy: [{ currentPostSince: "asc" }, { id: "asc" }],
      take: PAGE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, badgeNumber: true, stationId: true, departmentId: true, currentPostSince: true, station: { select: { id: true, type: true, regionId: true } } },
    });
    if (!page.length) break;
    cursor = page[page.length - 1].id;
    scanned += page.length;
    plan ??= await buildDestinationPlanner(cfg);
    await plan.loadHistory(page.map((o) => o.id));
    for (const o of page) {
      if (out.proposals >= cfg.maxProposalsPerRun) {
        out.truncated = true;
        break scan;
      }
      const to = plan.pick(o.id, o.station);
      if (!to) {
        out.noDestination++;
        continue;
      }
      const months = Math.max(cfg.durationMonths, Math.floor((now.getTime() - o.currentPostSince!.getTime()) / (30.44 * DAY)));
      try {
        await prisma.$transaction(async (tx) => {
          const alert = await tx.rotationAlert.create({ data: { officerId: o.id, kind: "DUE", postSince: o.currentPostSince! } }); // unique: at most one automatic proposal per tenure
          const number = await nextNumber("TRANSFER", tx);
          const t = await tx.transferRequest.create({
            data: { number, officerId: o.id, fromStationId: o.stationId, fromDepartmentId: o.departmentId, toStationId: to.id, effectiveDate: new Date(now.getTime() + cfg.effectiveDelayDays * DAY), reason: `Automatic rotation: ${months} months at the current post (reference duration ${cfg.durationMonths} months).`, origin: "AUTOMATIC", proposedById: null },
          });
          await tx.rotationAlert.update({ where: { id: alert.id }, data: { transferId: t.id } });
          await logAudit({ actor, action: "TRANSFER_PROPOSED_AUTO", module: "hr", entityType: "TransferRequest", entityId: t.id, entityLabel: number, summary: `Automatic rotation proposal ${number} for ${o.badgeNumber} → ${to.name}`, after: t, context: ctx }, tx);
        });
        plan.commit(o.stationId, to.id);
        out.proposals++;
      } catch (e) {
        if ((e as { code?: string }).code === "P2002") out.alreadyHandled++;
        else throw e;
      }
    }
  }
  if (out.proposals) await notifyPermission({ permission: "hr:transfer_review", kind: "APPROVAL", title: "Automatic transfer proposals to examine", body: `${out.proposals} proposal(s) generated by the automatic assignment await HR examination.`, href: "/hr/transfers?status=PROPOSED" });

  // ---- 4. validated transfers whose date has come ----
  const exec = await executeDueTransfers(actor, ctx);
  out.executedDue = exec.executed;
  out.failedExecutions = exec.failed;

  await prisma.systemSetting.upsert({
    where: { key: ROTATION_LAST_RUN_KEY },
    update: { value: out as unknown as Prisma.InputJsonValue },
    create: { key: ROTATION_LAST_RUN_KEY, value: out as unknown as Prisma.InputJsonValue, description: "Résumé de la dernière exécution de l'affectation automatique." },
  });
  await logAudit({ actor, action: "HR_ROTATION_RUN", module: "hr", entityType: "SystemSetting", entityId: ROTATION_LAST_RUN_KEY, entityLabel: "AFFECTATION_AUTOMATIQUE", summary: `Automatic assignment run (${opts.trigger}): ${out.proposals} proposal(s), ${out.upcomingAlerts} alert(s), ${out.executedDue} executed`, after: out, context: ctx });
  return out;
}

/** Executes APPROVED transfers (validated by the authority) whose effective date has come. Each one is isolated in its own transaction. */
export async function executeDueTransfers(actor: Actor | null, ctx: RequestContext) {
  const due = await prisma.transferRequest.findMany({ where: { status: "APPROVED", effectiveDate: { lte: new Date(Date.now() + DAY) } }, select: { id: true, number: true }, take: 500, orderBy: { effectiveDate: "asc" } });
  let executed = 0;
  let failed = 0;
  for (const t of due) {
    try {
      const notice = await prisma.$transaction((tx) => applyTransfer(tx, t.id, actor, ctx));
      await sendExecutionNotices(notice);
      executed++;
    } catch (e) {
      failed++;
      await logAudit({ actor, action: "TRANSFER_EXECUTION_FAILED", module: "hr", entityType: "TransferRequest", entityId: t.id, entityLabel: t.number, outcome: "FAILURE", summary: `Automatic execution of ${t.number} failed: ${e instanceof BusinessError ? e.message : "unexpected error"}`, context: ctx });
    }
  }
  return { executed, failed };
}

type Origin = Pick<Station, "id" | "type" | "regionId">;

/** Assignment rule: same kind of structure, province constraint, least staffed first; avoids structures the officer recently served in. */
async function buildDestinationPlanner(cfg: RotationSettings) {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 2);
  const [stations, staffed, incoming, outgoing] = await Promise.all([
    prisma.station.findMany({ where: { isActive: true, status: "ACTIVE" }, select: { id: true, code: true, name: true, type: true, regionId: true } }),
    prisma.officer.groupBy({ by: ["stationId"], where: { isActive: true, deletedAt: null, administrativeStatus: "ACTIVE" }, _count: { _all: true } }),
    prisma.transferRequest.groupBy({ by: ["toStationId"], where: { status: { in: [...OPEN] } }, _count: { _all: true } }),
    prisma.transferRequest.groupBy({ by: ["fromStationId"], where: { status: { in: [...OPEN] } }, _count: { _all: true } }),
  ]);
  const load = new Map<string, number>();
  for (const s of staffed) load.set(s.stationId, (load.get(s.stationId) ?? 0) + s._count._all);
  for (const s of incoming) load.set(s.toStationId, (load.get(s.toStationId) ?? 0) + s._count._all);
  for (const s of outgoing) load.set(s.fromStationId, (load.get(s.fromStationId) ?? 0) - s._count._all);
  const served = new Map<string, Set<string>>();
  return {
    async loadHistory(officerIds: string[]) {
      const recent = await prisma.officerAssignment.findMany({ where: { officerId: { in: officerIds }, startDate: { gte: since } }, select: { officerId: true, stationId: true } });
      for (const a of recent) (served.get(a.officerId) ?? served.set(a.officerId, new Set()).get(a.officerId)!).add(a.stationId);
    },
    pick(officerId: string, from: Origin) {
      const pool = stations.filter((s) => s.id !== from.id && s.type === from.type && (!cfg.sameProvinceOnly || s.regionId === from.regionId));
      const fresh = pool.filter((s) => !served.get(officerId)?.has(s.id));
      const list = fresh.length ? fresh : pool;
      return list.sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0) || a.code.localeCompare(b.code))[0] ?? null;
    },
    commit(fromId: string, toId: string) {
      load.set(toId, (load.get(toId) ?? 0) + 1);
      load.set(fromId, (load.get(fromId) ?? 0) - 1);
    },
  };
}

// ---------------- Exceptions ----------------

export async function listExceptions(officerId: string) {
  return prisma.rotationException.findMany({ where: { officerId }, orderBy: { createdAt: "desc" }, include: { createdBy: { select: { username: true } } } });
}

export async function createException(actor: Actor, input: { officerId: string; reason: string; startsAt?: Date | null; endsAt?: Date | null }, ctx: RequestContext) {
  if (!actor.permissions.has("hr:manage")) throw new AuthError("forbidden", "Permission hr:manage required");
  const o = await getOfficer(actor, input.officerId);
  const startsAt = input.startsAt ?? new Date();
  if (input.endsAt && input.endsAt <= startsAt) throw new BusinessError("The end date must be after the start date.", "VALIDATION", { endsAt: "must be after the start" });
  return prisma.$transaction(async (tx) => {
    const e = await tx.rotationException.create({ data: { officerId: o.id, reason: input.reason, startsAt, endsAt: input.endsAt ?? null, createdById: actor.id } });
    await logAudit({ actor, action: "HR_ROTATION_EXCEPTION_CREATED", module: "hr", entityType: "Officer", entityId: o.id, entityLabel: o.badgeNumber, summary: `Rotation exception for ${o.badgeNumber}: ${input.reason}`, after: e, context: ctx }, tx);
    return e;
  });
}

export async function endException(actor: Actor, id: string, ctx: RequestContext) {
  if (!actor.permissions.has("hr:manage")) throw new AuthError("forbidden", "Permission hr:manage required");
  const e = await prisma.rotationException.findUnique({ where: { id }, include: { officer: { select: { id: true, badgeNumber: true } } } });
  if (!e) throw new BusinessError("Exception not found.", "STATE");
  await getOfficer(actor, e.officerId);
  if (e.endedAt) throw new BusinessError("This exception is already ended.", "STATE");
  await prisma.$transaction(async (tx) => {
    await tx.rotationException.update({ where: { id }, data: { endedAt: new Date() } });
    await logAudit({ actor, action: "HR_ROTATION_EXCEPTION_ENDED", module: "hr", entityType: "Officer", entityId: e.officerId, entityLabel: e.officer.badgeNumber, summary: `Rotation exception ended for ${e.officer.badgeNumber}`, context: ctx }, tx);
  });
}

// ---------------- Overview (UI) ----------------

export async function rotationOverview(actor: Actor) {
  const cfg = await getRotationSettings();
  const now = new Date();
  const dueCutoff = monthsAgo(cfg.durationMonths, now);
  const warnCutoff = new Date(dueCutoff.getTime() + cfg.warningDays * DAY);
  const scoped: Prisma.OfficerWhereInput = { ...candidateWhere(cfg), ...(scopeWhere(actor, { via: "station" }) as Prisma.OfficerWhereInput) };
  const [dueCount, upcomingCount, rows, last] = await Promise.all([
    prisma.officer.count({ where: { ...scoped, currentPostSince: { lte: dueCutoff } } }),
    prisma.officer.count({ where: { ...scoped, currentPostSince: { gt: dueCutoff, lte: warnCutoff } } }),
    prisma.officer.findMany({
      where: { ...scoped, currentPostSince: { lte: warnCutoff } },
      orderBy: { currentPostSince: "asc" },
      take: 50,
      select: { id: true, badgeNumber: true, firstName: true, lastName: true, currentPostSince: true, rank: { select: { name: true } }, station: { select: { name: true } }, rotationExceptions: { where: activeException(now), select: { id: true } }, transferRequests: { where: { status: { in: [...OPEN] } }, select: { id: true, number: true }, take: 1 } },
    }),
    prisma.systemSetting.findUnique({ where: { key: ROTATION_LAST_RUN_KEY }, select: { value: true } }),
  ]);
  return { cfg, dueCount, upcomingCount, dueCutoff, rows, lastRun: (last?.value ?? null) as RotationRunSummary | null };
}

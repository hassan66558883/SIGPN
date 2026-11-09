import "server-only";
import type { AlertDeliveryStatus, AlertKind, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError, NotFoundError } from "@/server/errors";
import { scopeWhere, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { publishAlert } from "@/server/alerts/publish";

/** A unit counts as connected when one of its clients was seen in this window (heartbeat every ~20 s). */
export const ONLINE_WINDOW_MS = 2 * 60_000;

export function isOnline(p: { lastSeenAt: Date; simulatedOffline: boolean } | null | undefined, now = Date.now()) {
  return !!p && !p.simulatedOffline && now - p.lastSeenAt.getTime() <= ONLINE_WINDOW_MS;
}

function need(actor: Actor, permission: string) {
  if (!actor.permissions.has(permission)) throw new AuthError("forbidden", `Permission ${permission} required`);
}

/** Units the actor belongs to (own unit and its sub-units). Alert reception follows the unit, not the person. */
function actorStations(actor: Actor): string[] {
  return actor.stationIds?.length ? actor.stationIds : actor.stationId ? [actor.stationId] : [];
}

const deliverySelect = {
  id: true,
  status: true,
  stationId: true,
  deliveredAt: true,
  readAt: true,
  ackAt: true,
  alert: { select: { id: true, seq: true, number: true, kind: true, priority: true, title: true, payload: true, requiresAck: true, isSimulation: true, createdAt: true, wantedPersonId: true, sourceStationId: true } },
  station: { select: { code: true, name: true } },
} satisfies Prisma.AlertDeliverySelect;

/**
 * Heartbeat of a unit's client. Refreshes the presence of the actor's unit; returns what is waiting (pending count).
 * A unit set offline for the demonstration neither registers presence nor receives anything.
 */
export async function heartbeat(actor: Actor) {
  need(actor, "alerts:view");
  const stationId = actor.stationId;
  if (!stationId) return { online: false, pending: 0, unread: 0, reason: "NO_UNIT" as const };
  const presence = await prisma.stationPresence.findUnique({ where: { stationId } });
  if (presence?.simulatedOffline) return { online: false, pending: 0, unread: 0, reason: "SIMULATED_OFFLINE" as const };
  const now = new Date();
  await prisma.stationPresence.upsert({ where: { stationId }, update: { lastSeenAt: now, lastUserId: actor.id }, create: { stationId, lastSeenAt: now, lastUserId: actor.id } });
  const stations = actorStations(actor);
  const [pending, unread] = await Promise.all([
    prisma.alertDelivery.count({ where: { stationId: { in: stations }, status: "PENDING" } }),
    prisma.alertDelivery.count({ where: { stationId: { in: stations }, status: { in: ["PENDING", "DELIVERED"] } } }),
  ]);
  return { online: true, pending, unread, reason: null };
}

/**
 * Inbox of the actor's units. Fetching a PENDING item is the delivery receipt (workflow step 6): it becomes DELIVERED.
 * After an outage this is also the catch-up: everything that accumulated while offline is returned oldest-first.
 */
export async function listInbox(actor: Actor, opts: { afterSeq?: number; status?: AlertDeliveryStatus; limit?: number } = {}, ctx?: RequestContext) {
  need(actor, "alerts:view");
  const stations = actorStations(actor);
  const unit = actor.stationId ? await prisma.stationPresence.findUnique({ where: { stationId: actor.stationId } }) : null;
  if (unit?.simulatedOffline) return { offline: true as const, items: [], caughtUp: 0 };
  const limit = Math.min(opts.limit ?? 50, 200);
  const where: Prisma.AlertDeliveryWhereInput = { stationId: { in: stations.length ? stations : ["-"] }, ...(opts.status ? { status: opts.status } : {}), ...(opts.afterSeq ? { alert: { seq: { gt: opts.afterSeq } } } : {}) };
  const rows = await prisma.alertDelivery.findMany({ where, orderBy: { alert: { seq: opts.afterSeq ? "asc" : "desc" } }, take: limit, select: deliverySelect });
  const toDeliver = rows.filter((r) => r.status === "PENDING").map((r) => r.id);
  if (toDeliver.length) {
    const now = new Date();
    await prisma.alertDelivery.updateMany({ where: { id: { in: toDeliver }, status: "PENDING" }, data: { status: "DELIVERED", deliveredAt: now, deliveredById: actor.id, nextAttemptAt: null } });
    if (unit) await prisma.stationPresence.update({ where: { stationId: unit.stationId }, data: { lastSyncAt: now } });
    await logAudit({ actor, action: "ALERT_DELIVERED", module: "alerts", summary: `${toDeliver.length} alert(s) delivered to unit ${actor.stationName ?? actor.stationId}`, after: { count: toDeliver.length }, context: ctx });
  }
  return { offline: false as const, caughtUp: toDeliver.length, items: rows.map((r) => (r.status === "PENDING" ? { ...r, status: "DELIVERED" as const, deliveredAt: new Date() } : r)) };
}

async function ownDelivery(actor: Actor, alertId: string) {
  const stations = actorStations(actor);
  const d = await prisma.alertDelivery.findFirst({ where: { alertId, stationId: { in: stations.length ? stations : ["-"] } }, orderBy: { stationId: actor.stationId ? "asc" : "asc" }, select: { id: true, status: true, stationId: true, alert: { select: { number: true } } } });
  if (!d) throw new NotFoundError("Alert");
  return d;
}

/** Read receipt (workflow step 6). Idempotent. */
export async function markRead(actor: Actor, alertId: string, ctx: RequestContext) {
  need(actor, "alerts:view");
  const d = await ownDelivery(actor, alertId);
  if (d.status === "READ" || d.status === "ACKNOWLEDGED") return d;
  const now = new Date();
  await prisma.alertDelivery.update({ where: { id: d.id }, data: { status: "READ", readAt: now, readById: actor.id, deliveredAt: d.status === "PENDING" ? now : undefined, nextAttemptAt: null } });
  await logAudit({ actor, action: "ALERT_READ", module: "alerts", entityType: "NationalAlert", entityId: alertId, entityLabel: d.alert.number, summary: `Alert ${d.alert.number} read by ${actor.username}`, context: ctx });
  return { ...d, status: "READ" as const };
}

/** Acknowledgement (workflow step 6): the unit confirms it has taken the alert into account. Idempotent. */
export async function acknowledge(actor: Actor, alertId: string, ctx: RequestContext) {
  need(actor, "alerts:ack");
  const d = await ownDelivery(actor, alertId);
  if (d.status === "ACKNOWLEDGED") return d;
  const now = new Date();
  await prisma.alertDelivery.update({ where: { id: d.id }, data: { status: "ACKNOWLEDGED", ackAt: now, ackById: actor.id, readAt: d.status === "READ" ? undefined : now, readById: d.status === "READ" ? undefined : actor.id, deliveredAt: d.status === "PENDING" ? now : undefined, nextAttemptAt: null } });
  await logAudit({ actor, action: "ALERT_ACKNOWLEDGED", module: "alerts", entityType: "NationalAlert", entityId: alertId, entityLabel: d.alert.number, summary: `Alert ${d.alert.number} acknowledged by ${actor.username}`, context: ctx });
  return { ...d, status: "ACKNOWLEDGED" as const };
}

export async function getInboxAlert(actor: Actor, alertId: string) {
  need(actor, "alerts:view");
  const stations = actorStations(actor);
  const d = await prisma.alertDelivery.findFirst({ where: { alertId, stationId: { in: stations.length ? stations : ["-"] } }, select: deliverySelect });
  if (!d) throw new NotFoundError("Alert");
  return d;
}

// ---------------------------------------------------------------- supervision

export type SupervisionFilter = { days?: number; regionId?: string; stationId?: string; status?: AlertDeliveryStatus; kind?: AlertKind };

/** Deliveries the supervisor may see: national sees all, regional the units of the province, others their own units. */
function deliveryScope(actor: Actor): Prisma.AlertDeliveryWhereInput {
  if (actor.scopeLevel === "NATIONAL") return {};
  return { station: scopeWhere(actor, { stationId: "id", regionId: "regionId" }) as Prisma.StationWhereInput };
}

export async function supervisionOverview(actor: Actor, filter: SupervisionFilter = {}) {
  need(actor, "alerts:supervise");
  const since = new Date(Date.now() - (filter.days ?? 30) * 86_400_000);
  const scope = deliveryScope(actor);
  const stationFilter: Prisma.AlertDeliveryWhereInput = { ...(filter.stationId ? { stationId: filter.stationId } : {}), ...(filter.regionId ? { station: { regionId: filter.regionId } } : {}) };
  const deliveryWhere: Prisma.AlertDeliveryWhereInput = { AND: [scope, stationFilter, filter.status ? { status: filter.status } : {}], alert: { createdAt: { gte: since }, ...(filter.kind ? { kind: filter.kind } : {}) } };
  const grouped = await prisma.alertDelivery.groupBy({ by: ["alertId", "status"], where: deliveryWhere, _count: true });
  const alertIds = [...new Set(grouped.map((g) => g.alertId))];
  const alerts = await prisma.nationalAlert.findMany({ where: { id: { in: alertIds } }, orderBy: { seq: "desc" }, take: 100, select: { id: true, seq: true, number: true, kind: true, priority: true, title: true, diffusion: true, isSimulation: true, createdAt: true, wantedPersonId: true } });
  const counts = new Map<string, Record<AlertDeliveryStatus, number>>();
  for (const g of grouped) {
    const c = counts.get(g.alertId) ?? { PENDING: 0, DELIVERED: 0, READ: 0, ACKNOWLEDGED: 0, FAILED: 0 };
    c[g.status] = g._count;
    counts.set(g.alertId, c);
  }
  const rows = alerts.map((a) => {
    const c = counts.get(a.id) ?? { PENDING: 0, DELIVERED: 0, READ: 0, ACKNOWLEDGED: 0, FAILED: 0 };
    return { ...a, counts: c, total: Object.values(c).reduce((s, n) => s + n, 0) };
  });
  const unitWhere: Prisma.StationWhereInput = { isActive: true, type: { not: "CENTRAL_DIRECTION" }, ...(scope.station ? (scope.station as Prisma.StationWhereInput) : {}), ...(filter.regionId ? { regionId: filter.regionId } : {}), ...(filter.stationId ? { id: filter.stationId } : {}) };
  const units = await prisma.station.findMany({ where: unitWhere, orderBy: [{ region: { name: "asc" } }, { name: "asc" }], take: 400, select: { id: true, code: true, name: true, region: { select: { id: true, name: true } }, presence: { select: { lastSeenAt: true, lastSyncAt: true, simulatedOffline: true } } } });
  const pendingByUnit = await prisma.alertDelivery.groupBy({ by: ["stationId"], where: { status: "PENDING", stationId: { in: units.map((u) => u.id) } }, _count: true });
  const pend = new Map(pendingByUnit.map((p) => [p.stationId, p._count]));
  const now = Date.now();
  const unitRows = units.map((u) => ({ id: u.id, code: u.code, name: u.name, region: u.region, online: isOnline(u.presence, now), simulatedOffline: !!u.presence?.simulatedOffline, lastSeenAt: u.presence?.lastSeenAt ?? null, lastSyncAt: u.presence?.lastSyncAt ?? null, pending: pend.get(u.id) ?? 0 }));
  return { alerts: rows, units: unitRows, online: unitRows.filter((u) => u.online).length, offline: unitRows.filter((u) => !u.online).length };
}

export async function supervisionAlertDetail(actor: Actor, alertId: string) {
  need(actor, "alerts:supervise");
  const alert = await prisma.nationalAlert.findUnique({ where: { id: alertId }, select: { id: true, number: true, kind: true, priority: true, title: true, diffusion: true, payload: true, isSimulation: true, createdAt: true, requiresAck: true, wantedPersonId: true } });
  if (!alert) throw new NotFoundError("Alert");
  const deliveries = await prisma.alertDelivery.findMany({ where: { alertId, ...deliveryScope(actor) }, orderBy: [{ station: { region: { name: "asc" } } }, { station: { name: "asc" } }], select: { id: true, status: true, attempts: true, deliveredAt: true, readAt: true, ackAt: true, escalatedAt: true, escalationLevel: true, error: true, station: { select: { id: true, code: true, name: true, region: { select: { name: true } }, presence: { select: { lastSeenAt: true, simulatedOffline: true } } } } } });
  if (!deliveries.length && actor.scopeLevel !== "NATIONAL") throw new NotFoundError("Alert");
  const now = Date.now();
  return { alert, deliveries: deliveries.map((d) => ({ ...d, online: isOnline(d.station.presence, now) })) };
}

/** Manual reminder: resets the retry clock of the pending deliveries of an alert and re-notifies their units. */
export async function remindPending(actor: Actor, alertId: string, ctx: RequestContext) {
  need(actor, "alerts:supervise");
  const rows = await prisma.alertDelivery.findMany({ where: { alertId, status: { in: ["PENDING", "DELIVERED", "READ"] }, ...deliveryScope(actor) }, select: { id: true, stationId: true, status: true } });
  const targets = rows.filter((r) => r.status === "PENDING" || r.status === "DELIVERED" || r.status === "READ");
  if (!targets.length) return { reminded: 0 };
  await prisma.alertDelivery.updateMany({ where: { id: { in: targets.map((t) => t.id) } }, data: { attempts: { increment: 1 }, nextAttemptAt: new Date(Date.now() + 5 * 60_000) } });
  const users = await prisma.user.findMany({ where: { status: "ACTIVE", deletedAt: null, stationId: { in: targets.map((t) => t.stationId) }, role: { isActive: true, permissions: { some: { permission: { code: "alerts:view" } } } } }, select: { id: true } });
  if (users.length) await prisma.notification.createMany({ data: users.map((u) => ({ userId: u.id, kind: "ALERT" as const, title: "Rappel : avis du réseau national", body: "Un avis attend votre prise en compte dans SIGPN-T.", href: "/alerts" })) });
  await logAudit({ actor, action: "ALERT_REMINDER", module: "alerts", entityType: "NationalAlert", entityId: alertId, summary: `Reminder sent for ${targets.length} unit(s)`, after: { units: targets.length }, context: ctx });
  return { reminded: targets.length };
}

/** Demonstration switch: a unit set offline stops sending heartbeats and receiving; its alerts wait and are delivered on reconnection. */
export async function setSimulatedOffline(actor: Actor, stationId: string, offline: boolean, ctx: RequestContext) {
  need(actor, "alerts:simulate");
  const unit = await prisma.station.findFirst({ where: { id: stationId, isActive: true, ...(actor.scopeLevel === "NATIONAL" ? {} : (scopeWhere(actor, { stationId: "id", regionId: "regionId" }) as Prisma.StationWhereInput)) }, select: { id: true, code: true } });
  if (!unit) throw new NotFoundError("Unit");
  await prisma.stationPresence.upsert({ where: { stationId }, update: { simulatedOffline: offline, ...(offline ? {} : { lastSeenAt: new Date() }) }, create: { stationId, lastSeenAt: new Date(), simulatedOffline: offline } });
  await logAudit({ actor, action: offline ? "ALERT_UNIT_OFFLINE_SIMULATED" : "ALERT_UNIT_ONLINE_SIMULATED", module: "alerts", entityType: "Station", entityId: stationId, entityLabel: unit.code, summary: `Unit ${unit.code} ${offline ? "set offline" : "back online"} (simulation)`, context: ctx });
  return { stationId, offline };
}

/** Fictitious alert for demonstrations: flagged as simulation everywhere, never linked to a real notice. */
export async function publishSimulation(actor: Actor, input: { title: string; diffusion: "NATIONAL" | "REGIONAL" | "LOCAL"; priority?: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"; stationId?: string }, ctx: RequestContext) {
  need(actor, "alerts:simulate");
  const sourceId = input.stationId ?? actor.stationId;
  if (!sourceId) throw new BusinessError("Select the unit the simulation is published from.", "STATE");
  const st = await prisma.station.findFirst({ where: { id: sourceId, isActive: true, ...(actor.scopeLevel === "NATIONAL" ? {} : (scopeWhere(actor, { stationId: "id", regionId: "regionId" }) as Prisma.StationWhereInput)) }, select: { id: true, regionId: true, name: true, code: true } });
  if (!st) throw new NotFoundError("Unit");
  const key = `sim:${actor.id}:${Date.now()}`;
  return prisma.$transaction((tx) =>
    publishAlert(tx, actor, { kind: "PUBLISHED", wantedPersonId: null, idempotencyKey: key, diffusion: input.diffusion, source: { stationId: st.id, regionId: st.regionId }, priority: input.priority ?? "HIGH", title: `SIMULATION — ${input.title}`, payload: { simulation: true, person: { name: "Personne fictive", aliases: [] }, offense: "Exercice de simulation", unit: `${st.code} · ${st.name}`, caution: "Exercice : aucune action réelle. Une correspondance n'établit jamais la culpabilité." }, isSimulation: true }, ctx),
  );
}

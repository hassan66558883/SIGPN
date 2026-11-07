import "server-only";
import { prisma } from "@/server/db";
import { escalationLevelFor } from "@/lib/alert-escalation";

const MIN = 60_000;

const ALERT_TITLE = "Escalade : avis du réseau national sans prise en compte";

/**
 * One idempotent maintenance pass (scheduler or `npm run alerts:maintain`):
 *  - deliveries to a deactivated unit are marked FAILED;
 *  - pending deliveries are retried (counter + generic reminder to the unit's users, 3 times at most);
 *  - overdue deliveries are escalated: level 1 to the unit's parent and the regional supervisors, level 2 to the national supervisors.
 * Escalation is recorded on the delivery, so a pass never escalates the same level twice.
 */
export async function runAlertMaintenance(now = new Date()) {
  const result = { failed: 0, retried: 0, escalated1: 0, escalated2: 0 };

  const failed = await prisma.alertDelivery.updateMany({ where: { status: "PENDING", station: { isActive: false } }, data: { status: "FAILED", error: "Unit deactivated", nextAttemptAt: null } });
  result.failed = failed.count;

  const retry = await prisma.alertDelivery.findMany({ where: { status: "PENDING", attempts: { lt: 12 }, nextAttemptAt: { lte: now } }, take: 2000, select: { id: true, attempts: true, stationId: true } });
  if (retry.length) {
    await prisma.alertDelivery.updateMany({ where: { id: { in: retry.map((r) => r.id) } }, data: { attempts: { increment: 1 }, nextAttemptAt: new Date(now.getTime() + 5 * MIN) } });
    result.retried = retry.length;
    const first = retry.filter((r) => r.attempts < 3).map((r) => r.stationId);
    if (first.length) {
      const users = await prisma.user.findMany({ where: { status: "ACTIVE", deletedAt: null, stationId: { in: first }, role: { isActive: true, permissions: { some: { permission: { code: "alerts:view" } } } } }, select: { id: true } });
      if (users.length) await prisma.notification.createMany({ data: users.map((u) => ({ userId: u.id, kind: "ALERT" as const, title: "Rappel : avis du réseau national", body: "Un avis attend votre prise en compte dans SIGPN-T.", href: "/alerts" })) });
    }
  }

  const candidates = await prisma.alertDelivery.findMany({
    where: { escalationLevel: { lt: 2 }, OR: [{ status: "PENDING" }, { status: { in: ["DELIVERED", "READ"] }, alert: { requiresAck: true } }], alert: { createdAt: { lte: new Date(now.getTime() - 5 * MIN) }, isSimulation: false } },
    take: 5000,
    select: { id: true, status: true, escalationLevel: true, station: { select: { id: true, parentId: true, regionId: true } }, alert: { select: { id: true, number: true, priority: true, requiresAck: true, createdAt: true } } },
  });
  const byAlert = new Map<string, { number: string; l1: Set<string>; l1Regions: Set<string>; l1Parents: Set<string>; l2: number }>();
  const l1Ids: string[] = [];
  const l2Ids: string[] = [];
  for (const d of candidates) {
    const level = escalationLevelFor({ status: d.status, requiresAck: d.alert.requiresAck, priority: d.alert.priority, ageMinutes: (now.getTime() - d.alert.createdAt.getTime()) / MIN });
    if (level <= d.escalationLevel) continue;
    (level === 2 ? l2Ids : l1Ids).push(d.id);
    const g = byAlert.get(d.alert.id) ?? { number: d.alert.number, l1: new Set<string>(), l1Regions: new Set<string>(), l1Parents: new Set<string>(), l2: 0 };
    if (level === 1) {
      g.l1.add(d.station.id);
      g.l1Regions.add(d.station.regionId);
      if (d.station.parentId) g.l1Parents.add(d.station.parentId);
    } else g.l2++;
    byAlert.set(d.alert.id, g);
  }
  if (l1Ids.length) await prisma.alertDelivery.updateMany({ where: { id: { in: l1Ids } }, data: { escalationLevel: 1, escalatedAt: now } });
  if (l2Ids.length) await prisma.alertDelivery.updateMany({ where: { id: { in: l2Ids } }, data: { escalationLevel: 2, escalatedAt: now } });
  result.escalated1 = l1Ids.length;
  result.escalated2 = l2Ids.length;

  const supervisors = { status: "ACTIVE" as const, deletedAt: null, role: { isActive: true, permissions: { some: { permission: { code: "alerts:supervise" } } } } };
  for (const [, g] of byAlert) {
    const recipients = new Set<string>();
    if (g.l1.size) {
      for (const u of await prisma.user.findMany({ where: { ...supervisors, OR: [{ regionId: { in: [...g.l1Regions] }, role: { scopeLevel: "REGIONAL" } }, ...(g.l1Parents.size ? [{ stationId: { in: [...g.l1Parents] } }] : [])] }, select: { id: true } })) recipients.add(u.id);
    }
    if (g.l2) for (const u of await prisma.user.findMany({ where: { ...supervisors, role: { isActive: true, scopeLevel: "NATIONAL", permissions: { some: { permission: { code: "alerts:supervise" } } } } }, select: { id: true } })) recipients.add(u.id);
    if (!recipients.size) continue;
    const body = `Alerte ${g.number} : ${g.l1.size + g.l2} unité(s) sans prise en compte dans les délais.`;
    await prisma.notification.createMany({ data: [...recipients].map((userId) => ({ userId, kind: "ALERT" as const, title: ALERT_TITLE, body, href: "/alerts/supervision" })) });
  }
  return result;
}

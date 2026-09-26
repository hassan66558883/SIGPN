import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import type { Actor } from "@/server/auth/dal";
import { scopeSql } from "@/server/traffic/scope";

export type StatsRange = { from: Date; to: Date };

/** Default window: the last 12 calendar months including the current one. `to` is exclusive. */
export function defaultRange(now = new Date()): StatsRange {
  return { from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
}

export function monthKeys(r: StatsRange): string[] {
  const out: string[] = [];
  const d = new Date(r.from.getFullYear(), r.from.getMonth(), 1);
  while (d < r.to) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

type Row<T> = T[];
const raw = <T,>(sql: Prisma.Sql) => prisma.$queryRaw<Row<T>>(sql);

export type TrafficDashboard = Awaited<ReturnType<typeof trafficDashboard>>;

/**
 * Every figure is computed from the database inside the actor's scope (national / province / own
 * structures) — nothing is hard-coded. Cancelled PV and fines are excluded from counts and amounts.
 */
export async function trafficDashboard(actor: Actor, range: StatsRange = defaultRange()) {
  const { from, to } = range;
  const cScope = scopeSql(actor, "c");
  const tScope = scopeSql(actor, "t");
  const fScope = scopeSql(actor, "f");
  const ticketRange = Prisma.sql`t.status = 'ISSUED' AND ${tScope} AND t."issuedAt" >= ${from} AND t."issuedAt" < ${to}`;
  const fineRange = Prisma.sql`f.status <> 'CANCELLED' AND ${fScope} AND f."issuedAt" >= ${from} AND f."issuedAt" < ${to}`;

  const [controls, offenceLines, tickets, fines, fineStatus, payments, mControls, mOffences, mFines, mPayments, topOffences, byCategory, byClass, byStation, byZone, byProvince, byOfficer, topVehicles, repeatDrivers] = await Promise.all([
    raw<{ n: number }>(Prisma.sql`SELECT COUNT(*)::int AS n FROM "TrafficControl" c WHERE ${cScope} AND c."controlledAt" >= ${from} AND c."controlledAt" < ${to}`),
    raw<{ n: number }>(Prisma.sql`SELECT COUNT(*)::int AS n FROM "TrafficTicketOffence" o JOIN "TrafficTicket" t ON t.id = o."ticketId" WHERE ${ticketRange}`),
    raw<{ n: number }>(Prisma.sql`SELECT COUNT(*)::int AS n FROM "TrafficTicket" t WHERE ${ticketRange}`),
    raw<{ total: number; paid: number; unpaid: number; n: number }>(Prisma.sql`SELECT COALESCE(SUM(f."amountFcfa"),0)::float8 AS total, COALESCE(SUM(f."amountPaidFcfa"),0)::float8 AS paid, (COUNT(*) FILTER (WHERE f.status IN ('TO_PAY','PARTIALLY_PAID','PENDING','CONTESTED')))::int AS unpaid, COUNT(*)::int AS n FROM "TrafficFine" f WHERE ${fineRange}`),
    raw<{ status: string; n: number; amount: number }>(Prisma.sql`SELECT f.status::text AS status, COUNT(*)::int AS n, COALESCE(SUM(f."amountFcfa"),0)::float8 AS amount FROM "TrafficFine" f WHERE ${fScope} AND f."issuedAt" >= ${from} AND f."issuedAt" < ${to} GROUP BY f.status`),
    raw<{ total: number; n: number }>(Prisma.sql`SELECT COALESCE(SUM(p."amountFcfa"),0)::float8 AS total, COUNT(*)::int AS n FROM "TrafficPayment" p JOIN "TrafficFine" f ON f.id = p."fineId" WHERE p.status = 'COMPLETED' AND ${fScope} AND p."paidAt" >= ${from} AND p."paidAt" < ${to}`),
    raw<{ m: string; n: number }>(Prisma.sql`SELECT to_char(date_trunc('month', c."controlledAt"), 'YYYY-MM') AS m, COUNT(*)::int AS n FROM "TrafficControl" c WHERE ${cScope} AND c."controlledAt" >= ${from} AND c."controlledAt" < ${to} GROUP BY 1`),
    raw<{ m: string; n: number }>(Prisma.sql`SELECT to_char(date_trunc('month', t."issuedAt"), 'YYYY-MM') AS m, COUNT(*)::int AS n FROM "TrafficTicketOffence" o JOIN "TrafficTicket" t ON t.id = o."ticketId" WHERE ${ticketRange} GROUP BY 1`),
    raw<{ m: string; n: number }>(Prisma.sql`SELECT to_char(date_trunc('month', f."issuedAt"), 'YYYY-MM') AS m, COALESCE(SUM(f."amountFcfa"),0)::float8 AS n FROM "TrafficFine" f WHERE ${fineRange} GROUP BY 1`),
    raw<{ m: string; n: number }>(Prisma.sql`SELECT to_char(date_trunc('month', p."paidAt"), 'YYYY-MM') AS m, COALESCE(SUM(p."amountFcfa"),0)::float8 AS n FROM "TrafficPayment" p JOIN "TrafficFine" f ON f.id = p."fineId" WHERE p.status = 'COMPLETED' AND ${fScope} AND p."paidAt" >= ${from} AND p."paidAt" < ${to} GROUP BY 1`),
    raw<{ code: string; name: string; n: number }>(Prisma.sql`SELECT o.code, o.name, COUNT(*)::int AS n FROM "TrafficTicketOffence" o JOIN "TrafficTicket" t ON t.id = o."ticketId" WHERE ${ticketRange} GROUP BY o.code, o.name ORDER BY n DESC, o.code LIMIT 10`),
    raw<{ code: string; name: string; n: number }>(Prisma.sql`SELECT k.code, k.name, COUNT(*)::int AS n FROM "TrafficTicketOffence" o JOIN "TrafficTicket" t ON t.id = o."ticketId" JOIN "TrafficViolation" v ON v.id = o."violationId" JOIN "TrafficViolationCategory" k ON k.id = v."categoryId" WHERE ${ticketRange} GROUP BY k.code, k.name, k."sortOrder" ORDER BY k."sortOrder"`),
    raw<{ classText: string; n: number }>(Prisma.sql`SELECT o."classText" AS "classText", COUNT(*)::int AS n FROM "TrafficTicketOffence" o JOIN "TrafficTicket" t ON t.id = o."ticketId" WHERE ${ticketRange} GROUP BY o."classText" ORDER BY o."classText"`),
    raw<{ code: string; name: string; pv: number; amount: number }>(Prisma.sql`SELECT s.code, s.name, COUNT(*)::int AS pv, COALESCE(SUM(t."totalFineFcfa"),0)::float8 AS amount FROM "TrafficTicket" t JOIN "Station" s ON s.id = t."stationId" WHERE ${ticketRange} GROUP BY s.code, s.name ORDER BY pv DESC, s.code LIMIT 10`),
    raw<{ zone: string; n: number }>(Prisma.sql`SELECT COALESCE(cm.name, s.city, r.name) AS zone, COUNT(*)::int AS n FROM "TrafficTicket" t JOIN "Station" s ON s.id = t."stationId" LEFT JOIN "Commune" cm ON cm.id = s."communeId" JOIN "Region" r ON r.id = t."regionId" WHERE ${ticketRange} GROUP BY 1 ORDER BY n DESC, 1 LIMIT 10`),
    raw<{ province: string; n: number }>(Prisma.sql`SELECT r.name AS province, COUNT(*)::int AS n FROM "TrafficTicket" t JOIN "Region" r ON r.id = t."regionId" WHERE ${ticketRange} GROUP BY r.name ORDER BY n DESC, r.name LIMIT 10`),
    raw<{ id: string; firstName: string; lastName: string; n: number }>(Prisma.sql`SELECT u.id, u."firstName", u."lastName", COUNT(*)::int AS n FROM "TrafficTicket" t JOIN "User" u ON u.id = t."issuedById" WHERE ${ticketRange} GROUP BY u.id, u."firstName", u."lastName" ORDER BY n DESC, u."lastName" LIMIT 10`),
    raw<{ plate: string; n: number; amount: number }>(Prisma.sql`SELECT t."plateNumber" AS plate, COUNT(*)::int AS n, COALESCE(SUM(t."totalFineFcfa"),0)::float8 AS amount FROM "TrafficTicket" t WHERE t."plateNumber" IS NOT NULL AND ${ticketRange} GROUP BY t."plateNumber" ORDER BY n DESC, plate LIMIT 10`),
    raw<{ id: string; number: string; firstName: string; lastName: string; n: number }>(Prisma.sql`SELECT p.id, p.number, p."firstName", p."lastName", COUNT(*)::int AS n FROM "TrafficTicket" t JOIN "Person" p ON p.id = t."driverPersonId" WHERE ${ticketRange} GROUP BY p.id, p.number, p."firstName", p."lastName" HAVING COUNT(*) >= 2 ORDER BY n DESC, p."lastName" LIMIT 10`),
  ]);

  const months = monthKeys(range);
  const series = (rows: { m: string; n: number }[]) => months.map((m) => ({ month: m, value: rows.find((r) => r.m === m)?.n ?? 0 }));
  const totalFines = fines[0]?.total ?? 0;
  const totalPaid = fines[0]?.paid ?? 0;
  const statusMap = Object.fromEntries(fineStatus.map((s) => [s.status, s]));
  return {
    range,
    kpi: {
      controls: controls[0]?.n ?? 0,
      offences: offenceLines[0]?.n ?? 0,
      tickets: tickets[0]?.n ?? 0,
      fineCount: fines[0]?.n ?? 0,
      totalFinesFcfa: totalFines,
      paidFcfa: totalPaid,
      remainingFcfa: Math.max(0, totalFines - totalPaid),
      unpaidCount: fines[0]?.unpaid ?? 0,
      paymentsFcfa: payments[0]?.total ?? 0,
      paymentsCount: payments[0]?.n ?? 0,
      recoveryRate: totalFines > 0 ? Math.round((totalPaid / totalFines) * 1000) / 10 : null,
    },
    fineStatus: (["TO_PAY", "PARTIALLY_PAID", "PAID", "PENDING", "CONTESTED", "CANCELLED"] as const).map((status) => ({ status, count: statusMap[status]?.n ?? 0, amount: statusMap[status]?.amount ?? 0 })),
    monthly: { controls: series(mControls), offences: series(mOffences), fines: series(mFines), payments: series(mPayments) },
    topOffences,
    byCategory,
    byClass,
    byStation,
    byZone,
    byProvince,
    byOfficer,
    topVehicles,
    repeatDrivers,
  };
}

/** CSV export of the dashboard figures (traffic:export). Semicolon separated, UTF-8 BOM for spreadsheet software. */
export function dashboardToCsv(d: TrafficDashboard): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: string[] = [];
  const section = (title: string, header: string[], rows: (string | number)[][]) => {
    lines.push(esc(title));
    lines.push(header.map(esc).join(";"));
    for (const r of rows) lines.push(r.map(esc).join(";"));
    lines.push("");
  };
  section("Indicateurs", ["indicateur", "valeur"], [["contrôles", d.kpi.controls], ["infractions", d.kpi.offences], ["procès-verbaux", d.kpi.tickets], ["montant total des amendes (FCFA)", d.kpi.totalFinesFcfa], ["montant payé (FCFA)", d.kpi.paidFcfa], ["montant restant (FCFA)", d.kpi.remainingFcfa], ["amendes impayées", d.kpi.unpaidCount]]);
  section("Par mois", ["mois", "contrôles", "infractions", "amendes (FCFA)", "paiements (FCFA)"], d.monthly.controls.map((c, i) => [c.month, c.value, d.monthly.offences[i].value, d.monthly.fines[i].value, d.monthly.payments[i].value]));
  section("Infractions les plus fréquentes", ["code", "infraction", "nombre"], d.topOffences.map((o) => [o.code, o.name, o.n]));
  section("Par commissariat", ["code", "commissariat", "PV", "montant (FCFA)"], d.byStation.map((s) => [s.code, s.name, s.pv, s.amount]));
  section("Par agent", ["agent", "PV"], d.byOfficer.map((o) => [`${o.lastName} ${o.firstName}`, o.n]));
  return "﻿" + lines.join("\r\n");
}

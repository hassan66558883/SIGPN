import "server-only";
import { prisma } from "@/server/db";
import { AuthError } from "@/server/errors";
import { scopeWhere, type Actor } from "@/server/auth/dal";
import { cashWhere, dayKey, loadRevenueTx, monthKey, revenueDefaultRange, weekKey, type RevenueRange } from "@/server/traffic/cash-queries";
import { REPORT_KINDS, type ReportKind } from "@/server/traffic/cash-schemas";
import { TRAFFIC_PAYMENT_METHOD, TRAFFIC_FINE_STATUS, CASH_DEPOSIT_METHOD, CASH_DEPOSIT_STATUS, CASH_DISCREPANCY_STATUS, CASH_RECONCILIATION_STATUS, labelOf } from "@/lib/labels";

type Col = { key: string; fr: string; ar: string; kind: "text" | "int" | "money" | "date" };
type Row = Record<string, string | number>;
export type RevenueReport = { kind: ReportKind; titleFr: string; titleAr: string; columns: Col[]; rows: Row[]; totals: Row | null; range: RevenueRange; generatedAt: Date };

const C = (key: string, fr: string, ar: string, kind: Col["kind"] = "text"): Col => ({ key, fr, ar, kind });
const cAgent = C("agent", "Agent", "العون");
const cBadge = C("badge", "Matricule", "الرقم الوظيفي");
const cCount = C("count", "Paiements", "عدد الدفعات", "int");
const cCollected = C("collected", "Encaissé (FCFA)", "المحصَّل (فرنك)", "money");
const cDeposited = C("deposited", "Versé (FCFA)", "المسدَّد (فرنك)", "money");
const cValidated = C("validated", "Validé (FCFA)", "المصادَق عليه (فرنك)", "money");
const cGap = C("gap", "Écart (FCFA)", "الفارق (فرنك)", "money");
const METHODS = ["cash", "electronic", "mobileMoney", "other"] as const;
const methodCols = [C("cash", "Espèces", "نقداً", "money"), C("electronic", "Électronique", "إلكتروني", "money"), C("mobileMoney", "Mobile Money", "موبايل موني", "money"), C("other", "Autres", "أخرى", "money")];
const methodKey = (m: string) => (m === "CASH" ? "cash" : m === "ELECTRONIC" ? "electronic" : m === "MOBILE_MONEY" ? "mobileMoney" : "other");

export const REPORT_TITLES: Record<ReportKind, { fr: string; ar: string }> = {
  daily: { fr: "Rapport journalier des recettes", ar: "التقرير اليومي للإيرادات" },
  weekly: { fr: "Rapport hebdomadaire des recettes", ar: "التقرير الأسبوعي للإيرادات" },
  monthly: { fr: "Rapport mensuel des recettes", ar: "التقرير الشهري للإيرادات" },
  by_agent: { fr: "Rapport des recettes par agent", ar: "تقرير الإيرادات حسب العون" },
  by_unit: { fr: "Rapport des recettes par unité", ar: "تقرير الإيرادات حسب الوحدة" },
  by_commissariat: { fr: "Rapport des recettes par commissariat", ar: "تقرير الإيرادات حسب المفوضية" },
  by_province: { fr: "Rapport des recettes par province", ar: "تقرير الإيرادات حسب الولاية" },
  deposits: { fr: "Rapport des versements", ar: "تقرير التسديدات" },
  discrepancies: { fr: "Rapport des écarts de caisse", ar: "تقرير فوارق الصندوق" },
  collected_vs_deposited: { fr: "Rapport encaissé et versé", ar: "تقرير المحصَّل والمسدَّد" },
  by_method: { fr: "Rapport par mode de paiement", ar: "تقرير حسب طريقة الدفع" },
  unpaid_fines: { fr: "Rapport des amendes impayées", ar: "تقرير الغرامات غير المسددة" },
};

export function parseReportKind(v: string | undefined): ReportKind {
  return (REPORT_KINDS as readonly string[]).includes(v ?? "") ? (v as ReportKind) : "daily";
}

/** Range of a report: whole days, `to` exclusive. Defaults to the last 12 months (30 days for the daily report). */
export function reportRange(kind: ReportKind, from?: Date | null, to?: Date | null): RevenueRange {
  const now = new Date();
  const def = kind === "daily" ? { from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29), to: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) } : kind === "weekly" ? { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) } : revenueDefaultRange(now);
  const f = from ? new Date(new Date(from).setHours(0, 0, 0, 0)) : def.from;
  const t = to ? new Date(new Date(to).setHours(0, 0, 0, 0) + 86_400_000) : def.to;
  return { from: f, to: t > f ? t : new Date(f.getTime() + 86_400_000) };
}

type Group = { label: string; badge?: string; unit?: string; count: number; collected: number; cash: number; electronic: number; mobileMoney: number; other: number };
const blank = (label: string): Group => ({ label, count: 0, collected: 0, cash: 0, electronic: 0, mobileMoney: 0, other: 0 });

export async function buildReport(actor: Actor, kind: ReportKind, range: RevenueRange): Promise<RevenueReport> {
  if (!actor.permissions.has("cash:reports")) throw new AuthError("forbidden", "Permission cash:reports required");
  const scope = cashWhere(actor);
  const meta = { kind, titleFr: REPORT_TITLES[kind].fr, titleAr: REPORT_TITLES[kind].ar, range, generatedAt: new Date() };
  const sum = (rows: Row[], keys: string[]): Row => Object.fromEntries(keys.map((k) => [k, rows.reduce((a, r) => a + (Number(r[k]) || 0), 0)]));

  const timeReport = async (keyOf: (d: Date) => string, labelCol: Col): Promise<RevenueReport> => {
    const txs = await loadRevenueTx(actor, range);
    const m = new Map<string, Group>();
    for (const t of txs) {
      const k = keyOf(t.at);
      const g = m.get(k) ?? blank(k);
      g.count += 1;
      g.collected += t.amount;
      g[methodKey(t.method) as "cash"] += t.amount;
      m.set(k, g);
    }
    const rows = [...m.values()].sort((a, b) => a.label.localeCompare(b.label)).map((g) => ({ label: g.label, count: g.count, collected: g.collected, cash: g.cash, electronic: g.electronic, mobileMoney: g.mobileMoney, other: g.other }));
    return { ...meta, columns: [labelCol, cCount, cCollected, ...methodCols], rows, totals: { label: "Total", ...sum(rows, ["count", "collected", ...METHODS]) } };
  };

  if (kind === "daily") return timeReport(dayKey, C("label", "Jour", "اليوم", "date"));
  if (kind === "weekly") return timeReport(weekKey, C("label", "Semaine (du lundi)", "الأسبوع (من الاثنين)", "date"));
  if (kind === "monthly") return timeReport(monthKey, C("label", "Mois", "الشهر"));

  if (kind === "by_agent" || kind === "by_unit" || kind === "by_commissariat" || kind === "by_province") {
    const txs = await loadRevenueTx(actor, range);
    const m = new Map<string, Group>();
    for (const t of txs) {
      const k = kind === "by_agent" ? t.agentId : kind === "by_unit" ? t.stationId : kind === "by_commissariat" ? t.commissariat : t.province;
      const g = m.get(k) ?? { ...blank(kind === "by_agent" ? t.agentName : kind === "by_unit" ? `${t.stationName} (${t.stationCode})` : kind === "by_commissariat" ? t.commissariat : t.province), badge: t.badge ?? "—" };
      g.count += 1;
      g.collected += t.amount;
      m.set(k, g);
    }
    // deposited / validated amounts of the same period, attributed with the same key
    const deps = await prisma.trafficDeposit.findMany({ where: { AND: [{ ...(scope as object) }, { status: { not: "REJECTED" } }, { depositedAt: { gte: range.from, lt: range.to } }] }, select: { amountDepositedFcfa: true, status: true, agentId: true, stationId: true, station: { select: { name: true, parent: { select: { name: true } } } }, region: { select: { name: true } } } });
    const dep = new Map<string, { d: number; v: number }>();
    for (const d of deps) {
      const k = kind === "by_agent" ? d.agentId : kind === "by_unit" ? d.stationId : kind === "by_commissariat" ? (d.station.parent?.name ?? d.station.name) : d.region.name;
      const x = dep.get(k) ?? { d: 0, v: 0 };
      x.d += d.amountDepositedFcfa;
      if (d.status === "VALIDATED") x.v += d.amountDepositedFcfa;
      dep.set(k, x);
    }
    const rows = [...m.entries()].map(([k, g]) => ({ label: g.label, badge: g.badge ?? "—", count: g.count, collected: g.collected, deposited: dep.get(k)?.d ?? 0, validated: dep.get(k)?.v ?? 0, gap: g.collected - (dep.get(k)?.v ?? 0) })).sort((a, b) => b.collected - a.collected);
    const first = kind === "by_agent" ? C("label", "Agent", "العون") : kind === "by_unit" ? C("label", "Unité", "الوحدة") : kind === "by_commissariat" ? C("label", "Commissariat", "المفوضية") : C("label", "Province", "الولاية");
    const columns = kind === "by_agent" ? [first, cBadge, cCount, cCollected, cDeposited, cValidated, cGap] : [first, cCount, cCollected, cDeposited, cValidated, cGap];
    return { ...meta, columns, rows, totals: { label: "Total", ...sum(rows, ["count", "collected", "deposited", "validated", "gap"]) } };
  }

  if (kind === "by_method") {
    const txs = await loadRevenueTx(actor, range);
    const m = new Map<string, { n: number; total: number }>();
    for (const t of txs) {
      const x = m.get(t.method) ?? { n: 0, total: 0 };
      x.n += 1;
      x.total += t.amount;
      m.set(t.method, x);
    }
    const all = [...m.values()].reduce((a, x) => a + x.total, 0);
    const rows = [...m.entries()].map(([k, x]) => ({ label: labelOf(TRAFFIC_PAYMENT_METHOD, k, "fr").label, count: x.n, collected: x.total, share: all ? Math.round((x.total / all) * 1000) / 10 : 0 })).sort((a, b) => b.collected - a.collected);
    return { ...meta, columns: [C("label", "Mode de paiement", "طريقة الدفع"), cCount, cCollected, C("share", "Part (%)", "النسبة (%)", "int")], rows, totals: { label: "Total", ...sum(rows, ["count", "collected"]), share: 100 } };
  }

  if (kind === "deposits") {
    const deps = await prisma.trafficDeposit.findMany({ where: { AND: [scope as object, { depositedAt: { gte: range.from, lt: range.to } }] }, orderBy: { depositedAt: "desc" }, take: 5000, select: { number: true, depositedAt: true, method: true, slipNumber: true, reference: true, amountDueFcfa: true, amountDepositedFcfa: true, status: true, agentBadge: true, agent: { select: { firstName: true, lastName: true } }, station: { select: { name: true } }, slip: { select: { number: true } } } });
    const rows = deps.map((d) => ({ number: d.number, date: dayKey(d.depositedAt), agent: `${d.agent.lastName} ${d.agent.firstName}`, unit: d.station.name, method: labelOf(CASH_DEPOSIT_METHOD, d.method, "fr").label, slip: d.slip?.number ?? "—", reference: d.reference ?? d.slipNumber ?? "—", due: d.amountDueFcfa, deposited: d.amountDepositedFcfa, status: labelOf(CASH_DEPOSIT_STATUS, d.status, "fr").label }));
    const active = deps.filter((d) => d.status !== "REJECTED");
    return { ...meta, columns: [C("number", "Versement", "التسديد"), C("date", "Date", "التاريخ", "date"), cAgent, C("unit", "Unité", "الوحدة"), C("method", "Mode", "الطريقة"), C("slip", "Bordereau", "الوصل"), C("reference", "Référence", "المرجع"), C("due", "À verser (FCFA)", "المستحق (فرنك)", "money"), C("deposited", "Versé (FCFA)", "المسدَّد (فرنك)", "money"), C("status", "Statut", "الحالة")], rows, totals: { number: "Total (hors rejetés)", due: active.reduce((a, d) => a + d.amountDueFcfa, 0), deposited: active.reduce((a, d) => a + d.amountDepositedFcfa, 0) } };
  }

  if (kind === "discrepancies") {
    const ds = await prisma.trafficCashDiscrepancy.findMany({ where: { AND: [{ register: scope }, { createdAt: { gte: range.from, lt: range.to } }] }, orderBy: { createdAt: "desc" }, take: 5000, select: { number: true, createdAt: true, amountFcfa: true, status: true, reason: true, validatedAt: true, agent: { select: { firstName: true, lastName: true } }, register: { select: { number: true } }, validatedBy: { select: { firstName: true, lastName: true } } } });
    const rows = ds.map((d) => ({ number: d.number, date: dayKey(d.createdAt), agent: `${d.agent.lastName} ${d.agent.firstName}`, register: d.register.number, amount: d.amountFcfa, status: labelOf(CASH_DISCREPANCY_STATUS, d.status, "fr").label, reason: d.reason ?? "—", validatedBy: d.validatedBy ? `${d.validatedBy.lastName} ${d.validatedBy.firstName}` : "—", validatedAt: d.validatedAt ? dayKey(d.validatedAt) : "—" }));
    return { ...meta, columns: [C("number", "Écart", "الفارق"), C("date", "Date", "التاريخ", "date"), cAgent, C("register", "Caisse", "الصندوق"), C("amount", "Montant (FCFA)", "المبلغ (فرنك)", "money"), C("status", "Statut", "الحالة"), C("reason", "Motif", "السبب"), C("validatedBy", "Validé par", "صادق عليه"), C("validatedAt", "Le", "بتاريخ", "date")], rows, totals: { number: "Total", amount: ds.reduce((a, d) => a + d.amountFcfa, 0) } };
  }

  if (kind === "collected_vs_deposited") {
    const cs = await prisma.trafficRevenueCollection.findMany({ where: { AND: [scope as object, { periodTo: { gte: range.from, lt: range.to } }] }, orderBy: { periodTo: "desc" }, take: 5000, select: { number: true, periodTo: true, collectedFcfa: true, depositedFcfa: true, validatedFcfa: true, agent: { select: { firstName: true, lastName: true } }, station: { select: { name: true } }, reconciliation: { select: { status: true, gapFcfa: true } } } });
    const rows = cs.map((c) => ({ number: c.number, date: dayKey(c.periodTo), agent: `${c.agent.lastName} ${c.agent.firstName}`, unit: c.station.name, collected: c.collectedFcfa, deposited: c.depositedFcfa, validated: c.validatedFcfa, gap: c.collectedFcfa - c.validatedFcfa, status: c.reconciliation ? labelOf(CASH_RECONCILIATION_STATUS, c.reconciliation.status, "fr").label : "—" }));
    return { ...meta, columns: [C("number", "Recette", "الإيراد"), C("date", "Clôture", "الإقفال", "date"), cAgent, C("unit", "Unité", "الوحدة"), cCollected, cDeposited, cValidated, cGap, C("status", "Rapprochement", "المطابقة")], rows, totals: { number: "Total", ...sum(rows, ["collected", "deposited", "validated", "gap"]) } };
  }

  // unpaid_fines
  const fs = await prisma.trafficFine.findMany({ where: { AND: [scopeWhere(actor), { status: { in: ["TO_PAY", "PARTIALLY_PAID"] } }, { issuedAt: { gte: range.from, lt: range.to } }] }, orderBy: { issuedAt: "desc" }, take: 5000, select: { number: true, issuedAt: true, plateNumber: true, amountFcfa: true, amountPaidFcfa: true, status: true, ticket: { select: { number: true, status: true } }, station: { select: { name: true } } } });
  const open = fs.filter((f) => f.ticket.status === "ISSUED");
  const rows = open.map((f) => ({ number: f.number, pv: f.ticket.number, date: dayKey(f.issuedAt), plate: f.plateNumber ?? "—", unit: f.station.name, amount: f.amountFcfa, paid: f.amountPaidFcfa, remaining: f.amountFcfa - f.amountPaidFcfa, status: labelOf(TRAFFIC_FINE_STATUS, f.status, "fr").label }));
  return { ...meta, columns: [C("number", "Amende", "الغرامة"), C("pv", "PV", "المحضر"), C("date", "Émise le", "صدرت في", "date"), C("plate", "Immatriculation", "الترقيم"), C("unit", "Unité", "الوحدة"), C("amount", "Montant (FCFA)", "المبلغ (فرنك)", "money"), C("paid", "Payé (FCFA)", "المدفوع (فرنك)", "money"), C("remaining", "Reste (FCFA)", "المتبقي (فرنك)", "money"), C("status", "Statut", "الحالة")], rows, totals: { number: "Total", ...sum(rows, ["amount", "paid", "remaining"]) } };
}

export function reportToCsv(r: RevenueReport): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [esc(r.titleFr), esc(`Période : ${dayKey(r.range.from)} → ${dayKey(new Date(r.range.to.getTime() - 1))}`), "", r.columns.map((c) => esc(c.fr)).join(";")];
  for (const row of r.rows) lines.push(r.columns.map((c) => esc(row[c.key] ?? "")).join(";"));
  if (r.totals) lines.push(r.columns.map((c) => esc(r.totals?.[c.key] ?? "")).join(";"));
  return "﻿" + lines.join("\r\n");
}

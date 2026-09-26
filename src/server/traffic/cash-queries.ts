import "server-only";
import type { Prisma, TrafficCashRegisterStatus, TrafficDepositStatus, TrafficDiscrepancyStatus, TrafficReconciliationStatus, TrafficPaymentMethod } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { AuthError, NotFoundError } from "@/server/errors";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import { totalsOfRegister } from "@/server/traffic/cash";
import { TRAFFIC_LIST_PAGE_SIZE } from "@/server/traffic/schemas";

type Page = { page?: number; pageSize?: number };
const paging = (f: Page) => {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(f.pageSize ?? TRAFFIC_LIST_PAGE_SIZE, 100);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};
const ci = (v: string) => ({ contains: v, mode: "insensitive" as const });
const dayStart = (d?: Date | null) => (d ? new Date(new Date(d).setHours(0, 0, 0, 0)) : undefined);
const dayEnd = (d?: Date | null) => (d ? new Date(new Date(d).setHours(23, 59, 59, 999)) : undefined);
const userBrief = { select: { id: true, username: true, firstName: true, lastName: true } } as const;
const stationBrief = { select: { id: true, code: true, name: true } } as const;

/** Anyone with cash:view sees their scope; a field agent (cash:register) sees only their own registers and what stems from them. */
export function canViewCash(actor: Actor) {
  return actor.permissions.has("cash:view") || actor.permissions.has("cash:register");
}
export function cashWhere(actor: Actor): Prisma.TrafficCashRegisterWhereInput {
  if (actor.permissions.has("cash:view")) return scopeWhere(actor) as Prisma.TrafficCashRegisterWhereInput;
  if (actor.permissions.has("cash:register")) return { agentId: actor.id };
  throw new AuthError("forbidden", "Permission cash:view required");
}
/** Same rule for the entities that carry agentId/stationId/regionId themselves (collections, deposits). */
const ownWhere = (actor: Actor) => cashWhere(actor) as Prisma.TrafficRevenueCollectionWhereInput & Prisma.TrafficDepositWhereInput;
function canSee(actor: Actor, rec: { agentId: string; stationId: string; regionId: string }) {
  if (actor.permissions.has("cash:view") && inScope(actor, rec)) return true;
  return actor.permissions.has("cash:register") && rec.agentId === actor.id;
}

/* ------------------------------------------------------------------ registers */

export type RegisterFilter = Page & { q?: string; status?: TrafficCashRegisterStatus; from?: Date | null; to?: Date | null };

export async function listRegisters(actor: Actor, f: RegisterFilter = {}) {
  const { page, pageSize, skip, take } = paging(f);
  const q = f.q?.trim();
  const where: Prisma.TrafficCashRegisterWhereInput = {
    AND: [
      cashWhere(actor),
      f.status ? { status: f.status } : {},
      f.from || f.to ? { openedAt: { gte: dayStart(f.from), lte: dayEnd(f.to) } } : {},
      q ? { OR: [{ number: ci(q) }, { agentBadge: ci(q) }, { agent: { OR: [{ firstName: ci(q) }, { lastName: ci(q) }, { username: ci(q) }] } }, { station: { OR: [{ name: ci(q) }, { code: ci(q) }] } }] } : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.trafficCashRegister.findMany({
      where,
      orderBy: { openedAt: "desc" },
      skip,
      take,
      select: { id: true, number: true, status: true, openedAt: true, closedAt: true, agentBadge: true, openingBalanceFcfa: true, agent: userBrief, station: stationBrief, collection: { select: { collectedFcfa: true, depositedFcfa: true, validatedFcfa: true } }, _count: { select: { transactions: true } } },
    }),
    prisma.trafficCashRegister.count({ where }),
  ]);
  // Live collected amount for the registers that are still open (frozen in the closing statement afterwards).
  const openIds = items.filter((i) => i.status === "OPEN").map((i) => i.id);
  const live = openIds.length ? await prisma.trafficCashTransaction.groupBy({ by: ["registerId"], where: { registerId: { in: openIds }, voidedAt: null, payment: { status: "COMPLETED" } }, _sum: { amountFcfa: true }, _count: true }) : [];
  const liveMap = new Map(live.map((l) => [l.registerId, { sum: l._sum.amountFcfa ?? 0, n: l._count }]));
  return { items: items.map((i) => ({ ...i, collectedFcfa: i.collection?.collectedFcfa ?? liveMap.get(i.id)?.sum ?? 0, paymentsCount: i.status === "OPEN" ? (liveMap.get(i.id)?.n ?? 0) : i._count.transactions })), total, page, pageSize };
}

export async function getRegister(actor: Actor, id: string) {
  const reg = await prisma.trafficCashRegister.findUnique({
    where: { id },
    include: {
      agent: userBrief,
      closedBy: userBrief,
      blockedBy: userBrief,
      station: stationBrief,
      region: { select: { name: true } },
      closure: true,
      collection: { select: { id: true, number: true, collectedFcfa: true, depositedFcfa: true, validatedFcfa: true, status: true, verifiedAt: true, reconciliation: { select: { id: true, number: true, status: true, gapFcfa: true } } } },
      deposits: { orderBy: { createdAt: "desc" }, select: { id: true, number: true, status: true, amountDepositedFcfa: true, depositedAt: true, method: true } },
      transactions: { orderBy: { recordedAt: "asc" }, select: { id: true, amountFcfa: true, method: true, recordedAt: true, voidedAt: true, payment: { select: { id: true, number: true, status: true, transactionReference: true, provider: true, paymentPoint: true, paidAt: true, receipt: { select: { id: true, number: true } }, fine: { select: { id: true, number: true, amountFcfa: true, plateNumber: true, driverPerson: { select: { firstName: true, lastName: true } }, ticket: { select: { id: true, number: true } } } } } } } },
    },
  });
  if (!reg || !canSee(actor, reg)) throw new NotFoundError("TrafficCashRegister");
  const totals = await totalsOfRegister(reg.id);
  const deposited = reg.deposits.filter((d) => d.status !== "REJECTED").reduce((a, d) => a + d.amountDepositedFcfa, 0);
  return { ...reg, totals: { count: totals.count, collected: totals.collected, cash: totals.cash, electronic: totals.electronic, mobileMoney: totals.mobileMoney, other: totals.other, finesTotal: totals.finesTotal }, depositedFcfa: deposited };
}

/** The agent's current (open or blocked) register, or null. */
export async function myRegister(actor: Actor) {
  if (!actor.permissions.has("cash:register")) return null;
  const reg = await prisma.trafficCashRegister.findFirst({ where: { agentId: actor.id, status: { in: ["OPEN", "BLOCKED"] } }, orderBy: { openedAt: "desc" }, select: { id: true, number: true, status: true, openedAt: true, station: stationBrief, openingBalanceFcfa: true } });
  if (!reg) return null;
  const t = await totalsOfRegister(reg.id);
  return { ...reg, collected: t.collected, count: t.count };
}

/* ------------------------------------------------------------------ collections, closures */

export type CollectionFilter = Page & { q?: string; status?: string; from?: Date | null; to?: Date | null };

export async function listCollections(actor: Actor, f: CollectionFilter = {}) {
  const { page, pageSize, skip, take } = paging(f);
  const q = f.q?.trim();
  const where: Prisma.TrafficRevenueCollectionWhereInput = {
    AND: [
      ownWhere(actor),
      f.status ? { status: f.status as never } : {},
      f.from || f.to ? { periodTo: { gte: dayStart(f.from), lte: dayEnd(f.to) } } : {},
      q ? { OR: [{ number: ci(q) }, { register: { number: ci(q) } }, { register: { agentBadge: ci(q) } }, { agent: { OR: [{ firstName: ci(q) }, { lastName: ci(q) }] } }, { station: { OR: [{ name: ci(q) }, { code: ci(q) }] } }] } : {},
    ],
  };
  const [items, total, sums] = await Promise.all([
    prisma.trafficRevenueCollection.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, select: { id: true, number: true, status: true, periodFrom: true, periodTo: true, collectedFcfa: true, depositedFcfa: true, validatedFcfa: true, verifiedAt: true, agent: userBrief, station: stationBrief, register: { select: { id: true, number: true, agentBadge: true } }, closure: { select: { id: true, number: true } }, reconciliation: { select: { status: true, gapFcfa: true } } } }),
    prisma.trafficRevenueCollection.count({ where }),
    prisma.trafficRevenueCollection.aggregate({ where, _sum: { collectedFcfa: true, depositedFcfa: true, validatedFcfa: true } }),
  ]);
  return { items, total, page, pageSize, sumCollected: sums._sum.collectedFcfa ?? 0, sumDeposited: sums._sum.depositedFcfa ?? 0, sumValidated: sums._sum.validatedFcfa ?? 0 };
}

export async function getCollection(actor: Actor, id: string) {
  const c = await prisma.trafficRevenueCollection.findUnique({
    where: { id },
    include: {
      agent: userBrief,
      verifiedBy: userBrief,
      station: stationBrief,
      region: { select: { name: true } },
      register: { select: { id: true, number: true, status: true, agentBadge: true, openedAt: true } },
      closure: true,
      reconciliation: { include: { decidedBy: userBrief } },
      discrepancies: { orderBy: { createdAt: "desc" }, include: { validatedBy: userBrief } },
      deposits: { orderBy: { createdAt: "desc" }, select: { id: true, number: true, status: true, attempt: true, amountDepositedFcfa: true, depositedAt: true, method: true, slip: { select: { id: true, number: true } } } },
    },
  });
  if (!c || !canSee(actor, c)) throw new NotFoundError("TrafficRevenueCollection");
  return c;
}

export async function listClosures(actor: Actor, f: Page & { q?: string; from?: Date | null; to?: Date | null } = {}) {
  const { page, pageSize, skip, take } = paging(f);
  const q = f.q?.trim();
  const where: Prisma.TrafficDailyClosureWhereInput = {
    AND: [
      { register: cashWhere(actor) },
      f.from || f.to ? { closedAt: { gte: dayStart(f.from), lte: dayEnd(f.to) } } : {},
      q ? { OR: [{ number: ci(q) }, { register: { number: ci(q) } }, { register: { agentBadge: ci(q) } }, { register: { agent: { OR: [{ firstName: ci(q) }, { lastName: ci(q) }] } } }] } : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.trafficDailyClosure.findMany({ where, orderBy: { closedAt: "desc" }, skip, take, select: { id: true, number: true, closedAt: true, paymentsCount: true, collectedFcfa: true, cashFcfa: true, electronicFcfa: true, mobileMoneyFcfa: true, otherFcfa: true, register: { select: { id: true, number: true, status: true, agentBadge: true, agent: userBrief, station: stationBrief } } } }),
    prisma.trafficDailyClosure.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getClosure(actor: Actor, id: string) {
  const c = await prisma.trafficDailyClosure.findUnique({
    where: { id },
    include: {
      closedBy: userBrief,
      collection: { select: { id: true, number: true } },
      register: { select: { id: true, number: true, status: true, agentId: true, stationId: true, regionId: true, agentBadge: true, openedAt: true, openingBalanceFcfa: true, agent: userBrief, station: stationBrief, region: { select: { name: true } }, transactions: { orderBy: { recordedAt: "asc" }, select: { amountFcfa: true, method: true, voidedAt: true, payment: { select: { number: true, status: true, transactionReference: true, receipt: { select: { number: true } }, fine: { select: { number: true, ticket: { select: { number: true } } } } } } } } } },
    },
  });
  if (!c || !canSee(actor, c.register)) throw new NotFoundError("TrafficDailyClosure");
  return c;
}

/* ------------------------------------------------------------------ deposits, slips */

export type DepositFilter = Page & { q?: string; status?: TrafficDepositStatus; method?: string; from?: Date | null; to?: Date | null };

export async function listDeposits(actor: Actor, f: DepositFilter = {}) {
  const { page, pageSize, skip, take } = paging(f);
  const q = f.q?.trim();
  const where: Prisma.TrafficDepositWhereInput = {
    AND: [
      ownWhere(actor),
      f.status ? { status: f.status } : {},
      f.method ? { method: f.method as never } : {},
      f.from || f.to ? { depositedAt: { gte: dayStart(f.from), lte: dayEnd(f.to) } } : {},
      q ? { OR: [{ number: ci(q) }, { slipNumber: ci(q) }, { reference: ci(q) }, { slip: { number: ci(q) } }, { register: { number: ci(q) } }, { agentBadge: ci(q) }, { agent: { OR: [{ firstName: ci(q) }, { lastName: ci(q) }] } }] } : {},
    ],
  };
  const [items, total, sums] = await Promise.all([
    prisma.trafficDeposit.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, select: { id: true, number: true, status: true, method: true, attempt: true, depositedAt: true, collectedFcfa: true, amountDueFcfa: true, amountDepositedFcfa: true, agentBadge: true, agent: userBrief, station: stationBrief, register: { select: { id: true, number: true } }, slip: { select: { id: true, number: true } } } }),
    prisma.trafficDeposit.count({ where }),
    prisma.trafficDeposit.aggregate({ where: { AND: [where, { status: { not: "REJECTED" } }] }, _sum: { amountDepositedFcfa: true } }),
  ]);
  return { items, total, page, pageSize, sumDeposited: sums._sum.amountDepositedFcfa ?? 0 };
}

export async function getDeposit(actor: Actor, id: string) {
  const d = await prisma.trafficDeposit.findUnique({
    where: { id },
    include: {
      agent: userBrief,
      depositedBy: userBrief,
      receivedBy: userBrief,
      reviewedBy: userBrief,
      validatedBy: userBrief,
      station: stationBrief,
      region: { select: { name: true } },
      register: { select: { id: true, number: true, status: true } },
      collection: { select: { id: true, number: true, collectedFcfa: true, depositedFcfa: true, validatedFcfa: true, status: true, reconciliation: { select: { id: true, number: true, status: true, gapFcfa: true } } } },
      slip: { include: { issuedBy: userBrief } },
      attachmentDocument: { select: { id: true, title: true, versions: { orderBy: { version: "desc" }, take: 1, select: { fileName: true, mimeType: true, sizeBytes: true, sha256: true } } } },
      items: { orderBy: { amountFcfa: "desc" }, select: { amountFcfa: true, payment: { select: { id: true, number: true, method: true, transactionReference: true, receipt: { select: { id: true, number: true } }, fine: { select: { id: true, number: true, ticket: { select: { id: true, number: true } } } } } } } },
    },
  });
  if (!d || !canSee(actor, d)) throw new NotFoundError("TrafficDeposit");
  const previous = d.previousDepositId ? await prisma.trafficDeposit.findUnique({ where: { id: d.previousDepositId }, select: { id: true, number: true, status: true, reviewNote: true } }) : null;
  return { ...d, previous };
}

export async function listSlips(actor: Actor, f: Page & { q?: string } = {}) {
  const { page, pageSize, skip, take } = paging(f);
  const q = f.q?.trim();
  const where: Prisma.TrafficDepositReceiptWhereInput = { AND: [{ deposit: ownWhere(actor) }, q ? { OR: [{ number: ci(q) }, { deposit: { OR: [{ number: ci(q) }, { slipNumber: ci(q) }, { reference: ci(q) }, { agent: { OR: [{ firstName: ci(q) }, { lastName: ci(q) }] } }] } }] } : {}] };
  const [items, total] = await Promise.all([
    prisma.trafficDepositReceipt.findMany({ where, orderBy: { issuedAt: "desc" }, skip, take, select: { id: true, number: true, issuedAt: true, deposit: { select: { id: true, number: true, status: true, method: true, amountDepositedFcfa: true, agent: userBrief, station: stationBrief } } } }),
    prisma.trafficDepositReceipt.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getSlipForPdf(actor: Actor, depositId: string) {
  const d = await getDeposit(actor, depositId);
  if (!d.slip) throw new NotFoundError("TrafficDepositReceipt");
  return d;
}

/** Public verification of a deposit slip by QR code: never exposes anything about drivers, plates or receipts. */
export async function verifySlipByToken(token: string) {
  const s = await prisma.trafficDepositReceipt.findUnique({ where: { verificationToken: token }, include: { deposit: { select: { number: true, status: true, method: true, collectedFcfa: true, amountDueFcfa: true, amountDepositedFcfa: true, periodFrom: true, periodTo: true, depositedAt: true, agent: { select: { firstName: true, lastName: true } }, station: { select: { name: true } }, collection: { select: { validatedFcfa: true } } } } } });
  return s;
}

/* ------------------------------------------------------------------ reconciliation, discrepancies */

export async function listReconciliations(actor: Actor, f: Page & { q?: string; status?: TrafficReconciliationStatus } = {}) {
  const { page, pageSize, skip, take } = paging(f);
  const q = f.q?.trim();
  const where: Prisma.TrafficReconciliationWhereInput = { AND: [{ collection: ownWhere(actor) }, f.status ? { status: f.status } : {}, q ? { OR: [{ number: ci(q) }, { collection: { OR: [{ number: ci(q) }, { agent: { OR: [{ firstName: ci(q) }, { lastName: ci(q) }] } }] } }] } : {}] };
  const [items, total, sums] = await Promise.all([
    prisma.trafficReconciliation.findMany({ where, orderBy: { computedAt: "desc" }, skip, take, select: { id: true, number: true, status: true, collectedFcfa: true, depositedFcfa: true, validatedFcfa: true, gapFcfa: true, computedAt: true, collection: { select: { id: true, number: true, periodTo: true, agent: userBrief, station: stationBrief } } } }),
    prisma.trafficReconciliation.count({ where }),
    prisma.trafficReconciliation.aggregate({ where, _sum: { collectedFcfa: true, validatedFcfa: true, gapFcfa: true } }),
  ]);
  return { items, total, page, pageSize, sums: { collected: sums._sum.collectedFcfa ?? 0, validated: sums._sum.validatedFcfa ?? 0, gap: sums._sum.gapFcfa ?? 0 } };
}

export async function listDiscrepancies(actor: Actor, f: Page & { q?: string; status?: TrafficDiscrepancyStatus } = {}) {
  const { page, pageSize, skip, take } = paging(f);
  const q = f.q?.trim();
  const where: Prisma.TrafficCashDiscrepancyWhereInput = { AND: [{ register: cashWhere(actor) }, f.status ? { status: f.status } : {}, q ? { OR: [{ number: ci(q) }, { register: { number: ci(q) } }, { agent: { OR: [{ firstName: ci(q) }, { lastName: ci(q) }] } }] } : {}] };
  const [items, total, sums] = await Promise.all([
    prisma.trafficCashDiscrepancy.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, select: { id: true, number: true, status: true, amountFcfa: true, reason: true, createdAt: true, validatedAt: true, agent: userBrief, register: { select: { id: true, number: true, station: stationBrief } }, collection: { select: { id: true, number: true } } } }),
    prisma.trafficCashDiscrepancy.count({ where }),
    prisma.trafficCashDiscrepancy.aggregate({ where, _sum: { amountFcfa: true } }),
  ]);
  return { items, total, page, pageSize, sumAmount: sums._sum.amountFcfa ?? 0 };
}

export async function getDiscrepancy(actor: Actor, id: string) {
  const d = await prisma.trafficCashDiscrepancy.findUnique({
    where: { id },
    include: {
      agent: userBrief,
      validatedBy: userBrief,
      register: { select: { id: true, number: true, stationId: true, regionId: true, station: stationBrief } },
      collection: { select: { id: true, number: true, collectedFcfa: true, validatedFcfa: true } },
      reconciliation: { select: { id: true, number: true, status: true } },
      attachmentDocument: { select: { id: true, title: true, versions: { orderBy: { version: "desc" }, take: 1, select: { fileName: true, mimeType: true, sizeBytes: true } } } },
    },
  });
  if (!d || !(canSee(actor, { agentId: d.agentId, stationId: d.register.stationId, regionId: d.register.regionId }))) throw new NotFoundError("TrafficCashDiscrepancy");
  return d;
}

/* ------------------------------------------------------------------ search */

export type CashSearch = { q?: string; method?: TrafficPaymentMethod; status?: TrafficCashRegisterStatus; from?: Date | null; to?: Date | null; amount?: number; unit?: string };

/** Payments booked in registers and deposits matching the criteria (receipt, PV, fine, agent, badge, unit, deposit/slip, reference, date, method, status, amount). */
export async function searchRevenue(actor: Actor, s: CashSearch) {
  const q = s.q?.trim();
  const regWhere = cashWhere(actor);
  const unit = s.unit?.trim();
  const payments = await prisma.trafficCashTransaction.findMany({
    where: {
      AND: [
        { register: { AND: [regWhere, s.status ? { status: s.status } : {}, unit ? { OR: [{ station: { name: ci(unit) } }, { station: { code: ci(unit) } }, { station: { parent: { name: ci(unit) } } }] } : {}] } },
        s.method ? { method: s.method } : {},
        s.amount ? { amountFcfa: s.amount } : {},
        s.from || s.to ? { payment: { paidAt: { gte: dayStart(s.from), lte: dayEnd(s.to) } } } : {},
        q ? { OR: [{ payment: { OR: [{ number: ci(q) }, { transactionReference: ci(q) }, { receipt: { number: ci(q) } }, { fine: { OR: [{ number: ci(q) }, { plateNumber: ci(q) }, { ticket: { number: ci(q) } }] } }] } }, { register: { OR: [{ number: ci(q) }, { agentBadge: ci(q) }, { agent: { OR: [{ firstName: ci(q) }, { lastName: ci(q) }, { username: ci(q) }] } }] } }] } : {},
      ],
    },
    orderBy: { recordedAt: "desc" },
    take: 100,
    select: { id: true, amountFcfa: true, method: true, voidedAt: true, register: { select: { id: true, number: true, status: true, agentBadge: true, agent: userBrief, station: stationBrief } }, payment: { select: { id: true, number: true, paidAt: true, status: true, transactionReference: true, receipt: { select: { id: true, number: true } }, fine: { select: { id: true, number: true, ticket: { select: { id: true, number: true } } } } } } },
  });
  const deposits = q || s.amount
    ? await prisma.trafficDeposit.findMany({
        where: { AND: [ownWhere(actor), s.amount ? { amountDepositedFcfa: s.amount } : {}, s.from || s.to ? { depositedAt: { gte: dayStart(s.from), lte: dayEnd(s.to) } } : {}, q ? { OR: [{ number: ci(q) }, { slipNumber: ci(q) }, { reference: ci(q) }, { slip: { number: ci(q) } }, { register: { number: ci(q) } }] } : {}] },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, number: true, status: true, amountDepositedFcfa: true, depositedAt: true, method: true, agent: userBrief, slip: { select: { number: true } } },
      })
    : [];
  return { payments, deposits };
}

/* ------------------------------------------------------------------ dashboard */

export type RevenueRange = { from: Date; to: Date };

/** Default window: the current month and the 11 before it (`to` exclusive). */
export function revenueDefaultRange(now = new Date()): RevenueRange {
  return { from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
}

const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export function weekKey(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return dayKey(x);
}

export type RevenueTx = { amount: number; method: TrafficPaymentMethod; at: Date; agentId: string; agentName: string; badge: string | null; stationId: string; stationCode: string; stationName: string; commissariat: string; province: string; registerId: string };

/** Non-voided payments booked into registers of the actor's scope, by payment date. */
export async function loadRevenueTx(actor: Actor, range: RevenueRange): Promise<RevenueTx[]> {
  const rows = await prisma.trafficCashTransaction.findMany({
    where: { voidedAt: null, payment: { status: "COMPLETED", paidAt: { gte: range.from, lt: range.to } }, register: cashWhere(actor) },
    take: 200_000,
    select: { amountFcfa: true, method: true, registerId: true, payment: { select: { paidAt: true } }, register: { select: { agentId: true, agentBadge: true, agent: { select: { firstName: true, lastName: true } }, station: { select: { id: true, code: true, name: true, parent: { select: { name: true } } } }, region: { select: { name: true } } } } },
  });
  return rows.map((r) => ({ amount: r.amountFcfa, method: r.method, at: r.payment.paidAt, agentId: r.register.agentId, agentName: `${r.register.agent.lastName} ${r.register.agent.firstName}`, badge: r.register.agentBadge, stationId: r.register.station.id, stationCode: r.register.station.code, stationName: r.register.station.name, commissariat: r.register.station.parent?.name ?? r.register.station.name, province: r.register.region.name, registerId: r.registerId }));
}

export function monthsOf(range: RevenueRange): string[] {
  const out: string[] = [];
  const d = new Date(range.from.getFullYear(), range.from.getMonth(), 1);
  while (d < range.to) {
    out.push(monthKey(d));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

export type RevenueDashboard = Awaited<ReturnType<typeof revenueDashboard>>;

export async function revenueDashboard(actor: Actor, range: RevenueRange = revenueDefaultRange()) {
  if (!actor.permissions.has("cash:reports") && !actor.permissions.has("cash:view")) throw new AuthError("forbidden", "Permission cash:reports required");
  const scope = cashWhere(actor);
  const now = new Date();
  const todayFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const txs = await loadRevenueTx(actor, range);
  const [todayAgg, monthAgg, allAgg, depositedAgg, validatedAgg, depositsAll, pendingDeposits, regOpen, regClosed, regBlocked, discOpen, discAll, deposits] = await Promise.all([
    prisma.trafficCashTransaction.aggregate({ where: { voidedAt: null, payment: { status: "COMPLETED", paidAt: { gte: todayFrom } }, register: scope }, _sum: { amountFcfa: true }, _count: true }),
    prisma.trafficCashTransaction.aggregate({ where: { voidedAt: null, payment: { status: "COMPLETED", paidAt: { gte: monthFrom } }, register: scope }, _sum: { amountFcfa: true }, _count: true }),
    prisma.trafficCashTransaction.aggregate({ where: { voidedAt: null, payment: { status: "COMPLETED" }, register: scope }, _sum: { amountFcfa: true }, _count: true }),
    prisma.trafficDeposit.aggregate({ where: { AND: [ownWhere(actor), { status: { not: "REJECTED" } }] }, _sum: { amountDepositedFcfa: true } }),
    prisma.trafficDeposit.aggregate({ where: { AND: [ownWhere(actor), { status: "VALIDATED" }] }, _sum: { amountDepositedFcfa: true } }),
    prisma.trafficDeposit.count({ where: ownWhere(actor) }),
    prisma.trafficDeposit.count({ where: { AND: [ownWhere(actor), { status: { in: ["SUBMITTED", "VERIFIED", "JUSTIFICATION_REQUESTED"] } }] } }),
    prisma.trafficCashRegister.count({ where: { AND: [scope, { status: "OPEN" }] } }),
    prisma.trafficCashRegister.count({ where: { AND: [scope, { status: { in: ["CLOSED", "PENDING_DEPOSIT", "DEPOSITED", "VALIDATED"] } }] } }),
    prisma.trafficCashRegister.count({ where: { AND: [scope, { status: "BLOCKED" }] } }),
    prisma.trafficCashDiscrepancy.aggregate({ where: { AND: [{ register: scope }, { status: { in: ["OPEN", "JUSTIFIED", "REJECTED"] } }] }, _sum: { amountFcfa: true }, _count: true }),
    prisma.trafficCashDiscrepancy.aggregate({ where: { register: scope }, _sum: { amountFcfa: true }, _count: true }),
    prisma.trafficDeposit.findMany({ where: { AND: [ownWhere(actor), { status: { not: "REJECTED" } }, { depositedAt: { gte: range.from, lt: range.to } }] }, select: { amountDepositedFcfa: true, status: true, depositedAt: true, agentId: true, agent: { select: { firstName: true, lastName: true } }, stationId: true } }),
  ]);
  const collectedAll = allAgg._sum.amountFcfa ?? 0;
  const depositedAll = depositedAgg._sum.amountDepositedFcfa ?? 0;

  const months = monthsOf(range);
  const byMonth = new Map<string, number>();
  const depByMonth = new Map<string, number>();
  const byMethod = new Map<string, number>();
  const byAgent = new Map<string, { name: string; badge: string | null; total: number; n: number }>();
  const byUnit = new Map<string, { name: string; total: number }>();
  const byCommissariat = new Map<string, number>();
  const byProvince = new Map<string, number>();
  const byDay = new Map<string, number>();
  const dayFrom = new Date(Math.max(range.from.getTime(), Date.now() - 29 * 86_400_000));
  for (const t of txs) {
    byMonth.set(monthKey(t.at), (byMonth.get(monthKey(t.at)) ?? 0) + t.amount);
    byMethod.set(t.method, (byMethod.get(t.method) ?? 0) + t.amount);
    const a = byAgent.get(t.agentId) ?? { name: t.agentName, badge: t.badge, total: 0, n: 0 };
    a.total += t.amount;
    a.n += 1;
    byAgent.set(t.agentId, a);
    const u = byUnit.get(t.stationId) ?? { name: `${t.stationName}`, total: 0 };
    u.total += t.amount;
    byUnit.set(t.stationId, u);
    byCommissariat.set(t.commissariat, (byCommissariat.get(t.commissariat) ?? 0) + t.amount);
    byProvince.set(t.province, (byProvince.get(t.province) ?? 0) + t.amount);
    if (t.at >= dayFrom) byDay.set(dayKey(t.at), (byDay.get(dayKey(t.at)) ?? 0) + t.amount);
  }
  for (const d of deposits) depByMonth.set(monthKey(d.depositedAt), (depByMonth.get(monthKey(d.depositedAt)) ?? 0) + d.amountDepositedFcfa);
  const days: string[] = [];
  for (let d = new Date(dayFrom.getFullYear(), dayFrom.getMonth(), dayFrom.getDate()); d < range.to && d <= now; d.setDate(d.getDate() + 1)) days.push(dayKey(d));
  const rank = <T extends { total: number }>(m: Map<string, T>) => [...m.entries()].map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.total - a.total);
  const discByAgent = await prisma.trafficCashDiscrepancy.groupBy({ by: ["agentId"], where: { register: scope }, _sum: { amountFcfa: true }, _count: true, orderBy: { _sum: { amountFcfa: "desc" } }, take: 8 });
  const agentNames = discByAgent.length ? await prisma.user.findMany({ where: { id: { in: discByAgent.map((d) => d.agentId) } }, select: { id: true, firstName: true, lastName: true } }) : [];
  return {
    range,
    kpi: {
      collectedTotal: collectedAll,
      collectedToday: todayAgg._sum.amountFcfa ?? 0,
      collectedMonth: monthAgg._sum.amountFcfa ?? 0,
      paymentsTotal: allAgg._count,
      paymentsToday: todayAgg._count,
      paymentsMonth: monthAgg._count,
      depositedTotal: depositedAll,
      validatedTotal: validatedAgg._sum.amountDepositedFcfa ?? 0,
      remainingToDeposit: Math.max(0, collectedAll - depositedAll),
      depositsCount: depositsAll,
      depositsPending: pendingDeposits,
      registersOpen: regOpen,
      registersClosed: regClosed,
      registersBlocked: regBlocked,
      discrepanciesOpen: discOpen._count,
      discrepanciesOpenAmount: discOpen._sum.amountFcfa ?? 0,
      discrepanciesTotal: discAll._count,
      discrepanciesTotalAmount: discAll._sum.amountFcfa ?? 0,
    },
    monthly: months.map((m) => ({ month: m, collected: byMonth.get(m) ?? 0, deposited: depByMonth.get(m) ?? 0 })),
    daily: days.map((d) => ({ day: d, value: byDay.get(d) ?? 0 })),
    byMethod: [...byMethod.entries()].map(([method, total]) => ({ method, total })).sort((a, b) => b.total - a.total),
    byAgent: rank(byAgent).slice(0, 10),
    byUnit: rank(byUnit).slice(0, 10),
    byCommissariat: [...byCommissariat.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 10),
    byProvince: [...byProvince.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
    discrepancies: discByAgent.map((d) => { const u = agentNames.find((x) => x.id === d.agentId); return { agent: u ? `${u.lastName} ${u.firstName}` : "—", n: d._count, total: d._sum.amountFcfa ?? 0 }; }),
  };
}

/** CSV of the dashboard figures (cash:reports). */
export function revenueDashboardToCsv(d: RevenueDashboard): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: string[] = [];
  const section = (title: string, header: string[], rows: (string | number)[][]) => {
    lines.push(esc(title), header.map(esc).join(";"), ...rows.map((r) => r.map(esc).join(";")), "");
  };
  const k = d.kpi;
  section("Indicateurs", ["indicateur", "valeur"], [["recettes collectées (FCFA)", k.collectedTotal], ["encaissé aujourd'hui (FCFA)", k.collectedToday], ["encaissé ce mois (FCFA)", k.collectedMonth], ["total versé déclaré (FCFA)", k.depositedTotal], ["total versé validé (FCFA)", k.validatedTotal], ["restant à verser (FCFA)", k.remainingToDeposit], ["versements", k.depositsCount], ["versements en attente", k.depositsPending], ["caisses ouvertes", k.registersOpen], ["caisses clôturées", k.registersClosed], ["écarts à traiter", k.discrepanciesOpen], ["montant des écarts à traiter (FCFA)", k.discrepanciesOpenAmount]]);
  section("Par mois", ["mois", "encaissé (FCFA)", "versé (FCFA)"], d.monthly.map((m) => [m.month, m.collected, m.deposited]));
  section("Par mode de paiement", ["mode", "montant (FCFA)"], d.byMethod.map((m) => [m.method, m.total]));
  section("Par agent", ["agent", "matricule", "paiements", "montant (FCFA)"], d.byAgent.map((a) => [a.name, a.badge ?? "", a.n, a.total]));
  section("Par unité", ["unité", "montant (FCFA)"], d.byUnit.map((u) => [u.name, u.total]));
  section("Par province", ["province", "montant (FCFA)"], d.byProvince.map((p) => [p.name, p.total]));
  return "﻿" + lines.join("\r\n");
}

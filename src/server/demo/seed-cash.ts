/**
 * DEMO field-revenue data (idempotent, fictional): cash registers of the two demo field agents in every state of the
 * workflow — validated, deposited with a gap (open discrepancy), awaiting validation, closed and rejected, open. The
 * payments settle real unpaid demo fines (fine, receipt and payment records are created like the payment service does).
 * Runs only while no cash register exists.
 */
import { prisma } from "@/server/db";
import { randomToken, sha256 } from "@/server/crypto";
import { nextNumber } from "@/server/sequences";

type Method = "CASH" | "ELECTRONIC" | "MOBILE_MONEY" | "OTHER";
const daysAgo = (d: number, hour = 9) => {
  const x = new Date(Date.now() - d * 86_400_000);
  x.setHours(hour, 0, 0, 0);
  return x;
};

export async function seedCash() {
  if ((await prisma.trafficCashRegister.count()) > 0) return { registers: 0 };
  const users = await prisma.user.findMany({ where: { username: { in: ["traffic.cs1", "control.cs1", "unit.head", "finance.central"] } }, select: { id: true, username: true, stationId: true, regionId: true, officer: { select: { badgeNumber: true } } } });
  const u = Object.fromEntries(users.map((x) => [x.username, x]));
  const a1 = u["traffic.cs1"];
  const a2 = u["control.cs1"];
  const finance = u["finance.central"];
  if (!a1?.stationId || !a2?.stationId || !finance) return { registers: 0 };
  const station = await prisma.station.findUnique({ where: { id: a1.stationId }, select: { id: true, regionId: true } });
  if (!station) return { registers: 0 };
  const head = u["unit.head"] ?? finance;

  const fines = await prisma.trafficFine.findMany({ where: { status: "TO_PAY", stationId: station.id, ticket: { status: "ISSUED" } }, orderBy: { issuedAt: "asc" }, take: 40, select: { id: true, amountFcfa: true } });
  let cursor = 0;
  const nextFine = () => fines[cursor++];
  if (fines.length < 15) return { registers: 0 };

  type Pay = { paymentId: string; amount: number; method: Method };
  async function openRegister(agent: typeof a1, openedAt: Date): Promise<string> {
    const r = await prisma.trafficCashRegister.create({ data: { number: await nextNumber("CASH_REGISTER", prisma), agentId: agent.id, agentBadge: agent.officer?.badgeNumber ?? null, stationId: station!.id, regionId: station!.regionId, openedAt, openingBalanceFcfa: 0, status: "OPEN" }, select: { id: true } });
    return r.id;
  }
  async function collect(registerId: string, agent: typeof a1, when: Date, method: Method, n: number): Promise<Pay[]> {
    const out: Pay[] = [];
    for (let i = 0; i < n; i++) {
      const fine = nextFine();
      const paidAt = new Date(when.getTime() + i * 25 * 60_000);
      const ref = method === "CASH" ? null : `${method === "MOBILE_MONEY" ? "MM" : "EL"}-${paidAt.getTime().toString().slice(-8)}${i}`;
      const pay = await prisma.trafficPayment.create({ data: { number: await nextNumber("TRAFFIC_PAYMENT", prisma), fineId: fine.id, amountFcfa: fine.amountFcfa, method, provider: method === "MOBILE_MONEY" ? "Airtel Money (démo)" : method === "ELECTRONIC" ? "Terminal de paiement (démo)" : null, transactionReference: ref, paidAt, receivedById: agent.id, stationId: station!.id, paymentPoint: "Poste de contrôle (démo)" }, select: { id: true } });
      await prisma.trafficReceipt.create({ data: { number: await nextNumber("TRAFFIC_RECEIPT", prisma), verificationToken: randomToken(18), paymentId: pay.id, fineId: fine.id, amountFcfa: fine.amountFcfa, issuedAt: paidAt, issuedById: agent.id } });
      await prisma.trafficFine.update({ where: { id: fine.id }, data: { amountPaidFcfa: fine.amountFcfa, status: "PAID", paidAt } });
      await prisma.trafficCashTransaction.create({ data: { registerId, paymentId: pay.id, amountFcfa: fine.amountFcfa, method, recordedAt: paidAt } });
      out.push({ paymentId: pay.id, amount: fine.amountFcfa, method });
    }
    return out;
  }
  async function closeRegister(registerId: string, agent: typeof a1, pays: Pay[], closedAt: Date) {
    const sum = (f: (m: Method) => boolean) => pays.filter((p) => f(p.method)).reduce((a, p) => a + p.amount, 0);
    const collected = pays.reduce((a, p) => a + p.amount, 0);
    const reg = await prisma.trafficCashRegister.findUniqueOrThrow({ where: { id: registerId }, select: { openedAt: true } });
    const receipts = await prisma.trafficReceipt.findMany({ where: { paymentId: { in: pays.map((p) => p.paymentId) } }, select: { number: true, fine: { select: { ticket: { select: { number: true } } } } } });
    const closure = await prisma.trafficDailyClosure.create({
      data: { number: await nextNumber("CASH_CLOSURE", prisma), registerId, paymentsCount: pays.length, finesTotalFcfa: collected, collectedFcfa: collected, cashFcfa: sum((m) => m === "CASH"), electronicFcfa: sum((m) => m === "ELECTRONIC"), mobileMoneyFcfa: sum((m) => m === "MOBILE_MONEY"), otherFcfa: sum((m) => m === "OTHER"), amountToDepositFcfa: collected, receiptNumbers: receipts.map((r) => r.number), ticketNumbers: receipts.map((r) => r.fine.ticket.number), closedById: agent.id, closedAt },
      select: { id: true },
    });
    const collection = await prisma.trafficRevenueCollection.create({ data: { number: await nextNumber("CASH_COLLECTION", prisma), registerId, closureId: closure.id, agentId: agent.id, stationId: station!.id, regionId: station!.regionId, periodFrom: reg.openedAt, periodTo: closedAt, collectedFcfa: collected }, select: { id: true } });
    const rec = await prisma.trafficReconciliation.create({ data: { number: await nextNumber("CASH_RECONCILIATION", prisma), collectionId: collection.id, collectedFcfa: collected, depositedFcfa: 0, validatedFcfa: 0, gapFcfa: collected, status: "PENDING" }, select: { id: true } });
    await prisma.trafficCashRegister.update({ where: { id: registerId }, data: { status: "CLOSED", closedAt, closedById: agent.id } });
    return { collectionId: collection.id, recId: rec.id, collected, closureId: closure.id };
  }
  async function deposit(c: { collectionId: string; collected: number }, registerId: string, agent: typeof a1, pays: Pay[], amount: number, status: "SUBMITTED" | "VERIFIED" | "VALIDATED" | "REJECTED", at: Date, method: "BANK" | "TREASURY" | "CENTRAL_CASH", attempt = 1, previous?: string) {
    const number = await nextNumber("CASH_DEPOSIT", prisma);
    const reg = await prisma.trafficCashRegister.findUniqueOrThrow({ where: { id: registerId }, select: { openedAt: true, closedAt: true } });
    const ref = method === "BANK" ? `BQ-${at.getTime().toString().slice(-8)}` : null;
    const d = await prisma.trafficDeposit.create({
      data: {
        number, collectionId: c.collectionId, registerId, agentId: agent.id, agentBadge: agent.officer?.badgeNumber ?? null, stationId: station!.id, regionId: station!.regionId, periodFrom: reg.openedAt, periodTo: reg.closedAt ?? at, collectedFcfa: c.collected, amountDueFcfa: c.collected, amountDepositedFcfa: amount, method,
        slipNumber: method === "CENTRAL_CASH" ? null : `BV-${at.getTime().toString().slice(-6)}`, reference: ref, recipient: method === "BANK" ? "Banque commerciale (démo)" : method === "TREASURY" ? "Trésor public (démo)" : "Caisse centrale de la Police (démo)", depositedAt: at, depositedById: agent.id,
        observations: amount < c.collected ? "Versement inférieur à la recette : manquant constaté à la remise (démo)." : null, status, attempt, previousDepositId: previous ?? null,
        ...(status === "REJECTED" ? { reviewedById: head.id, reviewedAt: new Date(at.getTime() + 3_600_000), reviewNote: "Bordereau bancaire illisible : représenter la pièce justificative." } : {}),
        ...(status === "VERIFIED" || status === "VALIDATED" ? { reviewedById: head.id, reviewedAt: new Date(at.getTime() + 3_600_000), receivedById: head.id } : {}),
        ...(status === "VALIDATED" ? { validatedById: finance.id, validatedAt: new Date(at.getTime() + 7_200_000) } : {}),
      },
      select: { id: true, number: true },
    });
    await prisma.trafficDepositItem.createMany({ data: pays.map((p) => ({ depositId: d.id, paymentId: p.paymentId, amountFcfa: p.amount })) });
    const slipNo = await nextNumber("CASH_SLIP", prisma);
    await prisma.trafficDepositReceipt.create({ data: { number: slipNo, verificationToken: randomToken(18), depositId: d.id, contentHash: sha256(`${d.number}|${slipNo}|${amount}`), issuedAt: at, issuedById: agent.id } });
    return d.id;
  }
  const setCollection = (id: string, deposited: number, validated: number, status: "TO_DEPOSIT" | "PARTIALLY_DEPOSITED" | "DEPOSITED" | "VALIDATED") => prisma.trafficRevenueCollection.update({ where: { id }, data: { depositedFcfa: deposited, validatedFcfa: validated, status } });

  // A — traffic.cs1, 20 days ago: complete, validated, reconciled to zero.
  {
    const rid = await openRegister(a1, daysAgo(20, 7));
    const pays = [...(await collect(rid, a1, daysAgo(20, 8), "CASH", 3)), ...(await collect(rid, a1, daysAgo(20, 11), "MOBILE_MONEY", 1)), ...(await collect(rid, a1, daysAgo(20, 14), "ELECTRONIC", 1))];
    const c = await closeRegister(rid, a1, pays, daysAgo(20, 17));
    await deposit(c, rid, a1, pays, c.collected, "VALIDATED", daysAgo(19, 9), "BANK");
    await setCollection(c.collectionId, c.collected, c.collected, "VALIDATED");
    await prisma.trafficReconciliation.update({ where: { id: c.recId }, data: { depositedFcfa: c.collected, validatedFcfa: c.collected, gapFcfa: 0, status: "VALIDATED", decidedById: finance.id, decidedAt: daysAgo(19, 12) } });
    await prisma.trafficCashRegister.update({ where: { id: rid }, data: { status: "VALIDATED" } });
  }
  // B — control.cs1, 9 days ago: a shortfall was deposited and validated → gap to justify (open discrepancy).
  {
    const rid = await openRegister(a2, daysAgo(9, 7));
    const pays = [...(await collect(rid, a2, daysAgo(9, 8), "CASH", 2)), ...(await collect(rid, a2, daysAgo(9, 12), "MOBILE_MONEY", 1))];
    const c = await closeRegister(rid, a2, pays, daysAgo(9, 17));
    const amount = Math.floor((c.collected * 0.8) / 100) * 100;
    await deposit(c, rid, a2, pays, amount, "VALIDATED", daysAgo(8, 9), "TREASURY");
    await setCollection(c.collectionId, amount, amount, "DEPOSITED");
    await prisma.trafficReconciliation.update({ where: { id: c.recId }, data: { depositedFcfa: amount, validatedFcfa: amount, gapFcfa: c.collected - amount, status: "GAP_TO_JUSTIFY" } });
    await prisma.trafficCashDiscrepancy.create({ data: { number: await nextNumber("CASH_DISCREPANCY", prisma), reconciliationId: c.recId, collectionId: c.collectionId, registerId: rid, agentId: a2.id, amountFcfa: c.collected - amount, status: "OPEN", createdAt: daysAgo(8, 10) } });
    await prisma.trafficCashRegister.update({ where: { id: rid }, data: { status: "DEPOSITED" } });
  }
  // C — traffic.cs1, 4 days ago: deposit rejected once, then re-submitted and awaiting verification.
  {
    const rid = await openRegister(a1, daysAgo(4, 7));
    const pays = [...(await collect(rid, a1, daysAgo(4, 9), "CASH", 2)), ...(await collect(rid, a1, daysAgo(4, 13), "ELECTRONIC", 1))];
    const c = await closeRegister(rid, a1, pays, daysAgo(4, 17));
    const first = await deposit(c, rid, a1, pays, c.collected, "REJECTED", daysAgo(3, 9), "BANK");
    await deposit(c, rid, a1, pays, c.collected, "SUBMITTED", daysAgo(2, 9), "BANK", 2, first);
    await setCollection(c.collectionId, c.collected, 0, "DEPOSITED");
    await prisma.trafficCashRegister.update({ where: { id: rid }, data: { status: "PENDING_DEPOSIT" } });
  }
  // D — control.cs1, 2 days ago: closed, nothing deposited yet.
  {
    const rid = await openRegister(a2, daysAgo(2, 7));
    const pays = await collect(rid, a2, daysAgo(2, 10), "CASH", 2);
    await closeRegister(rid, a2, pays, daysAgo(2, 17));
  }
  // E — traffic.cs1, today: open register with two collections.
  {
    const rid = await openRegister(a1, daysAgo(0, 6));
    await collect(rid, a1, daysAgo(0, 7), "CASH", 1);
    await collect(rid, a1, daysAgo(0, 8), "MOBILE_MONEY", 1);
  }
  return { registers: 5 };
}

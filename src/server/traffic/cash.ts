import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma, type Db } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError, NotFoundError } from "@/server/errors";
import { inScope, type Actor } from "@/server/auth/dal";
import { randomToken, sha256 } from "@/server/crypto";
import { notifyPermission } from "@/server/notifications";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import { saveUpload } from "@/server/storage";
import { resolveTrafficStation } from "@/server/traffic/scope";
import { getTrafficSettings } from "@/server/traffic/settings";
import type {
  BlockRegisterInput,
  CloseRegisterInput,
  DepositInput,
  DepositRespondInput,
  DepositReviewInput,
  DiscrepancyActionInput,
  OpenRegisterInput,
  ReconciliationActionInput,
} from "@/server/traffic/cash-schemas";

/**
 * Field revenue: cash register of a collecting agent → daily closing → revenue collection → deposit →
 * reconciliation. Three amounts are never mixed up: collected (sum of the register's payments, frozen at
 * closing), deposited (declared by the agent, capped by the collected amount) and validated (accepted
 * by the finance manager). The gap is collected − validated and is never deleted, only justified.
 */

const MODULE = "traffic_cash";
const ACTIVE_DEPOSIT: Prisma.TrafficDepositWhereInput = { status: { in: ["SUBMITTED", "VERIFIED", "JUSTIFICATION_REQUESTED", "VALIDATED"] } };
const ATTACHMENT_MIME = /^(image\/(jpeg|png|webp|heic)|application\/pdf)$/;
const fcfa = (n: number) => `${n} FCFA`;
const nul = (v: string | undefined | null) => (v ? v : null);

type AuditArgs = { actor: Actor; action: string; entityType: string; entityId: string; label: string; summary: string; before?: Record<string, unknown>; after?: Record<string, unknown>; ctx: RequestContext };
/** Every financial event records who (username + role), when, from where (IP), the old and the new value and the operation reference. */
function audit(a: AuditArgs, tx: Db) {
  return logAudit({ actor: a.actor, action: a.action, module: MODULE, entityType: a.entityType, entityId: a.entityId, entityLabel: a.label, summary: a.summary, before: { ...a.before, reference: a.label, role: a.actor.roleCode }, after: { ...a.after, reference: a.label, role: a.actor.roleCode }, context: a.ctx }, tx);
}

export function need(actor: Actor, permission: Parameters<Actor["permissions"]["has"]>[0]) {
  if (!actor.permissions.has(permission)) throw new AuthError("forbidden", `Permission ${permission} required`);
}

async function lockRow(tx: Db, table: "TrafficCashRegister" | "TrafficRevenueCollection" | "TrafficDeposit", id: string) {
  await tx.$queryRawUnsafe(`SELECT id FROM "${table}" WHERE id = $1 FOR UPDATE`, id);
}

async function agentBadge(userId: string): Promise<string | null> {
  const o = await prisma.officer.findUnique({ where: { userId }, select: { badgeNumber: true } });
  return o?.badgeNumber ?? null;
}

async function saveAttachment(actor: Actor, file: File | null, title: string, stationId: string, tx: Db, upload: Awaited<ReturnType<typeof saveUpload>> | null): Promise<string | null> {
  if (!file || !upload) return null;
  const doc = await tx.document.create({ data: { title, entityType: "TRAFFIC_DEPOSIT", entityId: null, category: "SCAN", uploadedById: actor.id, stationId } });
  await tx.documentVersion.create({ data: { documentId: doc.id, version: 1, fileName: file.name, mimeType: upload.mimeType, sizeBytes: upload.size, storagePath: upload.relPath, sha256: upload.sha256, uploadedById: actor.id } });
  return doc.id;
}

async function prepareUpload(file: File | null) {
  if (!file || file.size === 0) return null;
  if (!ATTACHMENT_MIME.test(file.type)) throw new BusinessError("Only photos (JPEG, PNG, WebP, HEIC) and PDF documents are accepted as supporting documents.");
  return saveUpload("traffic", file);
}

/* ------------------------------------------------------------------ cash register */

export async function openRegister(actor: Actor, input: OpenRegisterInput, ctx: RequestContext) {
  need(actor, "cash:register");
  const station = await resolveTrafficStation(actor, null);
  const blocked = await prisma.trafficCashRegister.findFirst({ where: { agentId: actor.id, status: "BLOCKED" }, select: { number: true } });
  if (blocked) throw new BusinessError(`Your cash register ${blocked.number} is blocked: contact your unit head or the finance manager.`, "STATE");
  const open = await prisma.trafficCashRegister.findFirst({ where: { agentId: actor.id, status: "OPEN" }, select: { number: true } });
  if (open) throw new BusinessError(`You already have an open cash register (${open.number}): close it before opening a new one.`, "STATE");
  const badge = await agentBadge(actor.id);
  try {
    return await prisma.$transaction(async (tx) => {
      const number = await nextNumber("CASH_REGISTER", tx);
      const reg = await tx.trafficCashRegister.create({ data: { number, agentId: actor.id, agentBadge: badge, stationId: station.id, regionId: station.regionId, openingBalanceFcfa: input.openingBalanceFcfa, notes: nul(input.notes) }, select: { id: true, number: true } });
      await audit({ actor, action: "TRAFFIC_CASH_REGISTER_OPENED", entityType: "TrafficCashRegister", entityId: reg.id, label: reg.number, summary: `Cash register ${reg.number} opened by ${actor.username} (${station.code}), opening balance ${fcfa(input.openingBalanceFcfa)}`, after: { status: "OPEN", openingBalanceFcfa: input.openingBalanceFcfa }, ctx }, tx);
      return reg;
    });
  } catch (e) {
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") throw new BusinessError("You already have an open cash register.", "CONFLICT");
    throw e;
  }
}

/**
 * Used by the payment service: a field agent must collect into an OPEN register of their own. Returns the register to
 * attach the payment to, or null for a payment recorded at a central cash desk (no register involved).
 */
export async function registerForCollection(actor: Actor): Promise<{ id: string } | null> {
  const field = actor.permissions.has("cash:collect");
  const regs = await prisma.trafficCashRegister.findMany({ where: { agentId: actor.id, status: { in: ["OPEN", "BLOCKED"] } }, select: { id: true, status: true, number: true } });
  const open = regs.find((r) => r.status === "OPEN");
  if (field && !actor.permissions.has("traffic:payment_record")) {
    if (open) return { id: open.id };
    if (regs.some((r) => r.status === "BLOCKED")) throw new BusinessError("Your cash register is blocked: no collection is possible.", "STATE");
    throw new BusinessError("Open your cash register before collecting a payment.", "STATE");
  }
  if (open && field) return { id: open.id };
  if (regs.some((r) => r.status === "BLOCKED") && field) throw new BusinessError("Your cash register is blocked: no collection is possible.", "STATE");
  return null;
}

/** Inside the payment transaction: locks the register, checks it is still OPEN and books the payment (once). */
export async function bookPayment(tx: Db, registerId: string, payment: { id: string; amountFcfa: number; method: "CASH" | "ELECTRONIC" | "MOBILE_MONEY" | "BANK_TRANSFER" | "OTHER" }) {
  await lockRow(tx, "TrafficCashRegister", registerId);
  const reg = await tx.trafficCashRegister.findUnique({ where: { id: registerId }, select: { status: true } });
  if (!reg || reg.status !== "OPEN") throw new BusinessError("The cash register is closed: no new operation can be recorded.", "STATE");
  await tx.trafficCashTransaction.create({ data: { registerId, paymentId: payment.id, amountFcfa: payment.amountFcfa, method: payment.method } });
}

/** A payment sitting in a closed register can no longer be voided (correction goes through the discrepancy process). */
export async function assertPaymentEditable(paymentId: string) {
  const tx = await prisma.trafficCashTransaction.findUnique({ where: { paymentId }, select: { register: { select: { status: true, number: true } } } });
  if (tx && tx.register.status !== "OPEN") throw new BusinessError(`The payment belongs to cash register ${tx.register.number}, which is closed: it can no longer be modified.`, "STATE");
}

export async function totalsOfRegister(registerId: string, db: Db = prisma) {
  const rows = await db.trafficCashTransaction.findMany({
    where: { registerId, voidedAt: null, payment: { status: "COMPLETED" } },
    select: { amountFcfa: true, method: true, payment: { select: { id: true, number: true, fineId: true, receipt: { select: { number: true } }, fine: { select: { amountFcfa: true, ticket: { select: { number: true } } } } } } },
  });
  const sum = (f: (m: string) => boolean) => rows.filter((r) => f(r.method)).reduce((a, r) => a + r.amountFcfa, 0);
  const fines = new Map(rows.map((r) => [r.payment.fineId, r.payment.fine]));
  return {
    rows,
    count: rows.length,
    collected: rows.reduce((a, r) => a + r.amountFcfa, 0),
    cash: sum((m) => m === "CASH"),
    electronic: sum((m) => m === "ELECTRONIC"),
    mobileMoney: sum((m) => m === "MOBILE_MONEY"),
    other: sum((m) => m === "OTHER" || m === "BANK_TRANSFER"),
    finesTotal: [...fines.values()].reduce((a, f) => a + f.amountFcfa, 0),
    receiptNumbers: rows.map((r) => r.payment.receipt?.number).filter((n): n is string => !!n),
    ticketNumbers: [...new Set([...fines.values()].map((f) => f.ticket.number))],
  };
}

export async function closeRegister(actor: Actor, input: CloseRegisterInput, ctx: RequestContext) {
  need(actor, "cash:register");
  const reg = await prisma.trafficCashRegister.findUnique({ where: { id: input.registerId }, select: { id: true, number: true, agentId: true, status: true, stationId: true, regionId: true, openedAt: true, agentBadge: true } });
  if (!reg || reg.agentId !== actor.id) throw new NotFoundError("TrafficCashRegister");
  return prisma.$transaction(async (tx) => {
    await lockRow(tx, "TrafficCashRegister", reg.id);
    const fresh = await tx.trafficCashRegister.findUnique({ where: { id: reg.id }, select: { status: true } });
    if (fresh?.status !== "OPEN") throw new BusinessError("This cash register is not open.", "STATE");
    const totals = await totalsOfRegister(reg.id, tx);
    const closedAt = new Date();
    const number = await nextNumber("CASH_CLOSURE", tx);
    const closure = await tx.trafficDailyClosure.create({
      data: { number, registerId: reg.id, paymentsCount: totals.count, finesTotalFcfa: totals.finesTotal, collectedFcfa: totals.collected, cashFcfa: totals.cash, electronicFcfa: totals.electronic, mobileMoneyFcfa: totals.mobileMoney, otherFcfa: totals.other, amountToDepositFcfa: totals.collected, receiptNumbers: totals.receiptNumbers, ticketNumbers: totals.ticketNumbers, closedById: actor.id, closedAt, notes: nul(input.notes) },
      select: { id: true, number: true },
    });
    let collection: { id: string; number: string } | null = null;
    if (totals.collected > 0) {
      collection = await tx.trafficRevenueCollection.create({
        data: { number: await nextNumber("CASH_COLLECTION", tx), registerId: reg.id, closureId: closure.id, agentId: reg.agentId, stationId: reg.stationId, regionId: reg.regionId, periodFrom: reg.openedAt, periodTo: closedAt, collectedFcfa: totals.collected },
        select: { id: true, number: true },
      });
      await tx.trafficReconciliation.create({ data: { number: await nextNumber("CASH_RECONCILIATION", tx), collectionId: collection.id, collectedFcfa: totals.collected, depositedFcfa: 0, validatedFcfa: 0, gapFcfa: totals.collected, status: "PENDING" } });
    }
    await tx.trafficCashRegister.update({ where: { id: reg.id }, data: { status: "CLOSED", closedAt, closedById: actor.id, notes: nul(input.notes) ?? undefined } });
    await audit({ actor, action: "TRAFFIC_CASH_REGISTER_CLOSED", entityType: "TrafficCashRegister", entityId: reg.id, label: reg.number, summary: `Cash register ${reg.number} closed: ${totals.count} payment(s), ${fcfa(totals.collected)} collected (cash ${fcfa(totals.cash)}, electronic ${fcfa(totals.electronic)}, mobile money ${fcfa(totals.mobileMoney)}, other ${fcfa(totals.other)}) — statement ${closure.number}`, before: { status: "OPEN" }, after: { status: "CLOSED", closure: closure.number, collectedFcfa: totals.collected, paymentsCount: totals.count }, ctx }, tx);
    if (collection) {
      await notifyPermission({ permission: "cash:deposit_review", regionId: reg.regionId, excludeUserId: actor.id, title: "Caisse clôturée", body: `${actor.fullName} a clôturé la caisse ${reg.number} : ${fcfa(totals.collected)} à verser.`, href: `/traffic/cash/collections/${collection.id}` }, tx);
    }
    return { closure, collection, totals: { count: totals.count, collected: totals.collected } };
  });
}

export async function setRegisterBlocked(actor: Actor, input: BlockRegisterInput, ctx: RequestContext) {
  need(actor, "cash:block");
  const reg = await prisma.trafficCashRegister.findUnique({ where: { id: input.registerId }, select: { id: true, number: true, status: true, agentId: true, stationId: true, regionId: true } });
  if (!reg || !inScope(actor, reg)) throw new NotFoundError("TrafficCashRegister");
  await prisma.$transaction(async (tx) => {
    await lockRow(tx, "TrafficCashRegister", reg.id);
    if (input.op === "block") {
      const r = await tx.trafficCashRegister.updateMany({ where: { id: reg.id, status: "OPEN" }, data: { status: "BLOCKED", blockedAt: new Date(), blockedById: actor.id, blockReason: input.reason } });
      if (r.count !== 1) throw new BusinessError("Only an open cash register can be blocked.", "STATE");
    } else {
      const other = await tx.trafficCashRegister.findFirst({ where: { agentId: reg.agentId, status: "OPEN" }, select: { number: true } });
      if (other) throw new BusinessError(`The agent already has an open cash register (${other.number}).`, "STATE");
      const r = await tx.trafficCashRegister.updateMany({ where: { id: reg.id, status: "BLOCKED" }, data: { status: "OPEN", blockedAt: null, blockedById: null, blockReason: null } });
      if (r.count !== 1) throw new BusinessError("This cash register is not blocked.", "STATE");
    }
    await audit({ actor, action: input.op === "block" ? "TRAFFIC_CASH_REGISTER_BLOCKED" : "TRAFFIC_CASH_REGISTER_UNBLOCKED", entityType: "TrafficCashRegister", entityId: reg.id, label: reg.number, summary: `Cash register ${reg.number} ${input.op === "block" ? "blocked" : "unblocked"} — ${input.reason}`, before: { status: reg.status }, after: { status: input.op === "block" ? "BLOCKED" : "OPEN" }, ctx }, tx);
  });
}

export async function verifyClosure(actor: Actor, collectionId: string, ctx: RequestContext) {
  need(actor, "cash:verify_closure");
  const c = await prisma.trafficRevenueCollection.findUnique({ where: { id: collectionId }, select: { id: true, number: true, agentId: true, stationId: true, regionId: true, verifiedAt: true, collectedFcfa: true, register: { select: { number: true } } } });
  if (!c || !inScope(actor, c)) throw new NotFoundError("TrafficRevenueCollection");
  if (c.agentId === actor.id) throw new BusinessError("You cannot verify your own closing.", "STATE");
  if (c.verifiedAt) throw new BusinessError("This closing has already been verified.", "STATE");
  await prisma.$transaction(async (tx) => {
    await tx.trafficRevenueCollection.update({ where: { id: c.id }, data: { verifiedById: actor.id, verifiedAt: new Date() } });
    await audit({ actor, action: "TRAFFIC_CASH_CLOSURE_VERIFIED", entityType: "TrafficRevenueCollection", entityId: c.id, label: c.number, summary: `Closing of register ${c.register.number} verified (${fcfa(c.collectedFcfa)})`, before: { verified: false }, after: { verified: true }, ctx }, tx);
  });
}

/* ------------------------------------------------------------------ derived statuses */

async function syncRegisterStatus(tx: Db, registerId: string) {
  const reg = await tx.trafficCashRegister.findUnique({ where: { id: registerId }, select: { status: true, collection: { select: { status: true, deposits: { select: { status: true } } } } } });
  if (!reg || reg.status === "OPEN" || reg.status === "BLOCKED" || !reg.collection) return;
  const st = reg.collection.deposits.map((d) => d.status);
  const next = reg.collection.status === "VALIDATED" ? "VALIDATED" : st.includes("VERIFIED") || st.includes("VALIDATED") ? "DEPOSITED" : st.includes("SUBMITTED") || st.includes("JUSTIFICATION_REQUESTED") ? "PENDING_DEPOSIT" : "CLOSED";
  if (next !== reg.status) await tx.trafficCashRegister.update({ where: { id: registerId }, data: { status: next } });
}

/** Recomputes the deposited / validated amounts, the collection status, the reconciliation and its discrepancy. Idempotent. */
export async function recomputeCollection(tx: Db, collectionId: string, actor: Actor, ctx: RequestContext, forceGap = false) {
  const c = await tx.trafficRevenueCollection.findUnique({ where: { id: collectionId }, select: { id: true, number: true, registerId: true, agentId: true, collectedFcfa: true, status: true, deposits: { select: { status: true, amountDepositedFcfa: true } }, reconciliation: true } });
  if (!c) throw new NotFoundError("TrafficRevenueCollection");
  const settings = await getTrafficSettings();
  const active = c.deposits.filter((d) => d.status !== "REJECTED");
  const deposited = active.reduce((a, d) => a + d.amountDepositedFcfa, 0);
  const validated = active.filter((d) => d.status === "VALIDATED").reduce((a, d) => a + d.amountDepositedFcfa, 0);
  const pending = deposited - validated;
  const gap = c.collectedFcfa - validated;
  if (c.status !== "VALIDATED") {
    const status = deposited === 0 ? "TO_DEPOSIT" : deposited < c.collectedFcfa ? "PARTIALLY_DEPOSITED" : "DEPOSITED";
    await tx.trafficRevenueCollection.update({ where: { id: c.id }, data: { depositedFcfa: deposited, validatedFcfa: validated, status } });
  }
  const rec = c.reconciliation;
  if (rec && rec.status !== "VALIDATED") {
    const declared = forceGap || rec.status === "GAP_TO_JUSTIFY";
    let status: "PENDING" | "CONFORME" | "GAP_TO_JUSTIFY" = "PENDING";
    if (pending === 0 && gap === 0 && validated > 0) status = "CONFORME";
    else if (pending === 0 && gap > 0 && validated > 0 && (!settings.allowPartialDeposit || declared)) status = "GAP_TO_JUSTIFY";
    else if (pending === 0 && gap > 0 && declared && validated > 0) status = "GAP_TO_JUSTIFY";
    if (status !== rec.status || rec.collectedFcfa !== c.collectedFcfa || rec.depositedFcfa !== deposited || rec.validatedFcfa !== validated || rec.gapFcfa !== gap) {
      await tx.trafficReconciliation.update({ where: { id: rec.id }, data: { status, depositedFcfa: deposited, validatedFcfa: validated, gapFcfa: gap, computedAt: new Date(), decidedById: null, decidedAt: null } });
      if (status !== rec.status) {
        await audit({ actor, action: "TRAFFIC_CASH_RECONCILED", entityType: "TrafficReconciliation", entityId: rec.id, label: rec.number, summary: `Reconciliation ${rec.number} of collection ${c.number}: collected ${fcfa(c.collectedFcfa)}, validated ${fcfa(validated)}, gap ${fcfa(gap)} — ${status}`, before: { status: rec.status, gapFcfa: rec.gapFcfa }, after: { status, gapFcfa: gap, collectedFcfa: c.collectedFcfa, validatedFcfa: validated }, ctx }, tx);
      }
    }
    if (status === "GAP_TO_JUSTIFY") {
      const open = await tx.trafficCashDiscrepancy.findFirst({ where: { collectionId: c.id, status: { in: ["OPEN", "JUSTIFIED", "REJECTED"] } }, orderBy: { createdAt: "desc" }, select: { id: true, amountFcfa: true } });
      if (open) {
        if (open.amountFcfa !== gap) await tx.trafficCashDiscrepancy.update({ where: { id: open.id }, data: { amountFcfa: gap } });
      } else {
        const validatedGap = await tx.trafficCashDiscrepancy.findFirst({ where: { collectionId: c.id, status: "VALIDATED", amountFcfa: gap }, select: { id: true } });
        if (!validatedGap) {
          const d = await tx.trafficCashDiscrepancy.create({ data: { number: await nextNumber("CASH_DISCREPANCY", tx), reconciliationId: rec.id, collectionId: c.id, registerId: c.registerId, agentId: c.agentId, amountFcfa: gap }, select: { id: true, number: true } });
          await audit({ actor, action: "TRAFFIC_CASH_DISCREPANCY_CREATED", entityType: "TrafficCashDiscrepancy", entityId: d.id, label: d.number, summary: `Discrepancy ${d.number} of ${fcfa(gap)} created on collection ${c.number} (collected ${fcfa(c.collectedFcfa)} vs validated ${fcfa(validated)})`, after: { amountFcfa: gap, status: "OPEN" }, ctx }, tx);
        }
      }
    }
  }
  await syncRegisterStatus(tx, c.registerId);
}

/* ------------------------------------------------------------------ deposits */

function canActOnCollection(actor: Actor, c: { agentId: string; stationId: string; regionId: string }) {
  return c.agentId === actor.id || (actor.permissions.has("cash:deposit_review") && inScope(actor, c));
}

const METHOD_NEEDS_SLIP = ["BANK", "TREASURY"];
const METHOD_NEEDS_REF = ["BANK", "MOBILE_MONEY"];

export async function createDeposit(actor: Actor, input: DepositInput, file: File | null, ctx: RequestContext) {
  need(actor, "cash:deposit_create");
  const c = await prisma.trafficRevenueCollection.findUnique({ where: { id: input.collectionId }, select: { id: true, agentId: true, stationId: true, regionId: true } });
  if (!c || !canActOnCollection(actor, c)) throw new NotFoundError("TrafficRevenueCollection");
  const settings = await getTrafficSettings();
  const slip = nul(input.slipNumber?.trim());
  const reference = nul(input.reference?.trim());
  if (METHOD_NEEDS_SLIP.includes(input.method) && !slip) throw new BusinessError("The slip number is required for a bank or treasury deposit.", "VALIDATION", { slipNumber: "required" });
  if (METHOD_NEEDS_REF.includes(input.method) && (!reference || reference.length < 4)) throw new BusinessError("A bank or transaction reference (at least 4 characters) is required for this deposit method.", "VALIDATION", { reference: "required" });
  const depositedAt = input.depositedAt ?? new Date();
  if (depositedAt.getTime() > Date.now() + 10 * 60_000) throw new BusinessError("The deposit date cannot be in the future.");
  const upload = await prepareUpload(file);
  return prisma.$transaction(async (tx) => {
    await lockRow(tx, "TrafficRevenueCollection", c.id);
    const col = await tx.trafficRevenueCollection.findUniqueOrThrow({ where: { id: c.id }, select: { id: true, number: true, registerId: true, agentId: true, stationId: true, regionId: true, periodFrom: true, periodTo: true, collectedFcfa: true, status: true, agent: { select: { firstName: true, lastName: true } }, register: { select: { number: true, agentBadge: true } }, deposits: { select: { id: true, status: true, amountDepositedFcfa: true, attempt: true } } } });
    if (col.status === "VALIDATED") throw new BusinessError("This collection is already validated.", "STATE");
    const activeDeposits = col.deposits.filter((d) => d.status !== "REJECTED");
    const alreadyDeposited = activeDeposits.reduce((a, d) => a + d.amountDepositedFcfa, 0);
    const remaining = col.collectedFcfa - alreadyDeposited;
    if (activeDeposits.length > 0 && !settings.allowPartialDeposit) throw new BusinessError("A deposit is already recorded for this collection: partial deposits are not enabled. Reject it before submitting a new one.", "STATE");
    if (input.amountDepositedFcfa > remaining) throw new BusinessError(`The amount exceeds the amount available in the cash register (${remaining} FCFA still to deposit).`, "VALIDATION", { amountDepositedFcfa: "exceeds" });
    if (input.amountDepositedFcfa < remaining && !settings.allowPartialDeposit && (input.observations?.trim().length ?? 0) < 10) throw new BusinessError("The amount is lower than the amount to deposit: explain the shortfall in the observations (at least 10 characters).", "VALIDATION", { observations: "required" });
    const rejected = col.deposits.filter((d) => d.status === "REJECTED");
    const last = rejected.sort((a, b) => b.attempt - a.attempt)[0];
    const number = await nextNumber("CASH_DEPOSIT", tx);
    const documentId = await saveAttachment(actor, file, `${number} — justificatif`, col.stationId, tx, upload);
    const dep = await tx.trafficDeposit.create({
      data: {
        number, collectionId: col.id, registerId: col.registerId, agentId: col.agentId, agentBadge: col.register.agentBadge, stationId: col.stationId, regionId: col.regionId, periodFrom: col.periodFrom, periodTo: col.periodTo,
        collectedFcfa: col.collectedFcfa, amountDueFcfa: remaining, amountDepositedFcfa: input.amountDepositedFcfa, method: input.method, slipNumber: slip, reference, recipient: nul(input.recipient), depositedAt, depositedById: actor.id,
        observations: nul(input.observations), attachmentDocumentId: documentId, attempt: col.deposits.length + 1, previousDepositId: last?.id ?? null,
      },
      select: { id: true, number: true },
    });
    const txs = await tx.trafficCashTransaction.findMany({ where: { registerId: col.registerId, voidedAt: null, payment: { status: "COMPLETED" } }, select: { paymentId: true, amountFcfa: true } });
    if (txs.length) await tx.trafficDepositItem.createMany({ data: txs.map((t) => ({ depositId: dep.id, paymentId: t.paymentId, amountFcfa: t.amountFcfa })) });
    const slipNo = await nextNumber("CASH_SLIP", tx);
    const contentHash = sha256(JSON.stringify({ v: 1, deposit: dep.number, slip: slipNo, collection: col.number, register: col.register.number, agent: col.agentId, collected: col.collectedFcfa, due: remaining, deposited: input.amountDepositedFcfa, method: input.method, reference, at: depositedAt.toISOString() }));
    await tx.trafficDepositReceipt.create({ data: { number: slipNo, verificationToken: randomToken(18), depositId: dep.id, contentHash, issuedById: actor.id } });
    await recomputeCollection(tx, col.id, actor, ctx);
    await audit({ actor, action: "TRAFFIC_CASH_DEPOSIT_CREATED", entityType: "TrafficDeposit", entityId: dep.id, label: dep.number, summary: `Deposit ${dep.number}: ${fcfa(input.amountDepositedFcfa)} of ${fcfa(remaining)} due (${input.method}${reference ? ` ref ${reference}` : ""}${slip ? ` slip ${slip}` : ""}) for collection ${col.number}, attempt ${col.deposits.length + 1} — slip ${slipNo}`, after: { status: "SUBMITTED", amountDepositedFcfa: input.amountDepositedFcfa, amountDueFcfa: remaining, method: input.method }, ctx }, tx);
    await notifyPermission({ permission: "cash:deposit_review", regionId: col.regionId, excludeUserId: actor.id, title: "Versement à vérifier", body: `Versement ${dep.number} de ${fcfa(input.amountDepositedFcfa)} (agent ${col.agent.firstName} ${col.agent.lastName}).`, href: `/traffic/cash/deposits/${dep.id}` }, tx);
    return { id: dep.id, number: dep.number, slipNumber: slipNo };
  });
}

export async function reviewDeposit(actor: Actor, input: DepositReviewInput, ctx: RequestContext) {
  need(actor, input.op === "validate" ? "cash:deposit_validate" : "cash:deposit_review");
  const d = await prisma.trafficDeposit.findUnique({ where: { id: input.depositId }, select: { id: true, number: true, status: true, agentId: true, depositedById: true, stationId: true, regionId: true, amountDepositedFcfa: true, collectionId: true } });
  if (!d || !inScope(actor, d)) throw new NotFoundError("TrafficDeposit");
  const note = nul(input.note?.trim());
  if (input.op === "reject" && (note?.length ?? 0) < 10) throw new BusinessError("A reason of at least 10 characters is required to reject a deposit.", "VALIDATION", { note: "required" });
  if (input.op === "request_justification" && (note?.length ?? 0) < 5) throw new BusinessError("Explain what must be justified (at least 5 characters).", "VALIDATION", { note: "required" });
  if (input.op !== "reject" && input.op !== "request_justification" && (d.agentId === actor.id || d.depositedById === actor.id)) throw new BusinessError("You cannot verify or validate a deposit you made or that concerns your own cash register.", "STATE");
  const allowed: Record<DepositReviewInput["op"], string[]> = { verify: ["SUBMITTED"], request_justification: ["SUBMITTED", "VERIFIED"], reject: ["SUBMITTED", "VERIFIED", "JUSTIFICATION_REQUESTED"], validate: ["VERIFIED"] };
  const next = { verify: "VERIFIED", request_justification: "JUSTIFICATION_REQUESTED", reject: "REJECTED", validate: "VALIDATED" } as const;
  const action = { verify: "TRAFFIC_CASH_DEPOSIT_VERIFIED", request_justification: "TRAFFIC_CASH_DEPOSIT_JUSTIFICATION_REQUESTED", reject: "TRAFFIC_CASH_DEPOSIT_REJECTED", validate: "TRAFFIC_CASH_DEPOSIT_VALIDATED" }[input.op];
  await prisma.$transaction(async (tx) => {
    await lockRow(tx, "TrafficRevenueCollection", d.collectionId);
    const now = new Date();
    const data = input.op === "validate" ? { status: next.validate, validatedById: actor.id, validatedAt: now } : { status: next[input.op], reviewedById: actor.id, reviewedAt: now, reviewNote: note, ...(input.op === "verify" ? { receivedById: actor.id } : {}) };
    const r = await tx.trafficDeposit.updateMany({ where: { id: d.id, status: { in: allowed[input.op] as never[] } }, data });
    if (r.count !== 1) throw new BusinessError("The deposit is not in a state that allows this operation.", "STATE");
    await recomputeCollection(tx, d.collectionId, actor, ctx);
    await audit({ actor, action, entityType: "TrafficDeposit", entityId: d.id, label: d.number, summary: `Deposit ${d.number} (${fcfa(d.amountDepositedFcfa)}): ${input.op.replace("_", " ")}${note ? ` — ${note}` : ""}`, before: { status: d.status }, after: { status: next[input.op], note }, ctx }, tx);
    if (input.op === "reject" || input.op === "request_justification") {
      await notifyPermission({ permission: "cash:register", stationId: d.stationId, title: input.op === "reject" ? "Versement rejeté" : "Justification demandée", body: `Versement ${d.number} : ${note}`, href: `/traffic/cash/deposits/${d.id}`, kind: "ALERT" }, tx);
    }
  });
}

export async function respondToJustification(actor: Actor, input: DepositRespondInput, file: File | null, ctx: RequestContext) {
  need(actor, "cash:deposit_create");
  const d = await prisma.trafficDeposit.findUnique({ where: { id: input.depositId }, select: { id: true, number: true, status: true, agentId: true, stationId: true, regionId: true, observations: true, attachmentDocumentId: true } });
  if (!d || !canActOnCollection(actor, d)) throw new NotFoundError("TrafficDeposit");
  const upload = await prepareUpload(file);
  await prisma.$transaction(async (tx) => {
    const documentId = d.attachmentDocumentId ? null : await saveAttachment(actor, file, `${d.number} — justification`, d.stationId, tx, upload);
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const r = await tx.trafficDeposit.updateMany({ where: { id: d.id, status: "JUSTIFICATION_REQUESTED" }, data: { status: "SUBMITTED", observations: `${d.observations ? `${d.observations}\n` : ""}[Justification ${stamp} — ${actor.username}] ${input.note}`.slice(0, 4000), ...(documentId ? { attachmentDocumentId: documentId } : {}) } });
    if (r.count !== 1) throw new BusinessError("No justification is expected for this deposit.", "STATE");
    await audit({ actor, action: "TRAFFIC_CASH_DEPOSIT_JUSTIFIED", entityType: "TrafficDeposit", entityId: d.id, label: d.number, summary: `Justification provided on deposit ${d.number}: ${input.note}`, before: { status: "JUSTIFICATION_REQUESTED" }, after: { status: "SUBMITTED" }, ctx }, tx);
    await recomputeCollection(tx, (await tx.trafficDeposit.findUniqueOrThrow({ where: { id: d.id }, select: { collectionId: true } })).collectionId, actor, ctx);
  });
}

/* ------------------------------------------------------------------ reconciliation & discrepancies */

export async function actOnReconciliation(actor: Actor, input: ReconciliationActionInput, ctx: RequestContext) {
  need(actor, "cash:reconcile");
  const c = await prisma.trafficRevenueCollection.findUnique({ where: { id: input.collectionId }, select: { id: true, number: true, stationId: true, regionId: true } });
  if (!c || !inScope(actor, c)) throw new NotFoundError("TrafficRevenueCollection");
  const note = nul(input.note?.trim());
  await prisma.$transaction(async (tx) => {
    await lockRow(tx, "TrafficRevenueCollection", c.id);
    const rec = await tx.trafficReconciliation.findUnique({ where: { collectionId: c.id } });
    if (!rec) throw new NotFoundError("TrafficReconciliation");
    if (rec.status === "VALIDATED") throw new BusinessError("This reconciliation is already validated: the collection is definitively closed.", "STATE");
    if (input.op === "declare_gap") {
      if (rec.status !== "PENDING" || rec.validatedFcfa === 0) throw new BusinessError("A gap can be declared only when validated deposits do not cover the collected amount and nothing is pending.", "STATE");
      await recomputeCollection(tx, c.id, actor, ctx, true);
      return;
    }
    if (input.op === "reject") {
      if ((note?.length ?? 0) < 10) throw new BusinessError("A reason of at least 10 characters is required to reject a reconciliation.", "VALIDATION", { note: "required" });
      await tx.trafficReconciliation.update({ where: { id: rec.id }, data: { status: "REJECTED", decidedById: actor.id, decidedAt: new Date(), note } });
      await audit({ actor, action: "TRAFFIC_CASH_RECONCILIATION_REJECTED", entityType: "TrafficReconciliation", entityId: rec.id, label: rec.number, summary: `Reconciliation ${rec.number} rejected — ${note}`, before: { status: rec.status }, after: { status: "REJECTED", note }, ctx }, tx);
      return;
    }
    // finalize
    const pending = await tx.trafficDeposit.count({ where: { collectionId: c.id, status: { in: ["SUBMITTED", "VERIFIED", "JUSTIFICATION_REQUESTED"] } } });
    if (pending > 0) throw new BusinessError("Deposits are still awaiting validation.", "STATE");
    if (rec.gapFcfa > 0) {
      const settled = await tx.trafficCashDiscrepancy.findFirst({ where: { collectionId: c.id, status: "VALIDATED", amountFcfa: rec.gapFcfa }, select: { id: true } });
      if (!settled) throw new BusinessError("The gap must first be justified and validated (discrepancy sheet).", "STATE");
    } else if (rec.validatedFcfa === 0) {
      throw new BusinessError("No validated deposit: nothing to reconcile.", "STATE");
    }
    await tx.trafficReconciliation.update({ where: { id: rec.id }, data: { status: "VALIDATED", decidedById: actor.id, decidedAt: new Date(), note } });
    await tx.trafficRevenueCollection.update({ where: { id: c.id }, data: { status: "VALIDATED" } });
    await syncRegisterStatus(tx, (await tx.trafficRevenueCollection.findUniqueOrThrow({ where: { id: c.id }, select: { registerId: true } })).registerId);
    await audit({ actor, action: "TRAFFIC_CASH_RECONCILIATION_VALIDATED", entityType: "TrafficReconciliation", entityId: rec.id, label: rec.number, summary: `Reconciliation ${rec.number} definitively validated: collected ${fcfa(rec.collectedFcfa)}, validated ${fcfa(rec.validatedFcfa)}, gap ${fcfa(rec.gapFcfa)}${note ? ` — ${note}` : ""}`, before: { status: rec.status }, after: { status: "VALIDATED", gapFcfa: rec.gapFcfa, collectedFcfa: rec.collectedFcfa, validatedFcfa: rec.validatedFcfa }, ctx }, tx);
  });
}

export async function actOnDiscrepancy(actor: Actor, input: DiscrepancyActionInput, file: File | null, ctx: RequestContext) {
  const d = await prisma.trafficCashDiscrepancy.findUnique({ where: { id: input.discrepancyId }, select: { id: true, number: true, status: true, agentId: true, amountFcfa: true, reason: true, justification: true, attachmentDocumentId: true, register: { select: { stationId: true, regionId: true } } } });
  if (!d || !(d.agentId === actor.id || inScope(actor, d.register))) throw new NotFoundError("TrafficCashDiscrepancy");
  if (input.op === "justify") {
    if (!(actor.permissions.has("cash:reconcile") || (d.agentId === actor.id && actor.permissions.has("cash:deposit_create")))) throw new AuthError("forbidden", "Permission cash:reconcile required");
  } else {
    need(actor, "cash:reconcile");
  }
  const reason = nul(input.reason?.trim());
  const text = nul(input.text?.trim());
  if (input.op === "justify" && ((reason?.length ?? 0) < 5 || (text?.length ?? 0) < 10)) throw new BusinessError("Give a reason and a justification (at least 10 characters).", "VALIDATION", { text: "required" });
  if (input.op === "reject" && (text?.length ?? 0) < 10) throw new BusinessError("A reason of at least 10 characters is required to reject a justification.", "VALIDATION", { text: "required" });
  if (input.op === "validate" && d.agentId === actor.id) throw new BusinessError("You cannot validate a discrepancy concerning your own cash register.", "STATE");
  const upload = await prepareUpload(file);
  await prisma.$transaction(async (tx) => {
    const allowed = { justify: ["OPEN", "REJECTED"], validate: ["JUSTIFIED"], reject: ["OPEN", "JUSTIFIED"] }[input.op] as never[];
    const now = new Date();
    let data: Prisma.TrafficCashDiscrepancyUncheckedUpdateManyInput;
    if (input.op === "justify") {
      const documentId = d.attachmentDocumentId ? null : await saveAttachment(actor, file, `${d.number} — justification`, d.register.stationId, tx, upload);
      data = { status: "JUSTIFIED", reason, justification: text, ...(documentId ? { attachmentDocumentId: documentId } : {}) };
    } else if (input.op === "validate") data = { status: "VALIDATED", validatedById: actor.id, validatedAt: now };
    else data = { status: "REJECTED", justification: `${d.justification ?? ""}\n[Rejet ${now.toISOString().slice(0, 10)}] ${text}`.trim() };
    const r = await tx.trafficCashDiscrepancy.updateMany({ where: { id: d.id, status: { in: allowed } }, data });
    if (r.count !== 1) throw new BusinessError("The discrepancy is not in a state that allows this operation.", "STATE");
    await audit({ actor, action: { justify: "TRAFFIC_CASH_DISCREPANCY_JUSTIFIED", validate: "TRAFFIC_CASH_DISCREPANCY_VALIDATED", reject: "TRAFFIC_CASH_DISCREPANCY_REJECTED" }[input.op], entityType: "TrafficCashDiscrepancy", entityId: d.id, label: d.number, summary: `Discrepancy ${d.number} (${fcfa(d.amountFcfa)}): ${input.op}${text ? ` — ${text}` : ""}`, before: { status: d.status, reason: d.reason, justification: d.justification }, after: { status: (data as { status: string }).status, reason, justification: text }, ctx }, tx);
  });
}

import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/server/db";
import type { Prisma, TrafficOnlinePayment, TrafficPaymentMethod } from "@/generated/prisma/client";
import { logAudit, type AuditActor } from "@/server/audit";
import { BusinessError, NotFoundError } from "@/server/errors";
import { enforceRateLimit } from "@/server/auth/rate-limit";
import { scopeWhere, type Actor } from "@/server/auth/dal";
import { hashPassword } from "@/server/auth/password";
import { randomToken, sha256 } from "@/server/crypto";
import { nextNumber } from "@/server/sequences";
import type { RequestContext } from "@/server/request-context";
import { getTrafficSettings } from "@/server/traffic/settings";
import { requireOnlineGateway, getOnlineGateway, signNotification, type GatewayNotification } from "@/server/traffic/online-gateway";

/** How long the payer has to confirm on their phone before the attempt is closed. */
const PENDING_MINUTES = 30;
const PAYABLE = ["TO_PAY", "PARTIALLY_PAID"] as const;

export const normalizePlate = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "");
const maskPhone = (p: string) => (p.length <= 4 ? "****" : `${"*".repeat(p.length - 4)}${p.slice(-4)}`);
const accessHash = (code: string) => createHash("sha256").update(code.trim()).digest("hex");
function sameHash(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

// ------------------------------------------------------------------ the account the gateway acts as

const GATEWAY_USERNAME = "system.online-payments";
let gatewayUserId: string | null = null;

/**
 * Payments confirmed by an operator are recorded under a dedicated, DISABLED account (it can never sign in, has no API key and no
 * session): the register of payments needs an author, and "the operator" is the honest one. Created on first use.
 */
async function gatewayActor(): Promise<NonNullable<AuditActor>> {
  if (!gatewayUserId) {
    let u = await prisma.user.findUnique({ where: { username: GATEWAY_USERNAME }, select: { id: true } });
    if (!u) {
      const role = (await prisma.role.findUnique({ where: { code: "TRAFFIC_READONLY" }, select: { id: true } })) ?? (await prisma.role.findFirstOrThrow({ select: { id: true } }));
      try {
        u = await prisma.user.create({ data: { username: GATEWAY_USERNAME, email: "online-payments@pms.invalid", firstName: "Passerelle", lastName: "Paiement en ligne", passwordHash: await hashPassword(randomToken(32)), roleId: role.id, status: "DISABLED", mustChangePassword: false }, select: { id: true } });
      } catch {
        u = await prisma.user.findUniqueOrThrow({ where: { username: GATEWAY_USERNAME }, select: { id: true } }); // created by a concurrent request
      }
    }
    gatewayUserId = u.id;
  }
  return { id: gatewayUserId, username: GATEWAY_USERNAME, firstName: "Passerelle", lastName: "Paiement en ligne" };
}

// ------------------------------------------------------------------ public: find a fine

type FineForPayer = Awaited<ReturnType<typeof findFine>>;
async function findFine(pvNumber: string, plate: string) {
  const ticket = await prisma.trafficTicket.findUnique({
    where: { number: pvNumber.trim().toUpperCase() },
    select: { number: true, status: true, plateNumber: true, issuedAt: true, station: { select: { name: true } }, fine: { select: { id: true, number: true, status: true, amountFcfa: true, amountPaidFcfa: true, dueDate: true, issuedAt: true } } },
  });
  // One answer for "no such PV" and "wrong plate": the lookup must not confirm that a PV number exists.
  if (!ticket || !ticket.fine || !ticket.plateNumber || normalizePlate(ticket.plateNumber) !== normalizePlate(plate)) throw new NotFoundError("Fine");
  return { ticket, fine: ticket.fine };
}

function publicView(f: FineForPayer, pending: boolean) {
  const remaining = f.fine.amountFcfa - f.fine.amountPaidFcfa;
  const payable = f.ticket.status === "ISSUED" && (PAYABLE as readonly string[]).includes(f.fine.status) && remaining > 0;
  return {
    pvNumber: f.ticket.number,
    fineNumber: f.fine.number,
    status: f.ticket.status !== "ISSUED" ? "CANCELLED" : f.fine.status,
    issuedAt: f.ticket.issuedAt,
    dueDate: f.fine.dueDate,
    station: f.ticket.station.name,
    amountFcfa: f.fine.amountFcfa,
    amountPaidFcfa: f.fine.amountPaidFcfa,
    remainingFcfa: remaining,
    payable,
    paymentInProgress: pending,
  };
}

export async function lookupFineForPayer(pvNumber: string, plate: string, ip: string | null) {
  const gateway = requireOnlineGateway();
  enforceRateLimit("publicFine", ip);
  enforceRateLimit("publicFinePv", pvNumber.trim().toUpperCase());
  const f = await findFine(pvNumber, plate);
  const pending = await prisma.trafficOnlinePayment.count({ where: { fineId: f.fine.id, status: "PENDING", expiresAt: { gt: new Date() } } });
  return { ...publicView(f, pending > 0), methods: gateway.methods, partialAllowed: (await getTrafficSettings()).allowPartialPayment };
}

// ------------------------------------------------------------------ public: start a payment

export type StartInput = { pvNumber: string; plate: string; method: TrafficPaymentMethod; phone?: string; amountFcfa?: number };

export async function startOnlinePayment(input: StartInput, ip: string | null) {
  const gateway = requireOnlineGateway();
  enforceRateLimit("publicPay", ip);
  enforceRateLimit("publicFinePv", input.pvNumber.trim().toUpperCase());
  if (!gateway.methods.includes(input.method)) throw new BusinessError("This payment method is not available online.", "VALIDATION", { method: "unsupported" });
  const phone = input.phone?.replace(/[\s.-]/g, "") ?? "";
  if (input.method === "MOBILE_MONEY" && !/^\+?\d{8,15}$/.test(phone)) throw new BusinessError("Enter the mobile money number to be charged (8 to 15 digits).", "VALIDATION", { phone: "invalid" });
  const f = await findFine(input.pvNumber, input.plate);
  const remaining = f.fine.amountFcfa - f.fine.amountPaidFcfa;
  if (f.ticket.status !== "ISSUED" || !(PAYABLE as readonly string[]).includes(f.fine.status) || remaining <= 0) throw new BusinessError("This fine cannot be paid online (already paid, contested, on hold or cancelled).", "STATE");
  const settings = await getTrafficSettings();
  const amount = input.amountFcfa ?? remaining;
  if (!Number.isInteger(amount) || amount <= 0) throw new BusinessError("Invalid amount.", "VALIDATION", { amountFcfa: "invalid" });
  if (amount > remaining) throw new BusinessError(`The amount exceeds the remaining balance (${remaining} FCFA).`, "VALIDATION", { amountFcfa: "too_high" });
  if (!settings.allowPartialPayment && amount !== remaining) throw new BusinessError(`Partial payment is not enabled: the full remaining amount (${remaining} FCFA) must be paid.`, "VALIDATION", { amountFcfa: "partial_not_allowed" });
  // One attempt at a time per fine: the payer must finish or wait for the previous one to close (no double charge).
  const open = await prisma.trafficOnlinePayment.findFirst({ where: { fineId: f.fine.id, status: "PENDING", expiresAt: { gt: new Date() } }, select: { number: true } });
  if (open) throw new BusinessError("A payment is already in progress for this fine. Confirm it on your phone, or wait a few minutes before trying again.", "CONFLICT");

  const code = randomToken(12);
  const number = await nextNumber("ONLINE_PAYMENT");
  const row = await prisma.trafficOnlinePayment.create({
    data: { number, fineId: f.fine.id, amountFcfa: amount, method: input.method, provider: gateway.name, accessHash: accessHash(code), payerPhoneMasked: phone ? maskPhone(phone) : null, expiresAt: new Date(Date.now() + PENDING_MINUTES * 60_000) },
    select: { id: true, number: true, expiresAt: true },
  });
  try {
    const started = await gateway.initiate({ orderNumber: row.number, amountFcfa: amount, method: input.method, payerPhone: phone || null });
    await prisma.trafficOnlinePayment.update({ where: { id: row.id }, data: { providerReference: started.providerReference } });
    await logAudit({ actor: null, action: "TRAFFIC_ONLINE_PAYMENT_STARTED", module: "traffic", entityType: "TrafficFine", entityId: f.fine.id, entityLabel: f.fine.number, summary: `Online payment ${row.number} of ${amount} FCFA (${input.method}, ${gateway.name}) started on fine ${f.fine.number} (PV ${f.ticket.number})` });
    return { number: row.number, accessCode: code, status: "PENDING" as const, amountFcfa: amount, expiresAt: row.expiresAt, instructions: started.instructions };
  } catch (e) {
    await prisma.trafficOnlinePayment.update({ where: { id: row.id }, data: { status: "FAILED", failureReason: "The operator could not start the payment." } });
    throw e instanceof BusinessError ? e : new BusinessError("The payment operator is unavailable. Try again later or pay at a police payment point.", "STATE");
  }
}

// ------------------------------------------------------------------ settle on the operator's word

type Intent = Pick<TrafficOnlinePayment, "id" | "number" | "fineId" | "amountFcfa" | "method" | "provider" | "providerReference" | "status">;

/**
 * Applies an operator outcome to a payment attempt, once. SUCCESS records the payment and its receipt (atomically, same rules as a
 * counter payment); FAILED closes the attempt. Anything that cannot be credited (amount differs, fine settled meanwhile) is kept as
 * FAILED with a "REFUND_REQUIRED" reason so that staff see money that was taken and must be returned.
 */
async function applyOutcome(intent: Intent, n: GatewayNotification, ctx: RequestContext | null): Promise<"SUCCEEDED" | "FAILED" | "IGNORED"> {
  const actor = await gatewayActor();
  if (n.outcome === "FAILED") {
    const r = await prisma.trafficOnlinePayment.updateMany({ where: { id: intent.id, status: { in: ["PENDING", "EXPIRED"] } }, data: { status: "FAILED", failureReason: n.reason ?? "Refused by the operator." } });
    if (r.count) await logAudit({ actor, action: "TRAFFIC_ONLINE_PAYMENT_FAILED", module: "traffic", entityType: "TrafficOnlinePayment", entityId: intent.id, entityLabel: intent.number, summary: `Online payment ${intent.number} failed at the operator${n.reason ? ` — ${n.reason}` : ""}`, context: ctx });
    return r.count ? "FAILED" : "IGNORED";
  }
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.trafficOnlinePayment.updateMany({ where: { id: intent.id, status: { in: ["PENDING", "EXPIRED"] } }, data: { status: "SUCCEEDED", confirmedAt: new Date() } });
    if (claimed.count !== 1) return "IGNORED" as const; // already settled: a second notification changes nothing
    const refund = async (why: string) => {
      await tx.trafficOnlinePayment.update({ where: { id: intent.id }, data: { status: "FAILED", confirmedAt: null, failureReason: `REFUND_REQUIRED: ${why}` } });
      await logAudit({ actor, action: "TRAFFIC_ONLINE_PAYMENT_REFUND_REQUIRED", module: "traffic", outcome: "FAILURE", entityType: "TrafficOnlinePayment", entityId: intent.id, entityLabel: intent.number, summary: `Online payment ${intent.number}: the operator took ${n.amountFcfa} FCFA (ref ${n.reference}) but it could not be credited — ${why}. To be refunded.`, context: ctx }, tx);
      return "FAILED" as const;
    };
    if (n.amountFcfa !== intent.amountFcfa) return refund(`the operator reports ${n.amountFcfa} FCFA, ${intent.amountFcfa} FCFA were expected`);
    const fine = await tx.trafficFine.findUnique({ where: { id: intent.fineId }, select: { id: true, number: true, status: true, amountFcfa: true, amountPaidFcfa: true, ticket: { select: { number: true, status: true } } } });
    if (!fine || fine.ticket.status !== "ISSUED" || !(PAYABLE as readonly string[]).includes(fine.status) || intent.amountFcfa > fine.amountFcfa - fine.amountPaidFcfa) return refund("the fine was settled, cancelled or put on hold in the meantime");
    const paidAt = new Date();
    const payment = await tx.trafficPayment.create({
      data: { number: await nextNumber("TRAFFIC_PAYMENT", tx), fineId: fine.id, amountFcfa: intent.amountFcfa, method: intent.method, provider: intent.provider, transactionReference: n.reference, paidAt, receivedById: actor.id, paymentPoint: "online", notes: `Online payment ${intent.number}` },
      select: { id: true, number: true },
    });
    const newPaid = fine.amountPaidFcfa + intent.amountFcfa;
    const full = newPaid === fine.amountFcfa;
    const u = await tx.trafficFine.updateMany({ where: { id: fine.id, amountPaidFcfa: fine.amountPaidFcfa, status: { in: ["TO_PAY", "PARTIALLY_PAID"] } }, data: { amountPaidFcfa: newPaid, status: full ? "PAID" : "PARTIALLY_PAID", paidAt: full ? paidAt : null } });
    if (u.count !== 1) throw new BusinessError("The fine was modified concurrently.", "CONFLICT"); // rolls back the claim: the notification is retried
    const receipt = await tx.trafficReceipt.create({ data: { number: await nextNumber("TRAFFIC_RECEIPT", tx), verificationToken: randomToken(18), paymentId: payment.id, fineId: fine.id, amountFcfa: intent.amountFcfa, issuedAt: paidAt, issuedById: actor.id }, select: { number: true } });
    await tx.trafficOnlinePayment.update({ where: { id: intent.id }, data: { paymentId: payment.id } });
    await logAudit({ actor, action: "TRAFFIC_PAYMENT_RECORDED", module: "traffic", entityType: "TrafficFine", entityId: fine.id, entityLabel: fine.number, summary: `Online payment ${intent.number} confirmed by ${intent.provider} (ref ${n.reference}): payment ${payment.number} of ${intent.amountFcfa} FCFA (${intent.method}) on fine ${fine.number} (PV ${fine.ticket.number}) — receipt ${receipt.number}`, before: { status: fine.status, amountPaidFcfa: fine.amountPaidFcfa }, after: { status: full ? "PAID" : "PARTIALLY_PAID", amountPaidFcfa: newPaid, method: intent.method, reference: n.reference, online: true }, context: ctx }, tx);
    return "SUCCEEDED" as const;
  });
}

/** Entry point of the operator's signed notification. Idempotent: the same event, replayed, changes nothing. */
export async function handleGatewayNotification(rawBody: string, headers: Headers, ctx: RequestContext) {
  const gateway = requireOnlineGateway();
  const n = gateway.verifyNotification(rawBody, headers); // throws when it cannot be trusted
  const payloadHash = sha256(rawBody);
  const intent = await prisma.trafficOnlinePayment.findUnique({ where: { provider_providerReference: { provider: gateway.name, providerReference: n.reference } }, select: { id: true, number: true, fineId: true, amountFcfa: true, method: true, provider: true, providerReference: true, status: true } });
  try {
    await prisma.trafficPaymentEvent.create({ data: { provider: gateway.name, eventId: n.eventId, onlineId: intent?.id ?? null, outcome: intent ? n.outcome : "UNKNOWN_REFERENCE", payloadHash } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { result: "duplicate" as const };
    throw e;
  }
  if (!intent) return { result: "unknown_reference" as const };
  const r = await applyOutcome(intent, n, ctx);
  return { result: r.toLowerCase() as "succeeded" | "failed" | "ignored", number: intent.number };
}

// ------------------------------------------------------------------ public: follow a payment

async function refreshFromOperator(row: TrafficOnlinePayment) {
  const gateway = getOnlineGateway();
  if (!gateway || row.status !== "PENDING" || !row.providerReference) return;
  const n = await gateway.queryStatus(row.providerReference).catch(() => null);
  if (n) await applyOutcome(row, n, null);
}

/** Closes the attempts the payer abandoned. A late SUCCESS from the operator is still honoured (EXPIRED is claimable). */
export async function expireStalePayments(): Promise<number> {
  const r = await prisma.trafficOnlinePayment.updateMany({ where: { status: "PENDING", expiresAt: { lt: new Date() } }, data: { status: "EXPIRED", failureReason: "No confirmation received in time." } });
  return r.count;
}

export async function onlinePaymentStatus(number: string, code: string, ip: string | null) {
  enforceRateLimit("publicPayStatus", ip);
  const row = await prisma.trafficOnlinePayment.findUnique({ where: { number: number.trim().toUpperCase() } });
  if (!row || !sameHash(row.accessHash, accessHash(code))) throw new NotFoundError("Payment");
  await refreshFromOperator(row);
  await expireStalePayments();
  const cur = await prisma.trafficOnlinePayment.findUniqueOrThrow({ where: { id: row.id } });
  const receipt = cur.paymentId ? await prisma.trafficReceipt.findUnique({ where: { paymentId: cur.paymentId }, select: { number: true, verificationToken: true } }) : null;
  return {
    number: cur.number,
    status: cur.status,
    amountFcfa: cur.amountFcfa,
    method: cur.method,
    expiresAt: cur.expiresAt,
    message: cur.status === "FAILED" ? (cur.failureReason?.startsWith("REFUND_REQUIRED") ? "Your payment could not be applied to the fine. The amount taken will be refunded; contact the police station." : cur.failureReason) : cur.status === "EXPIRED" ? cur.failureReason : null,
    receipt: receipt ? { number: receipt.number, verificationToken: receipt.verificationToken } : null,
  };
}

// ------------------------------------------------------------------ sandbox only: play the operator

/** Sends the application its own signed notification, as the sandbox operator would after the payer confirms (or refuses) on the phone. */
export async function simulateOperator(number: string, code: string, outcome: "SUCCESS" | "FAILED", ctx: RequestContext) {
  const gateway = requireOnlineGateway();
  if (gateway.name !== "sandbox") throw new BusinessError("Only available with the sandbox payment provider.", "STATE");
  const row = await prisma.trafficOnlinePayment.findUnique({ where: { number: number.trim().toUpperCase() } });
  if (!row || !row.providerReference || !sameHash(row.accessHash, accessHash(code))) throw new NotFoundError("Payment");
  const body = JSON.stringify({ eventId: `evt_${randomToken(9)}`, reference: row.providerReference, status: outcome, amountFcfa: row.amountFcfa, ...(outcome === "FAILED" ? { reason: "Payment refused on the phone." } : {}) });
  const { signature, timestamp } = signNotification(body);
  return handleGatewayNotification(body, new Headers({ "x-signature": signature, "x-timestamp": timestamp }), ctx);
}

// ------------------------------------------------------------------ staff: follow and reconcile

export type OnlineFilter = { status?: "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED"; refundOnly?: boolean; q?: string; page: number; pageSize: number };

export async function listOnlinePayments(actor: Actor, f: OnlineFilter) {
  await expireStalePayments();
  const fineScope = scopeWhere(actor) as Prisma.TrafficFineWhereInput;
  const where: Prisma.TrafficOnlinePaymentWhereInput = {
    fine: fineScope,
    ...(f.status ? { status: f.status } : {}),
    ...(f.refundOnly ? { status: "FAILED", failureReason: { startsWith: "REFUND_REQUIRED" } } : {}),
    ...(f.q ? { OR: [{ number: { contains: f.q, mode: "insensitive" } }, { providerReference: { contains: f.q, mode: "insensitive" } }, { fine: { number: { contains: f.q, mode: "insensitive" } } }, { fine: { plateNumber: { contains: f.q, mode: "insensitive" } } }] } : {}),
  };
  const [total, rows, pending, refunds] = await Promise.all([
    prisma.trafficOnlinePayment.count({ where }),
    prisma.trafficOnlinePayment.findMany({ where, orderBy: { createdAt: "desc" }, skip: (f.page - 1) * f.pageSize, take: f.pageSize, select: { id: true, number: true, amountFcfa: true, method: true, provider: true, providerReference: true, payerPhoneMasked: true, status: true, failureReason: true, createdAt: true, confirmedAt: true, expiresAt: true, fine: { select: { id: true, number: true, plateNumber: true, ticket: { select: { number: true } } } }, payment: { select: { number: true } } } }),
    prisma.trafficOnlinePayment.count({ where: { fine: fineScope, status: "PENDING" } }),
    prisma.trafficOnlinePayment.count({ where: { fine: fineScope, status: "FAILED", failureReason: { startsWith: "REFUND_REQUIRED" } } }),
  ]);
  return { total, rows, pending, refunds };
}

/** Staff asks the operator again where a pending payment stands (the notification may have been lost). */
export async function checkOnlinePayment(actor: Actor, id: string, ctx: RequestContext) {
  const row = await prisma.trafficOnlinePayment.findFirst({ where: { id, fine: scopeWhere(actor) as Prisma.TrafficFineWhereInput } });
  if (!row) throw new NotFoundError("TrafficOnlinePayment");
  await refreshFromOperator(row);
  await logAudit({ actor, action: "TRAFFIC_ONLINE_PAYMENT_CHECKED", module: "traffic", entityType: "TrafficOnlinePayment", entityId: row.id, entityLabel: row.number, summary: `Status of online payment ${row.number} requested from the operator`, context: ctx });
  return prisma.trafficOnlinePayment.findUniqueOrThrow({ where: { id }, select: { id: true, number: true, status: true, failureReason: true } });
}

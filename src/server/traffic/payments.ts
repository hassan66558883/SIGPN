import "server-only";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError, NotFoundError } from "@/server/errors";
import { inScope, type Actor } from "@/server/auth/dal";
import { randomToken } from "@/server/crypto";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import { getPaymentProvider, REFERENCE_REQUIRED } from "@/server/traffic/payment-provider";
import { assertPaymentEditable, bookPayment, registerForCollection } from "@/server/traffic/cash";
import { getTrafficSettings } from "@/server/traffic/settings";
import type { PaymentInput, PaymentVoidInput } from "@/server/traffic/schemas";

const nul = (v: string | undefined | null) => (v ? v : null);
const isUniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

/**
 * Records a payment against a fine and issues its electronic receipt, atomically. The fine's paid
 * amount and status are recomputed under an optimistic guard, and the database CHECK constraint makes an
 * overpayment impossible even under concurrency. No real payment gateway is involved (see payment-provider.ts).
 */
export async function recordPayment(actor: Actor, input: PaymentInput, ctx: RequestContext) {
  const fine = await prisma.trafficFine.findUnique({
    where: { id: input.fineId },
    select: { id: true, number: true, status: true, amountFcfa: true, amountPaidFcfa: true, stationId: true, regionId: true, ticket: { select: { number: true, status: true } } },
  });
  if (!fine || !inScope(actor, fine)) throw new NotFoundError("TrafficFine");
  if (fine.ticket.status !== "ISSUED") throw new BusinessError("The PV of this fine is cancelled: no payment can be recorded.", "STATE");
  if (fine.status !== "TO_PAY" && fine.status !== "PARTIALLY_PAID") {
    const why = fine.status === "PAID" ? "The fine is already fully paid." : fine.status === "CANCELLED" ? "The fine is cancelled." : fine.status === "CONTESTED" ? "The fine is contested: reinstate it before recording a payment." : "The fine is on hold: reinstate it before recording a payment.";
    throw new BusinessError(why, "STATE");
  }
  const remaining = fine.amountFcfa - fine.amountPaidFcfa;
  if (input.amountFcfa > remaining) throw new BusinessError(`The amount exceeds the remaining balance (${remaining} FCFA).`);
  const settings = await getTrafficSettings();
  if (!settings.allowPartialPayment && input.amountFcfa !== remaining) throw new BusinessError(`Partial payment is not enabled: the full remaining amount (${remaining} FCFA) must be paid.`);
  const reference = nul(input.transactionReference?.trim());
  if (REFERENCE_REQUIRED.includes(input.method) && (!reference || reference.length < 4)) throw new BusinessError("A transaction reference (at least 4 characters) is required for this payment method.", "VALIDATION", { transactionReference: "required" });
  const paidAt = input.paidAt ?? new Date();
  if (paidAt.getTime() > Date.now() + 10 * 60_000) throw new BusinessError("The payment date cannot be in the future.");
  const confirmation = await getPaymentProvider().confirm({ method: input.method, amountFcfa: input.amountFcfa, transactionReference: reference });
  if (!confirmation.confirmed) throw new BusinessError("The payment was not confirmed by the provider.", "STATE");
  // A field agent collects into an open register of their own; a central cash desk has no register.
  const register = await registerForCollection(actor);

  try {
    return await prisma.$transaction(async (tx) => {
      const paymentNumber = await nextNumber("TRAFFIC_PAYMENT", tx);
      const payment = await tx.trafficPayment.create({
        data: { number: paymentNumber, fineId: fine.id, amountFcfa: input.amountFcfa, method: input.method, provider: nul(input.provider), transactionReference: reference, paidAt, receivedById: actor.id, stationId: actor.stationId, paymentPoint: nul(input.paymentPoint), notes: nul(input.notes) },
        select: { id: true, number: true },
      });
      if (register) await bookPayment(tx, register.id, { id: payment.id, amountFcfa: input.amountFcfa, method: input.method });
      const newPaid = fine.amountPaidFcfa + input.amountFcfa;
      const full = newPaid === fine.amountFcfa;
      const r = await tx.trafficFine.updateMany({
        where: { id: fine.id, amountPaidFcfa: fine.amountPaidFcfa, status: { in: ["TO_PAY", "PARTIALLY_PAID"] } },
        data: { amountPaidFcfa: newPaid, status: full ? "PAID" : "PARTIALLY_PAID", paidAt: full ? paidAt : null },
      });
      if (r.count !== 1) throw new BusinessError("The fine was modified concurrently. Reload and retry.", "CONFLICT");
      const receiptNumber = await nextNumber("TRAFFIC_RECEIPT", tx);
      const receipt = await tx.trafficReceipt.create({ data: { number: receiptNumber, verificationToken: randomToken(18), paymentId: payment.id, fineId: fine.id, amountFcfa: input.amountFcfa, issuedAt: paidAt, issuedById: actor.id }, select: { id: true, number: true, verificationToken: true } });
      await logAudit({ actor, action: "TRAFFIC_PAYMENT_RECORDED", module: "traffic", entityType: "TrafficFine", entityId: fine.id, entityLabel: fine.number, summary: `Payment ${payment.number} of ${input.amountFcfa} FCFA (${input.method}${reference ? ` ref ${reference}` : ""}) on fine ${fine.number} (PV ${fine.ticket.number}) — receipt ${receipt.number}${register ? " — booked in the agent cash register" : ""}`, before: { status: fine.status, amountPaidFcfa: fine.amountPaidFcfa }, after: { status: full ? "PAID" : "PARTIALLY_PAID", amountPaidFcfa: newPaid, method: input.method, reference, cashRegisterId: register?.id ?? null, role: actor.roleCode }, context: ctx }, tx);
      return { payment, receipt, fine: { id: fine.id, number: fine.number, status: full ? ("PAID" as const) : ("PARTIALLY_PAID" as const), amountPaidFcfa: newPaid, remainingFcfa: fine.amountFcfa - newPaid } };
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new BusinessError("This transaction reference has already been recorded for this payment method.", "CONFLICT");
    throw e;
  }
}

/** Voids a payment recorded by mistake. The payment and its receipt stay in the register (marked voided); the fine is re-opened. */
export async function voidPayment(actor: Actor, input: PaymentVoidInput, ctx: RequestContext) {
  const p = await prisma.trafficPayment.findUnique({ where: { id: input.paymentId }, select: { id: true, number: true, status: true, amountFcfa: true, receivedById: true, fine: { select: { id: true, number: true, status: true, amountFcfa: true, amountPaidFcfa: true, stationId: true, regionId: true } } } });
  if (!p || !inScope(actor, p.fine)) throw new NotFoundError("TrafficPayment");
  if (p.status !== "COMPLETED") throw new BusinessError("This payment is already voided.", "STATE");
  // Finance roles void any payment of their scope; a field agent only their own, while their register is still open.
  if (!actor.permissions.has("traffic:payment_void") && !(actor.permissions.has("cash:collect") && p.receivedById === actor.id)) throw new AuthError("forbidden", "Permission traffic:payment_void required");
  await assertPaymentEditable(p.id);
  await prisma.$transaction(async (tx) => {
    const r = await tx.trafficPayment.updateMany({ where: { id: p.id, status: "COMPLETED" }, data: { status: "VOIDED", voidedAt: new Date(), voidedById: actor.id, voidReason: input.reason } });
    if (r.count !== 1) throw new BusinessError("The payment was modified concurrently. Reload and retry.", "CONFLICT");
    await tx.trafficCashTransaction.updateMany({ where: { paymentId: p.id }, data: { voidedAt: new Date() } });
    const newPaid = Math.max(0, p.fine.amountPaidFcfa - p.amountFcfa);
    await tx.trafficFine.update({ where: { id: p.fine.id }, data: { amountPaidFcfa: newPaid, status: newPaid === 0 ? "TO_PAY" : "PARTIALLY_PAID", paidAt: null } });
    await logAudit({ actor, action: "TRAFFIC_PAYMENT_VOIDED", module: "traffic", entityType: "TrafficFine", entityId: p.fine.id, entityLabel: p.fine.number, summary: `Payment ${p.number} of ${p.amountFcfa} FCFA voided on fine ${p.fine.number} — ${input.reason}`, before: { status: p.fine.status, amountPaidFcfa: p.fine.amountPaidFcfa }, after: { status: newPaid === 0 ? "TO_PAY" : "PARTIALLY_PAID", amountPaidFcfa: newPaid }, context: ctx }, tx);
  });
}

import "server-only";
import type { TrafficPaymentMethod } from "@/generated/prisma/client";
import { BusinessError } from "@/server/errors";

/**
 * Payment provider abstraction. Only the MANUAL provider exists: the cashier declares a payment that
 * was received (cash, or an electronic / mobile-money transaction whose reference is typed in).
 * No real payment gateway is connected. A gateway is a drop-in `TrafficPaymentProvider` selected with
 * TRAFFIC_PAYMENT_PROVIDER — nothing else in the module changes.
 */
export type PaymentConfirmation = { confirmed: boolean; providerReference: string | null };

export interface TrafficPaymentProvider {
  readonly name: string;
  readonly gatewayConnected: boolean;
  confirm(input: { method: TrafficPaymentMethod; amountFcfa: number; transactionReference: string | null }): Promise<PaymentConfirmation>;
}

const manualProvider: TrafficPaymentProvider = {
  name: "manual",
  gatewayConnected: false,
  async confirm(input) {
    return { confirmed: true, providerReference: input.transactionReference };
  },
};

export function getPaymentProvider(): TrafficPaymentProvider {
  const wanted = (process.env.TRAFFIC_PAYMENT_PROVIDER || "manual").toLowerCase();
  if (wanted === "manual") return manualProvider;
  throw new BusinessError(`Payment provider "${wanted}" is not configured in this deployment.`, "STATE");
}

/** Methods that cannot be recorded without a transaction reference (the only proof of the payment). */
export const REFERENCE_REQUIRED: readonly TrafficPaymentMethod[] = ["ELECTRONIC", "MOBILE_MONEY", "BANK_TRANSFER"];

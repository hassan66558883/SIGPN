import "server-only";
import { prisma } from "@/server/db";

/**
 * Administrative parameters of the fines process. The source table gives flat amounts only: it defines
 * neither a payment deadline nor partial payment, so both are OFF by default and must be enabled by an
 * administrator (SystemSetting) once the administration has decided the rule.
 */
export const TRAFFIC_SETTING_KEYS = {
  allowPartialPayment: "traffic.allow_partial_payment",
  paymentDeadlineDays: "traffic.payment_deadline_days",
  allowPartialDeposit: "traffic.allow_partial_deposit",
} as const;

export async function getTrafficSettings(): Promise<{ allowPartialPayment: boolean; paymentDeadlineDays: number | null; allowPartialDeposit: boolean }> {
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: Object.values(TRAFFIC_SETTING_KEYS) } }, select: { key: true, value: true } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const partial = map.get(TRAFFIC_SETTING_KEYS.allowPartialPayment);
  const days = map.get(TRAFFIC_SETTING_KEYS.paymentDeadlineDays);
  return {
    allowPartialPayment: partial === true,
    allowPartialDeposit: map.get(TRAFFIC_SETTING_KEYS.allowPartialDeposit) === true,
    paymentDeadlineDays: typeof days === "number" && Number.isFinite(days) && days > 0 ? Math.floor(days) : null,
  };
}

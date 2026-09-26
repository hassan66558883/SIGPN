import { apiError, apiOk, withApi } from "@/server/api";
import { verifySlipByToken } from "@/server/traffic/cash-queries";

type P = { token: string };

/** GET /api/v1/public/verify/deposit/{token} — public, rate-limited authenticity check of a deposit slip. Shows amounts and status only. */
export const GET = withApi<P>({ public: true }, async ({ params }) => {
  const s = await verifySlipByToken(params.token);
  if (!s) return apiError(404, "NOT_FOUND", "Deposit slip not found.");
  const initials = (n: string) => `${n.slice(0, 1)}.`;
  return apiOk({ number: s.number, issuedAt: s.issuedAt, deposit: { number: s.deposit.number, status: s.deposit.status, method: s.deposit.method, collectedFcfa: s.deposit.collectedFcfa, amountDepositedFcfa: s.deposit.amountDepositedFcfa, depositedAt: s.deposit.depositedAt, unit: s.deposit.station.name, agent: `${initials(s.deposit.agent.firstName)} ${s.deposit.agent.lastName}` } });
});

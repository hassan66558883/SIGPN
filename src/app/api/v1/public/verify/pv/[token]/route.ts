import { apiError, apiOk, withApi } from "@/server/api";
import { verifyTicketByToken } from "@/server/traffic/queries";

type P = { token: string };

/** GET /api/v1/public/verify/pv/{token} — public, rate-limited authenticity check of a PV (no identity data beyond masked initials). */
export const GET = withApi<P>({ public: true }, async ({ params }) => {
  const r = await verifyTicketByToken(params.token);
  return r ? apiOk(r) : apiError(404, "NOT_FOUND", "PV not found.");
});

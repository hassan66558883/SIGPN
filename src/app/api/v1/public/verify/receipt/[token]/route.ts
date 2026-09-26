import { apiError, apiOk, withApi } from "@/server/api";
import { verifyReceiptByToken } from "@/server/traffic/queries";

type P = { token: string };

/** GET /api/v1/public/verify/receipt/{token} — public, rate-limited authenticity check of a receipt. */
export const GET = withApi<P>({ public: true }, async ({ params }) => {
  const r = await verifyReceiptByToken(params.token);
  return r ? apiOk(r) : apiError(404, "NOT_FOUND", "Receipt not found.");
});

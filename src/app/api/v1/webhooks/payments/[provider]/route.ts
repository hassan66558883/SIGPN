import { apiError, apiOk, withApi } from "@/server/api";
import { handleGatewayNotification } from "@/server/traffic/online-payments";

type P = { provider: string };

/**
 * POST /api/v1/webhooks/payments/{provider} — an operator notification (sandbox | airtel). No session, no API key: what authenticates
 * it is the operator scheme (sandbox: HMAC over the raw body; Airtel: secret `?key=` in the callback URL, and the outcome is then
 * confirmed by asking Airtel, never read from the body). Idempotent on the event id. Answers 200 for a known repeat so the operator
 * stops retrying.
 */
export const POST = withApi<P>({ public: true, bucket: "webhook" }, async ({ ctx, req, params }) => {
  const raw = await req.text();
  if (raw.length > 16_000) return apiError(413, "TOO_LARGE", "Notification too large.");
  try {
    return apiOk(await handleGatewayNotification(params.provider.toLowerCase(), raw, req.headers, req.nextUrl.searchParams, ctx));
  } catch (e) {
    if (e instanceof Error && /^Notification rejected/.test(e.message)) return apiError(401, "BAD_SIGNATURE", e.message);
    throw e;
  }
});

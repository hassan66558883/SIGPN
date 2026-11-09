import { apiError, apiOk, withApi } from "@/server/api";
import { handleGatewayNotification } from "@/server/traffic/online-payments";

/**
 * POST /api/v1/webhooks/payments — the payment operator notification. No session, no API key: the HMAC signature over the raw
 * body (and its timestamp) is the credential. Idempotent on the event id. Answers 200 for a known repeat so the operator stops retrying.
 */
export const POST = withApi({ public: true, bucket: "webhook" }, async ({ ctx, req }) => {
  const raw = await req.text();
  if (raw.length > 16_000) return apiError(413, "TOO_LARGE", "Notification too large.");
  try {
    return apiOk(await handleGatewayNotification(raw, req.headers, ctx));
  } catch (e) {
    if (e instanceof Error && /^Notification rejected/.test(e.message)) return apiError(401, "BAD_SIGNATURE", e.message);
    throw e;
  }
});

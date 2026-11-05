import { apiOk, withApi } from "@/server/api";
import { myPay } from "@/server/hr/pay";

/** GET /api/v1/hr/pay/me — the connected officer's own validated pay lines (self-service; nothing else is reachable). */
export const GET = withApi({}, async ({ actor }) => apiOk(await myPay(actor)));

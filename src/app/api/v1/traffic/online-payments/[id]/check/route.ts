import { apiOk, withApi } from "@/server/api";
import { checkOnlinePayment } from "@/server/traffic/online-payments";

type P = { id: string };

/** POST /api/v1/traffic/online-payments/{id}/check — asks the operator again where a pending payment stands (traffic:payment_record). */
export const POST = withApi<P>({ permission: "traffic:payment_record" }, async ({ actor, ctx, params }) => apiOk(await checkOnlinePayment(actor, params.id, ctx)));

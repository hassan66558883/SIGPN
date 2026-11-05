import { apiOk, withApi } from "@/server/api";
import { officerPay } from "@/server/hr/pay";

/** GET /api/v1/hr/pay/officers/:id — pay elements and validated statement lines of one officer (audited). */
export const GET = withApi<{ id: string }>({ permission: "hr:pay_view" }, async ({ actor, ctx, params }) => apiOk(await officerPay(actor, params.id, ctx)));

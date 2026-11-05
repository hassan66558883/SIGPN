import { apiOk, withApi } from "@/server/api";
import { getRun } from "@/server/hr/pay";

/** GET /api/v1/hr/pay/runs/:id — totals and breakdown by rank and délégation (audited). */
export const GET = withApi<{ id: string }>({ permission: "hr:pay_view" }, async ({ actor, ctx, params }) => apiOk(await getRun(actor, params.id, ctx)));

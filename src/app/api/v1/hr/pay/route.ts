import { apiOk, withApi } from "@/server/api";
import { paySummary } from "@/server/hr/pay";

/** GET /api/v1/hr/pay — pay overview: last statements and pending validations (confidential). */
export const GET = withApi({ permission: "hr:pay_view" }, async ({ actor }) => apiOk(await paySummary(actor)));

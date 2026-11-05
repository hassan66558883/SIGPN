import { apiOk, parseJson, withApi } from "@/server/api";
import { getPaySettings, paySettingsSchema, updatePaySettings } from "@/server/hr/pay";

/** GET /api/v1/hr/pay/settings — share of pay during a disciplinary suspension. */
export const GET = withApi({ permission: "hr:pay_view" }, async () => apiOk(await getPaySettings()));

/** PUT /api/v1/hr/pay/settings */
export const PUT = withApi({ permission: "hr:pay_manage" }, async ({ actor, ctx, req }) => apiOk(await updatePaySettings(actor, await parseJson(req, paySettingsSchema), ctx)));

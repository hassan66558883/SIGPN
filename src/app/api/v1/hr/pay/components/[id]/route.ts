import { apiOk, parseJson, withApi } from "@/server/api";
import { componentSchema, updateComponent } from "@/server/hr/pay";

/** PUT /api/v1/hr/pay/components/:id — change a pay element (applies to future statements only; the code is immutable). */
export const PUT = withApi<{ id: string }>({ permission: "hr:pay_manage" }, async ({ actor, ctx, params, req }) => apiOk(await updateComponent(actor, params.id, await parseJson(req, componentSchema), ctx)));

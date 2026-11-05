import { apiOk, parseJson, withApi } from "@/server/api";
import { decideScaleEntry, decisionSchema } from "@/server/hr/pay";

/** POST /api/v1/hr/pay/scale/:id/decide — validate or reject (never one's own request). */
export const POST = withApi<{ id: string }>({ permission: "hr:pay_validate" }, async ({ actor, ctx, params, req }) => {
  await decideScaleEntry(actor, { ...(await parseJson(req, decisionSchema.omit({ id: true }))), id: params.id }, ctx);
  return apiOk({ decided: true });
});

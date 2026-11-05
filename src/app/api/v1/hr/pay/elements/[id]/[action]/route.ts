import { apiError, apiOk, parseJson, withApi } from "@/server/api";
import { decideElement, decisionSchema, endElement, endElementSchema } from "@/server/hr/pay";

/** POST /api/v1/hr/pay/elements/:id/{decide|end} — decide needs hr:pay_validate (not the requester), end needs hr:pay_manage (each service checks). */
export const POST = withApi<{ id: string; action: string }>({}, async ({ actor, ctx, params, req }) => {
  if (params.action === "decide") {
    await decideElement(actor, { ...(await parseJson(req, decisionSchema.omit({ id: true }))), id: params.id }, ctx);
    return apiOk({ decided: true });
  }
  if (params.action === "end") {
    await endElement(actor, { ...(await parseJson(req, endElementSchema.omit({ id: true }))), id: params.id }, ctx);
    return apiOk({ ended: true });
  }
  return apiError(404, "NOT_FOUND", "Unknown action.");
});

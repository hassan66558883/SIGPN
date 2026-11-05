import { apiError, apiOk, parseJson, withApi } from "@/server/api";
import { addStep, decideCase, decisionSchema, stepSchema } from "@/server/hr/discipline";

/** POST /api/v1/hr/discipline/:id/{step|decide} — record a step of the procedure, or decide the sanction (each re-checks its permission and scope). */
export const POST = withApi<{ id: string; action: string }>({}, async ({ actor, ctx, params, req }) => {
  if (params.action === "step") {
    await addStep(actor, { caseId: params.id, ...(await parseJson(req, stepSchema.omit({ caseId: true }))) }, ctx);
    return apiOk({ recorded: true }, { status: 201 });
  }
  if (params.action === "decide") return apiOk(await decideCase(actor, { caseId: params.id, ...(await parseJson(req, decisionSchema.omit({ caseId: true }))) }, ctx));
  return apiError(404, "NOT_FOUND", "Unknown action.");
});


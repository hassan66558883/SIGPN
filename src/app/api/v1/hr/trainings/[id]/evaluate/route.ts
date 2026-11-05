import { apiOk, parseJson, withApi } from "@/server/api";
import { evaluateTraining, evaluationSchema } from "@/server/hr/training";

/** POST /api/v1/hr/trainings/:id/evaluate — final evaluation; grants competences on success. */
export const POST = withApi<{ id: string }>({ permission: "hr:training_manage" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, evaluationSchema.omit({ trainingId: true }));
  return apiOk(await evaluateTraining(actor, { ...body, trainingId: params.id }, ctx));
});

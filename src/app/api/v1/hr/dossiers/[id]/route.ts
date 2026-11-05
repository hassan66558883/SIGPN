import { apiOk, parseJson, withApi } from "@/server/api";
import { careerHistory, getDossier, updateDossier } from "@/server/hr/service";
import { dossierSchema } from "@/server/hr/schemas";

/** GET /api/v1/hr/dossiers/:id — dossier and career history (the read is audited). */
export const GET = withApi<{ id: string }>({ permission: "hr:view" }, async ({ actor, ctx, params }) => {
  const dossier = await getDossier(actor, params.id, ctx);
  return apiOk({ dossier, career: await careerHistory(params.id) });
});

/** PUT /api/v1/hr/dossiers/:id — update identity and administrative data. */
export const PUT = withApi<{ id: string }>({ permission: "hr:manage" }, async ({ actor, ctx, params, req }) => {
  return apiOk(await updateDossier(actor, params.id, await parseJson(req, dossierSchema), ctx));
});

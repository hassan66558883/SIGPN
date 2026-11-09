import { apiOk, parseJson, withApi } from "@/server/api";
import { changeArrestStatus, getArrest } from "@/server/arrests/service";
import { arrestStatusSchema } from "@/server/arrests/schemas";

type P = { id: string };

export const GET = withApi<P>({ permission: "arrests:view" }, async ({ actor, params }) => apiOk(await getArrest(actor, params.id)));

export const PATCH = withApi<P>({ permission: "arrests:update" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, arrestStatusSchema.omit({ arrestId: true }));
  return apiOk(await changeArrestStatus(actor, { ...body, arrestId: params.id }, ctx));
});

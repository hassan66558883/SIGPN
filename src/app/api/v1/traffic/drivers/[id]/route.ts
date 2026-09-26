import { apiOk, parseJson, withApi } from "@/server/api";
import { getDriver } from "@/server/traffic/queries";
import { updateDriver } from "@/server/traffic/registry";
import { driverUpdateSchema } from "@/server/traffic/schemas";

type P = { id: string };

export const GET = withApi<P>({ permission: "traffic:drivers_view" }, async ({ actor, params }) => apiOk(await getDriver(actor, params.id)));

export const PATCH = withApi<P>({ permission: "traffic:drivers_manage" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, driverUpdateSchema.omit({ id: true }));
  await updateDriver(actor, { ...body, id: params.id }, ctx);
  return apiOk(await getDriver(actor, params.id));
});

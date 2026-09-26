import { apiOk, parseJson, withApi } from "@/server/api";
import { getVehicle } from "@/server/traffic/queries";
import { updateVehicle } from "@/server/traffic/registry";
import { vehicleUpdateSchema } from "@/server/traffic/schemas";

type P = { id: string };

export const GET = withApi<P>({ permission: "traffic:vehicles_view" }, async ({ actor, params }) => apiOk(await getVehicle(actor, params.id)));

export const PATCH = withApi<P>({ permission: "traffic:vehicles_manage" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, vehicleUpdateSchema.omit({ id: true }));
  await updateVehicle(actor, { ...body, id: params.id }, ctx);
  return apiOk(await getVehicle(actor, params.id));
});

import { apiOk, parseJson, withApi } from "@/server/api";
import { addVehicleDocument } from "@/server/traffic/registry";
import { vehicleDocumentSchema } from "@/server/traffic/schemas";

type P = { id: string };

/** POST /api/v1/traffic/vehicles/{id}/documents — records an insurance / inspection / registration document. */
export const POST = withApi<P>({ permission: "traffic:vehicles_manage" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, vehicleDocumentSchema.omit({ vehicleId: true }));
  return apiOk(await addVehicleDocument(actor, { ...body, vehicleId: params.id }, ctx), { status: 201 });
});

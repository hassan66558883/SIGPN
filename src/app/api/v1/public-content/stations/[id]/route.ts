import { apiOk, parseJson, withApi } from "@/server/api";
import { saveStationPublic, stationPublicSchema } from "@/server/public/admin";

/** PUT — public coordinates of a unit. Listing it requires an attestation that the coordinates were verified with the unit. */
export const PUT = withApi<{ id: string }>({ permission: "public:content" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, stationPublicSchema.omit({ id: true }));
  await saveStationPublic(actor, { ...body, id: params.id }, ctx);
  return apiOk({ id: params.id });
});

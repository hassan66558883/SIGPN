import { apiOk, parseJson, withApi } from "@/server/api";
import { searchLicensePlate } from "@/server/biometric/service";
import { anprSearchSchema } from "@/server/biometric/schemas";

export const POST = withApi({ permission: "biometric:search_anpr" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, anprSearchSchema);
  const detections = await searchLicensePlate(actor, body, ctx);
  return apiOk(detections);
});

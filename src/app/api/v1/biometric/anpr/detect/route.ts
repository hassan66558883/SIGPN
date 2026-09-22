import { apiOk, withApi } from "@/server/api";
import { detectLicensePlate } from "@/server/biometric/service";
import { anprDetectSchema } from "@/server/biometric/schemas";
import { parseMultipart } from "@/server/biometric/api-utils";

export const POST = withApi({ permission: "biometric:search_anpr" }, async ({ actor, ctx, req }) => {
  const { data, file } = await parseMultipart(req, anprDetectSchema);
  const d = await detectLicensePlate(actor, data, file, false, ctx);
  return apiOk(d, { status: 201 });
});

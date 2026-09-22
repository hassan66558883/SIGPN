import { apiOk, withApi } from "@/server/api";
import { runFaceSearch } from "@/server/biometric/service";
import { faceSearchSchema } from "@/server/biometric/schemas";
import { parseMultipart } from "@/server/biometric/api-utils";

export const POST = withApi({ permission: "biometric:search_face" }, async ({ actor, ctx, req }) => {
  const { data, file } = await parseMultipart(req, faceSearchSchema);
  const s = await runFaceSearch(actor, data, file, ctx);
  return apiOk(s, { status: 201 });
});

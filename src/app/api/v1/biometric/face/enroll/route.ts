import { apiOk, withApi } from "@/server/api";
import { enrollFace } from "@/server/biometric/service";
import { enrollFaceSchema } from "@/server/biometric/schemas";
import { parseMultipart } from "@/server/biometric/api-utils";

export const POST = withApi({ permission: "biometric:manage" }, async ({ actor, ctx, req }) => {
  const { data, file } = await parseMultipart(req, enrollFaceSchema);
  const rec = await enrollFace(actor, data, file, ctx);
  return apiOk(rec, { status: 201 });
});

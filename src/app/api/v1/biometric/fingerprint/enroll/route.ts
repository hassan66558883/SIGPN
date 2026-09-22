import { apiOk, withApi } from "@/server/api";
import { enrollFingerprint } from "@/server/biometric/service";
import { enrollFingerprintSchema } from "@/server/biometric/schemas";
import { parseMultipart } from "@/server/biometric/api-utils";

export const POST = withApi({ permission: "biometric:manage" }, async ({ actor, ctx, req }) => {
  const { data, file } = await parseMultipart(req, enrollFingerprintSchema);
  const rec = await enrollFingerprint(actor, data, file, ctx);
  return apiOk(rec, { status: 201 });
});

import { apiOk, withApi } from "@/server/api";
import { runFingerprintSearch } from "@/server/biometric/service";
import { fingerprintSearchSchema } from "@/server/biometric/schemas";
import { parseMultipart } from "@/server/biometric/api-utils";

export const POST = withApi({ permission: "biometric:search_fingerprint" }, async ({ actor, ctx, req }) => {
  const { data, file } = await parseMultipart(req, fingerprintSearchSchema);
  const s = await runFingerprintSearch(actor, data, file, ctx);
  return apiOk(s, { status: 201 });
});

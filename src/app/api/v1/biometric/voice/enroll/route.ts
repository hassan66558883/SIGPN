import { apiOk, withApi } from "@/server/api";
import { enrollVoice } from "@/server/biometric/service";
import { enrollVoiceSchema } from "@/server/biometric/schemas";
import { parseMultipart } from "@/server/biometric/api-utils";

export const POST = withApi({ permission: "biometric:manage" }, async ({ actor, ctx, req }) => {
  const { data, file } = await parseMultipart(req, enrollVoiceSchema);
  const rec = await enrollVoice(actor, data, file, ctx);
  return apiOk(rec, { status: 201 });
});

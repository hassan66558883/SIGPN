import { apiOk, withApi } from "@/server/api";
import { runVoiceSearch } from "@/server/biometric/service";
import { voiceSearchSchema } from "@/server/biometric/schemas";
import { parseMultipart } from "@/server/biometric/api-utils";

export const POST = withApi({ permission: "biometric:search_voice" }, async ({ actor, ctx, req }) => {
  const { data, file } = await parseMultipart(req, voiceSearchSchema);
  const s = await runVoiceSearch(actor, data, file, ctx);
  return apiOk(s, { status: 201 });
});

import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { trackSubmission } from "@/server/public/service";

/** POST /api/v1/public/track — status of a submission from its reference and tracking code (identical 404 for a wrong reference or code). */
export const POST = withApi({ public: true }, async ({ ctx, req }) => {
  const body = await parseJson(req, z.object({ reference: z.string().trim().min(5).max(40), code: z.string().trim().min(6).max(20) }));
  return apiOk(await trackSubmission(body.reference, body.code, ctx.ip));
});

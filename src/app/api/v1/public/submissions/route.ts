import { apiOk, parseJson, withApi } from "@/server/api";
import { publicSubmissionSchema, submitPublic } from "@/server/public/service";

/** POST /api/v1/public/submissions — complaint, report or contact message from the public site. Anonymous, rate-limited (5 per hour per IP). */
export const POST = withApi({ public: true }, async ({ ctx, req }) => {
  const input = await parseJson(req, publicSubmissionSchema);
  const r = await submitPublic(input, ctx.ip);
  return apiOk({ reference: r.reference, trackingCode: r.trackingCode }, { status: 201 });
});

import { apiOk, parseJson, withApi } from "@/server/api";
import { recordCareerEvent } from "@/server/hr/service";
import { careerEventSchema } from "@/server/hr/schemas";

/** POST /api/v1/hr/career-events — record a career decision (promotion, appointment, status, retirement…). */
export const POST = withApi({ permission: "hr:career" }, async ({ actor, ctx, req }) => {
  return apiOk(await recordCareerEvent(actor, await parseJson(req, careerEventSchema), ctx), { status: 201 });
});

import { apiOk, withApi } from "@/server/api";
import { runRotation } from "@/server/hr/rotation";

/** POST /api/v1/hr/rotation/run — run one pass now (no-op while the feature is disabled). */
export const POST = withApi({ permission: "hr:transfer_review" }, async ({ actor, ctx }) => apiOk(await runRotation({ actor, trigger: "MANUAL", ctx })));

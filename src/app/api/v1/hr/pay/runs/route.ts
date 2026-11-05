import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { generateRun, listRuns } from "@/server/hr/pay";

/** GET /api/v1/hr/pay/runs — monthly pay statements. */
export const GET = withApi({ permission: "hr:pay_view" }, async ({ actor }) => apiOk(await listRuns(actor)));

/** POST /api/v1/hr/pay/runs {period:"YYYY-MM"} — generate (or regenerate a draft) pay statement of the whole force. */
export const POST = withApi({ permission: "hr:pay_manage" }, async ({ actor, ctx, req }) => apiOk(await generateRun(actor, (await parseJson(req, z.object({ period: z.string() }))).period, ctx), { status: 201 }));

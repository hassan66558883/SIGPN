import { z } from "zod";
import { apiError, apiOk, parseJson, withApi } from "@/server/api";
import { cancelLeave, decideLeave } from "@/server/hr/attendance";

const decision = z.object({ decision: z.enum(["APPROVE", "REJECT"]), note: z.string().trim().max(500).optional() });
const cancel = z.object({ reason: z.string().trim().min(3).max(500) });

/** POST /api/v1/hr/leaves/:id/{decide|cancel} — each service re-checks permission, scope and the "not your own request" rule. */
export const POST = withApi<{ id: string; action: string }>({}, async ({ actor, ctx, params, req }) => {
  if (params.action === "decide") return apiOk(await decideLeave(actor, { id: params.id, ...(await parseJson(req, decision)) }, ctx));
  if (params.action === "cancel") return apiOk(await cancelLeave(actor, params.id, (await parseJson(req, cancel)).reason, ctx));
  return apiError(404, "NOT_FOUND", "Unknown action.");
});

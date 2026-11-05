import { z } from "zod";
import { apiError, apiOk, parseJson, withApi } from "@/server/api";
import { cancelTransfer, executeTransfer, reviewTransfer, validateTransfer } from "@/server/hr/transfers";

const decision = z.object({ decision: z.enum(["APPROVE", "REJECT"]), note: z.string().trim().max(1000).optional() });
const cancel = z.object({ reason: z.string().trim().min(5).max(500) });

/**
 * POST /api/v1/hr/transfers/:id/{review|validate|execute|cancel} — the circuit steps.
 * Each service re-checks its own permission, the four-eyes rule and the scope; nothing here trusts the caller.
 */
export const POST = withApi<{ id: string; action: string }>({}, async ({ actor, ctx, params, req }) => {
  switch (params.action) {
    case "review":
      return apiOk(await reviewTransfer(actor, { id: params.id, ...(await parseJson(req, decision)) }, ctx));
    case "validate":
      return apiOk(await validateTransfer(actor, { id: params.id, ...(await parseJson(req, decision)) }, ctx));
    case "execute":
      return apiOk(await executeTransfer(actor, params.id, ctx));
    case "cancel":
      return apiOk(await cancelTransfer(actor, params.id, (await parseJson(req, cancel)).reason, ctx));
    default:
      return apiError(404, "NOT_FOUND", "Unknown action.");
  }
});

import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { listApprovals } from "@/server/approvals/service";

const querySchema = z.object({ view: z.enum(["todo", "mine", "all"]).default("todo"), status: z.enum(["PENDING", "APPROVED", "EXECUTED", "REJECTED", "CANCELLED", "EXPIRED", "FAILED"]).optional() });

/** GET /api/v1/approvals?view=todo|mine|all — approval requests: to decide, made by me, or every one (security administrator). */
export const GET = withApi({ permission: "approvals:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, querySchema);
  return apiOk(await listApprovals(actor, q.view, { status: q.status }));
});

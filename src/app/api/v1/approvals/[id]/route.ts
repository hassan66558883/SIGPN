import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { cancelApproval, decideApproval, getApproval } from "@/server/approvals/service";

type P = { id: string };

export const GET = withApi<P>({ permission: "approvals:view" }, async ({ actor, params }) => apiOk(await getApproval(actor, params.id)));

const bodySchema = z.object({ action: z.enum(["approve", "reject", "cancel"]), comment: z.string().trim().max(1000).optional() });

/** POST /api/v1/approvals/{id} {action: approve | reject | cancel, comment?} — the requester cancels; an authorised approver approves or rejects (a rejection needs a comment). */
export const POST = withApi<P>({ permission: "approvals:view" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, bodySchema);
  if (body.action === "cancel") return apiOk(await cancelApproval(actor, params.id, ctx));
  return apiOk(await decideApproval(actor, params.id, body.action === "approve" ? "APPROVE" : "REJECT", body.comment, ctx));
});

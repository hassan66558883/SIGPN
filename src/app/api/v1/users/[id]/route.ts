import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { getUser, setUserStatus, userUpdateSchema } from "@/server/admin/users";
import { submitUserUpdate, presentApproval } from "@/server/approvals/service";

type P = { id: string };

export const GET = withApi<P>({ permission: "users:view" }, async ({ actor, params }) => {
  return apiOk(await getUser(actor, params.id));
});

const patchSchema = z.union([userUpdateSchema.extend({ op: z.literal("update").optional() }), z.object({ op: z.literal("status"), status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]), reason: z.string().max(300).optional() })]);

export const PATCH = withApi<P>({ permission: "users:update" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, patchSchema);
  if ("op" in body && body.op === "status") {
    if (!actor.permissions.has("users:manage_status")) return Response.json({ error: { code: "FORBIDDEN", message: "users:manage_status required." } }, { status: 403 });
    await setUserStatus(actor, params.id, body.status, body.reason ?? "api", ctx);
    return apiOk(await getUser(actor, params.id));
  }
  const { op: _op, ...input } = body as z.infer<typeof userUpdateSchema> & { op?: "update" };
  void _op;
  const { user, requests } = await submitUserUpdate(actor, params.id, input, ctx);
  return apiOk({ ...user, pendingApprovals: requests.map((r) => presentApproval(actor, r)) });
});

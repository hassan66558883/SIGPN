import { z } from "zod";
import { apiOk, pageArgs, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { listUsers, userCreateSchema } from "@/server/admin/users";
import { submitUserCreate, presentApproval } from "@/server/approvals/service";

const querySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["PENDING", "ACTIVE", "LOCKED", "SUSPENDED", "DISABLED"]).optional(),
  roleId: z.string().max(64).optional(),
  stationId: z.string().max(64).optional(),
});

export const GET = withApi({ permission: "users:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, querySchema);
  const r = await listUsers(actor, q);
  void pageArgs;
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

export const POST = withApi({ permission: "users:create" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, userCreateSchema);
  // An account is never created directly any more: the request is approved first (one or two approvers), then executed.
  const request = await submitUserCreate(actor, body, ctx);
  return apiOk(presentApproval(actor, request), { status: 202 });
});

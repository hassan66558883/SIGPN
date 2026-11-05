import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { listLeaves, requestLeave } from "@/server/hr/attendance";
import { LEAVE_STATUSES, LEAVE_TYPES, leaveRequestSchema } from "@/server/hr/attendance-schemas";

const query = paginationSchema.extend({ q: z.string().trim().max(100).optional(), status: z.enum(LEAVE_STATUSES).optional(), type: z.enum(LEAVE_TYPES).optional(), officerId: z.string().max(64).optional() });

/** GET /api/v1/hr/leaves — leave, permission and absence requests inside the caller's scope. */
export const GET = withApi({ permission: "hr:view" }, async ({ actor, req }) => {
  const r = await listLeaves(actor, parseQuery(req, query));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

/** POST /api/v1/hr/leaves — file a request (for oneself, or for an officer in scope with hr:leave_request). */
export const POST = withApi({}, async ({ actor, ctx, req }) => apiOk(await requestLeave(actor, await parseJson(req, leaveRequestSchema), ctx), { status: 201 }));

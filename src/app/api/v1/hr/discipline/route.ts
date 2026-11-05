import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { DISCIPLINE_STATUSES, listCases, openCase, openCaseSchema } from "@/server/hr/discipline";

const query = paginationSchema.extend({ q: z.string().trim().max(100).optional(), status: z.enum(DISCIPLINE_STATUSES).optional(), officerId: z.string().max(64).optional() });

/** GET /api/v1/hr/discipline — disciplinary files in scope (confidential; the access is audited). */
export const GET = withApi({ permission: "hr:discipline_view" }, async ({ actor, ctx, req }) => {
  const r = await listCases(actor, parseQuery(req, query), ctx);
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

/** POST /api/v1/hr/discipline — open a disciplinary file. */
export const POST = withApi({ permission: "hr:discipline_manage" }, async ({ actor, ctx, req }) => apiOk(await openCase(actor, await parseJson(req, openCaseSchema), ctx), { status: 201 }));

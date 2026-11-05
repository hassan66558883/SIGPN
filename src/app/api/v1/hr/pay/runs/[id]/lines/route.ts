import { z } from "zod";
import { apiOk, paginationSchema, parseQuery, withApi } from "@/server/api";
import { runLines } from "@/server/hr/pay";

const query = paginationSchema.extend({ q: z.string().trim().max(100).optional(), rankId: z.string().max(64).optional(), regionId: z.string().max(64).optional() });

/** GET /api/v1/hr/pay/runs/:id/lines — individual lines of a statement (audited). */
export const GET = withApi<{ id: string }>({ permission: "hr:pay_view" }, async ({ actor, ctx, params, req }) => {
  const r = await runLines(actor, params.id, parseQuery(req, query), ctx);
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { listDetentions, startDetention } from "@/server/detention/service";
import { startDetentionSchema } from "@/server/detention/schemas";

const querySchema = paginationSchema.extend({ q: z.string().trim().max(100).optional(), status: z.string().max(30).optional(), overdue: z.enum(["1", "true"]).optional() });

export const GET = withApi({ permission: "detention:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, querySchema);
  const r = await listDetentions(actor, { ...q, overdue: !!q.overdue });
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

export const POST = withApi({ permission: "detention:manage" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, z.record(z.string(), z.string()));
  return apiOk(await startDetention(actor, startDetentionSchema.parse(body), ctx), { status: 201 });
});

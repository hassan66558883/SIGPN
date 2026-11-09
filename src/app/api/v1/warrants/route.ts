import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { createWarrant, listWarrants } from "@/server/warrants/service";
import { warrantSchema } from "@/server/warrants/schemas";

const querySchema = paginationSchema.extend({ q: z.string().trim().max(100).optional(), status: z.string().max(30).optional(), type: z.string().max(30).optional() });

export const GET = withApi({ permission: "warrants:view" }, async ({ actor, req }) => {
  const r = await listWarrants(actor, parseQuery(req, querySchema));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

export const POST = withApi({ permission: "warrants:create" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, z.record(z.string(), z.string()));
  const w = await createWarrant(actor, warrantSchema.parse(body), ctx);
  return apiOk(w, { status: 201 });
});

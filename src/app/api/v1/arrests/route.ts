import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { createArrest, listArrests } from "@/server/arrests/service";
import { arrestSchema } from "@/server/arrests/schemas";

const querySchema = paginationSchema.extend({ q: z.string().trim().max(100).optional(), status: z.string().max(30).optional() });

export const GET = withApi({ permission: "arrests:view" }, async ({ actor, req }) => {
  const r = await listArrests(actor, parseQuery(req, querySchema));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

export const POST = withApi({ permission: "arrests:create" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, z.record(z.string(), z.string()));
  return apiOk(await createArrest(actor, arrestSchema.parse(body), ctx), { status: 201 });
});

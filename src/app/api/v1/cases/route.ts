import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { listCases } from "@/server/cases/queries";
import { createCase } from "@/server/cases/service";
import { caseSchema } from "@/server/cases/schemas";
import { OFFENSE_CATEGORIES, PRIORITIES } from "@/server/complaints/schemas";

const querySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["OPEN", "ASSIGNED", "UNDER_INVESTIGATION", "PENDING_REVIEW", "REFERRED", "CLOSED", "ARCHIVED"]).optional(),
  category: z.enum(OFFENSE_CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  stationId: z.string().max(64).optional(),
  mine: z.coerce.boolean().optional(),
});

/** GET /api/v1/cases — cases inside the caller's territorial scope; sensitive cases only for the team or cases:view_sensitive. */
export const GET = withApi({ permission: "cases:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, querySchema);
  const r = await listCases(actor, q);
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

export const POST = withApi({ permission: "cases:create" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, caseSchema);
  return apiOk(await createCase(actor, body, ctx), { status: 201 });
});

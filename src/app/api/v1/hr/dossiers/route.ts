import { z } from "zod";
import { apiOk, paginationSchema, parseQuery, withApi } from "@/server/api";
import { listDossiers } from "@/server/hr/service";
import { ADMIN_STATUSES } from "@/server/hr/schemas";

const querySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  stationId: z.string().max(64).optional(),
  rankId: z.string().max(64).optional(),
  corpsId: z.string().max(64).optional(),
  status: z.enum(ADMIN_STATUSES).optional(),
});

/** GET /api/v1/hr/dossiers — HR dossiers inside the caller's territorial scope. */
export const GET = withApi({ permission: "hr:view" }, async ({ actor, req }) => {
  const r = await listDossiers(actor, parseQuery(req, querySchema));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

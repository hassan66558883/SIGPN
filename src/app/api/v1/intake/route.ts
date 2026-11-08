import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { listSubmissions } from "@/server/public/admin";

/** GET /api/v1/intake — complaints, reports and messages filed on the public site (staff, intake:view). */
export const GET = withApi({ permission: "intake:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, z.object({ status: z.enum(["RECEIVED", "IN_REVIEW", "FORWARDED", "CLOSED", "REJECTED"]).optional(), page: z.coerce.number().int().min(1).optional() }));
  const r = await listSubmissions(actor, q);
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

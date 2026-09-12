import { z } from "zod";
import { apiOk, paginationSchema, parseQuery, withApi } from "@/server/api";
import { listAuditLogs } from "@/server/admin/queries";

export const auditQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  module: z.string().max(64).optional(),
  action: z.string().max(64).optional(),
  actorId: z.string().max(64).optional(),
  entityType: z.string().max(64).optional(),
  entityId: z.string().max(64).optional(),
  outcome: z.enum(["SUCCESS", "DENIED", "FAILURE"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const GET = withApi({ permission: "audit:view" }, async ({ req }) => {
  const q = parseQuery(req, auditQuerySchema);
  const r = await listAuditLogs(q);
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

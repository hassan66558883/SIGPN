import { z } from "zod";
import { parseQuery, withApi } from "@/server/api";
import { listAuditLogs } from "@/server/admin/queries";
import { logAudit } from "@/server/audit";

const schema = z.object({
  q: z.string().trim().max(100).optional(),
  module: z.string().max(64).optional(),
  action: z.string().max(64).optional(),
  entityType: z.string().max(64).optional(),
  entityId: z.string().max(64).optional(),
  outcome: z.enum(["SUCCESS", "DENIED", "FAILURE"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

function csv(v: unknown): string {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/** GET /api/v1/audit/export — CSV export (max 5000 rows), itself audited. */
export const GET = withApi({ permission: "audit:export" }, async ({ actor, ctx, req }) => {
  const q = parseQuery(req, schema);
  const r = await listAuditLogs({ ...q, page: 1, pageSize: 200 });
  const rows = [...r.items];
  let page = 2;
  while (rows.length < 5000 && rows.length < r.total) {
    const more = await listAuditLogs({ ...q, page, pageSize: 200 });
    rows.push(...more.items);
    if (more.items.length < 200) break;
    page++;
  }
  await logAudit({ actor, action: "AUDIT_EXPORTED", module: "audit", summary: `Exported ${rows.length} audit rows (filters: ${JSON.stringify(q)})`, context: ctx });
  const header = ["at", "actor", "module", "action", "entityType", "entityId", "entityLabel", "summary", "outcome", "ip"];
  const body = rows.map((a) => [a.at.toISOString(), a.actorLabel, a.module, a.action, a.entityType, a.entityId, a.entityLabel, a.summary, a.outcome, a.ipAddress].map(csv).join(","));
  return new Response([header.join(","), ...body].join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`, "X-Content-Type-Options": "nosniff" },
  });
});

import { parseQuery, withApi } from "@/server/api";
import { logAudit } from "@/server/audit";
import { hrStatistics, statsQuery, statsToCsv } from "@/server/hr/stats";

const date = (s?: string) => {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** GET /api/v1/hr/stats/export — the same figures as a CSV file (audited). */
export const GET = withApi({ permission: "hr:view" }, async ({ actor, ctx, req }) => {
  const q = parseQuery(req, statsQuery);
  const s = await hrStatistics(actor, { from: date(q.from), to: date(q.to), regionId: q.regionId, stationId: q.stationId, rankId: q.rankId });
  await logAudit({ actor, action: "HR_STATS_EXPORTED", module: "hr", summary: `HR statistics exported (CSV, ${s.workforce.total} officers in scope)`, context: ctx });
  return new Response("﻿" + statsToCsv(s), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="statistiques-rh.csv"', "Cache-Control": "private, no-store" } });
});

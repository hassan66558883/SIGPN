import { z } from "zod";
import { apiOk, apiError, parseQuery, withApi } from "@/server/api";
import { logAudit } from "@/server/audit";
import { dashboardToCsv, defaultRange, trafficDashboard } from "@/server/traffic/stats";
import { rangeQuery } from "@/server/traffic/api-utils";

const query = z.object({ ...rangeQuery, format: z.enum(["json", "csv"]).default("json") });

/** GET /api/v1/traffic/stats[?from=&to=&format=csv] — dashboard figures inside the caller's scope (CSV needs traffic:export). */
export const GET = withApi({ permission: "traffic:dashboard" }, async ({ actor, ctx, req }) => {
  const q = parseQuery(req, query);
  const def = defaultRange();
  const range = { from: q.from ?? def.from, to: q.to ? new Date(q.to.getTime() + 86_400_000) : def.to };
  const d = await trafficDashboard(actor, range);
  if (q.format === "csv") {
    if (!actor.permissions.has("traffic:export")) return apiError(403, "FORBIDDEN", "traffic:export required.");
    await logAudit({ actor, action: "TRAFFIC_STATS_EXPORTED", module: "traffic", summary: "Traffic statistics exported (CSV)", context: ctx });
    return new Response(dashboardToCsv(d), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="statistiques-circulation.csv"', "Cache-Control": "private, no-store" } });
  }
  return apiOk(d);
});

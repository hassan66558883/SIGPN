import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { logAudit } from "@/server/audit";
import { revenueDashboard, revenueDashboardToCsv, revenueDefaultRange } from "@/server/traffic/cash-queries";
import { rangeQuery } from "@/server/traffic/api-utils";

const query = z.object({ ...rangeQuery, format: z.enum(["json", "csv"]).default("json") });

/** GET /api/v1/traffic/cash/stats[?from=&to=&format=csv] — revenue dashboard figures inside the caller's scope (cash:reports). */
export const GET = withApi({ permission: "cash:reports" }, async ({ actor, ctx, req }) => {
  const q = parseQuery(req, query);
  const def = revenueDefaultRange();
  const d = await revenueDashboard(actor, { from: q.from ?? def.from, to: q.to ? new Date(q.to.getTime() + 86_400_000) : def.to });
  if (q.format === "csv") {
    await logAudit({ actor, action: "TRAFFIC_CASH_STATS_EXPORTED", module: "traffic_cash", summary: "Revenue statistics exported (CSV)", context: ctx });
    return new Response(revenueDashboardToCsv(d), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="recettes-statistiques.csv"', "Cache-Control": "private, no-store" } });
  }
  return apiOk(d);
});

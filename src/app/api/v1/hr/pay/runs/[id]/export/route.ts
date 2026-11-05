import { withApi } from "@/server/api";
import { exportRun } from "@/server/hr/pay";

/** GET /api/v1/hr/pay/runs/:id/export — CSV of a validated statement for the financial services (counted and audited). */
export const GET = withApi<{ id: string }>({ permission: "hr:pay_export" }, async ({ actor, ctx, params }) => {
  const r = await exportRun(actor, params.id, ctx);
  return new Response(r.csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="solde-${r.period}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});

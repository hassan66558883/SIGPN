import { withApi } from "@/server/api";
import { logAudit } from "@/server/audit";
import { getClosure } from "@/server/traffic/cash-queries";
import { renderDailyStatementPdf } from "@/server/traffic/cash-pdf";
import { pdfResponse } from "@/server/traffic/api-utils";

type P = { id: string };

/** GET /api/v1/traffic/cash/closures/{id}/pdf[?download=1] — état journalier des recettes (audited). */
export const GET = withApi<P>({}, async ({ actor, ctx, params, req }) => {
  const c = await getClosure(actor, params.id);
  const buf = await renderDailyStatementPdf(c);
  await logAudit({ actor, action: "TRAFFIC_CASH_STATEMENT_PDF", module: "traffic_cash", entityType: "TrafficDailyClosure", entityId: c.id, entityLabel: c.number, summary: `Daily statement ${c.number} PDF generated`, context: ctx });
  return pdfResponse(buf, `${c.number}.pdf`, req.nextUrl.searchParams.get("download") === "1");
});

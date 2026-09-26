import { withApi } from "@/server/api";
import { logAudit } from "@/server/audit";
import { getSlipForPdf } from "@/server/traffic/cash-queries";
import { renderDepositSlipPdf } from "@/server/traffic/cash-pdf";
import { pdfResponse } from "@/server/traffic/api-utils";

type P = { id: string };

/** GET /api/v1/traffic/cash/deposits/{id}/pdf[?download=1] — bordereau de versement des recettes (audited). */
export const GET = withApi<P>({}, async ({ actor, ctx, params, req }) => {
  const d = await getSlipForPdf(actor, params.id);
  const buf = await renderDepositSlipPdf(d);
  await logAudit({ actor, action: "TRAFFIC_CASH_SLIP_PDF", module: "traffic_cash", entityType: "TrafficDeposit", entityId: d.id, entityLabel: d.number, summary: `Deposit slip ${d.slip?.number} PDF generated`, context: ctx });
  return pdfResponse(buf, `${d.slip?.number ?? d.number}.pdf`, req.nextUrl.searchParams.get("download") === "1");
});

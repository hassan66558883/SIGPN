import { withApi } from "@/server/api";
import { logAudit } from "@/server/audit";
import { getReceipt } from "@/server/traffic/queries";
import { renderReceiptPdf } from "@/server/traffic/pdf";
import { pdfResponse } from "@/server/traffic/api-utils";

type P = { id: string };

export const GET = withApi<P>({ permission: "traffic:view" }, async ({ actor, ctx, params, req }) => {
  const r = await getReceipt(actor, params.id);
  const buf = await renderReceiptPdf(r);
  await logAudit({ actor, action: "TRAFFIC_RECEIPT_PDF", module: "traffic", entityType: "TrafficReceipt", entityId: r.id, entityLabel: r.number, summary: `Receipt ${r.number} PDF generated`, context: ctx });
  return pdfResponse(buf, `${r.number}.pdf`, req.nextUrl.searchParams.get("download") === "1");
});

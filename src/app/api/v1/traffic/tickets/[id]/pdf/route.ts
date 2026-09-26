import { withApi } from "@/server/api";
import { logAudit } from "@/server/audit";
import { getTicket } from "@/server/traffic/queries";
import { renderTicketPdf } from "@/server/traffic/pdf";
import { pdfResponse } from "@/server/traffic/api-utils";

type P = { id: string };

/** GET /api/v1/traffic/tickets/{id}/pdf[?download=1] — the electronic PV as a PDF (printing and downloads are audited). */
export const GET = withApi<P>({ permission: "traffic:view" }, async ({ actor, ctx, params, req }) => {
  const t = await getTicket(actor, params.id);
  const buf = await renderTicketPdf(t);
  await logAudit({ actor, action: "TRAFFIC_TICKET_PDF", module: "traffic", entityType: "TrafficTicket", entityId: t.id, entityLabel: t.number, summary: `PV ${t.number} PDF generated`, context: ctx });
  return pdfResponse(buf, `${t.number}.pdf`, req.nextUrl.searchParams.get("download") === "1");
});

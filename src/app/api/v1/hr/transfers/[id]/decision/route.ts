import { withApi, apiError } from "@/server/api";
import { logAudit } from "@/server/audit";
import { getTransfer } from "@/server/hr/transfers";
import { renderTransferDecisionPdf } from "@/server/hr/transfer-pdf";
import { pdfResponse } from "@/server/traffic/api-utils";

/** GET /api/v1/hr/transfers/:id/decision[?download=1] — the decision, only once the competent authority validated (audited). */
export const GET = withApi<{ id: string }>({ permission: "hr:view" }, async ({ actor, ctx, params, req }) => {
  const t = await getTransfer(actor, params.id);
  if (!t.decisionNumber || (t.status !== "APPROVED" && t.status !== "EXECUTED")) return apiError(409, "STATE", "No decision exists before validation by the competent authority.");
  const buf = await renderTransferDecisionPdf(t);
  await logAudit({ actor, action: "TRANSFER_DECISION_PDF", module: "hr", entityType: "TransferRequest", entityId: t.id, entityLabel: t.decisionNumber, summary: `Decision ${t.decisionNumber} PDF generated`, context: ctx });
  return pdfResponse(buf, `${t.decisionNumber}.pdf`, req.nextUrl.searchParams.get("download") === "1");
});

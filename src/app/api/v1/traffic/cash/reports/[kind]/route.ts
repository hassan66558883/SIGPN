import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { logAudit } from "@/server/audit";
import { buildReport, parseReportKind, reportRange, reportToCsv } from "@/server/traffic/cash-reports";
import { renderReportPdf } from "@/server/traffic/cash-pdf";
import { pdfResponse, rangeQuery } from "@/server/traffic/api-utils";

type P = { kind: string };
const query = z.object({ ...rangeQuery, format: z.enum(["json", "csv", "pdf"]).default("json") });

/** GET /api/v1/traffic/cash/reports/{kind}[?from=&to=&format=json|csv|pdf] — the twelve financial reports (cash:reports); every export is audited. */
export const GET = withApi<P>({ permission: "cash:reports" }, async ({ actor, ctx, params, req }) => {
  const q = parseQuery(req, query);
  const kind = parseReportKind(params.kind);
  const report = await buildReport(actor, kind, reportRange(kind, q.from, q.to));
  if (q.format === "json") return apiOk(report);
  await logAudit({ actor, action: "TRAFFIC_CASH_REPORT_EXPORTED", module: "traffic_cash", summary: `Report ${kind} exported (${q.format})`, context: ctx });
  if (q.format === "csv") return new Response(reportToCsv(report), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="rapport-${kind}.csv"`, "Cache-Control": "private, no-store" } });
  return pdfResponse(await renderReportPdf(report, actor.fullName), `rapport-${kind}.pdf`, true);
});

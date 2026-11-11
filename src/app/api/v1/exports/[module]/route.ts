import { withApi } from "@/server/api";
import { exportList } from "@/server/exports/service";
import { pdfResponse } from "@/server/traffic/api-utils";

type P = { module: string };
/** GET /api/v1/exports/{module}?q=&status=… — PDF of the list, as filtered on screen (records:export_pdf, heads of structures; audited). */
export const GET = withApi<P>({ permission: "records:export_pdf", bucket: "exportPdf" }, async ({ actor, ctx, params, req }) => {
  const q: Record<string, string> = {};
  for (const [k, v] of req.nextUrl.searchParams) if (v && v.length <= 100) q[k] = v;
  const { buf, fileName } = await exportList(actor, params.module, q, ctx);
  return pdfResponse(buf, fileName, true);
});

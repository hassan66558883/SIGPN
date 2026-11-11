import { withApi } from "@/server/api";
import { exportRecord } from "@/server/exports/service";
import { pdfResponse } from "@/server/traffic/api-utils";

type P = { module: string; id: string };
/** GET /api/v1/exports/{module}/{id} — PDF sheet of one record (records:export_pdf, heads of structures; audited). */
export const GET = withApi<P>({ permission: "records:export_pdf", bucket: "exportPdf" }, async ({ actor, ctx, params }) => {
  const { buf, fileName } = await exportRecord(actor, params.module, params.id, ctx);
  return pdfResponse(buf, fileName, true);
});

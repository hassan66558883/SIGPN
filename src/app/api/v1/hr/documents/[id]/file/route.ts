import { withApi } from "@/server/api";
import { getDocumentFile } from "@/server/hr/documents";

/** GET /api/v1/hr/documents/:id/file?format=pdf|docx[&download=1] — generated documents in PDF or Word, uploaded ones as stored. Audited. */
export const GET = withApi<{ id: string }>({ permission: "hr:view" }, async ({ actor, ctx, params, req }) => {
  const format = req.nextUrl.searchParams.get("format") === "docx" ? "docx" : "pdf";
  const f = await getDocumentFile(actor, params.id, format, ctx);
  const download = req.nextUrl.searchParams.get("download") === "1" || format === "docx";
  return new Response(new Uint8Array(f.body), { headers: { "Content-Type": f.mime, "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${f.name.replace(/[^A-Za-z0-9._-]/g, "_")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});

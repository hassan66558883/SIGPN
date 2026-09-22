import { NextResponse } from "next/server";
import { apiError, withApi } from "@/server/api";
import { prisma } from "@/server/db";
import { inScope } from "@/server/auth/dal";
import { readUpload } from "@/server/storage";

type P = { id: string };

/** GET /api/v1/documents/{id}/download — streams the current version of an evidence-linked document. Scoped through the evidence's case; never served publicly. */
export const GET = withApi<P>({}, async ({ actor, params }) => {
  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    select: { id: true, currentVersion: true, evidence: { select: { case: { select: { stationId: true, regionId: true } } } }, versions: { orderBy: { version: "desc" }, take: 1, select: { fileName: true, mimeType: true, storagePath: true } } },
  });
  if (!doc || !doc.evidence) return apiError(404, "NOT_FOUND", "Document not found.");
  if (!actor.permissions.has("evidence:view") || !inScope(actor, { stationId: doc.evidence.case.stationId, regionId: doc.evidence.case.regionId })) return apiError(404, "NOT_FOUND", "Document not found.");
  const v = doc.versions[0];
  if (!v) return apiError(404, "NOT_FOUND", "No file version available.");
  const buf = await readUpload(v.storagePath);
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": v.mimeType, "Content-Disposition": `attachment; filename="${v.fileName.replace(/"/g, "")}"` } });
});

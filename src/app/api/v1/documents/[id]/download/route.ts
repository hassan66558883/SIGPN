import { NextResponse } from "next/server";
import { apiError, withApi } from "@/server/api";
import { prisma } from "@/server/db";
import { inScope } from "@/server/auth/dal";
import { readUpload } from "@/server/storage";
import { diffusionVisible } from "@/server/wanted/search-criteria";

type P = { id: string };

/** Supporting documents of deposits and discrepancies: the collecting agent, or a cash:view holder inside scope. */
function cashAccess(actor: Parameters<typeof inScope>[0], rec: { stationId: string; regionId: string }, agentId: string) {
  return (actor.permissions.has("cash:register") && agentId === actor.id) || (actor.permissions.has("cash:view") && inScope(actor, rec));
}

/** GET /api/v1/documents/{id}/download — streams the current version of an evidence- or wanted-person-linked
 * document. Scoped through the linked entity's station/region; never served publicly. */
export const GET = withApi<P>({}, async ({ actor, params }) => {
  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      currentVersion: true,
      evidence: { select: { case: { select: { stationId: true, regionId: true } } } },
      wantedPerson: { select: { stationId: true, regionId: true, diffusionLevel: true, status: true, mainPhotoDocumentId: true } },
      trafficEvidence: { select: { control: { select: { stationId: true, regionId: true } } } },
      cashDeposit: { select: { agentId: true, stationId: true, regionId: true } },
      cashDiscrepancy: { select: { agentId: true, register: { select: { stationId: true, regionId: true } } } },
      versions: { orderBy: { version: "desc" }, take: 1, select: { fileName: true, mimeType: true, storagePath: true } },
    },
  });
  if (!doc) return apiError(404, "NOT_FOUND", "Document not found.");
  let allowed = false;
  if (doc.evidence) allowed = actor.permissions.has("evidence:view") && inScope(actor, { stationId: doc.evidence.case.stationId, regionId: doc.evidence.case.regionId });
  else if (doc.wantedPerson) {
    // inside the actor's scope, or the MAIN photo of a notice in force that is diffused to the actor (national, or regional for the province)
    allowed = actor.permissions.has("wanted:view") && (inScope(actor, { stationId: doc.wantedPerson.stationId, regionId: doc.wantedPerson.regionId }) || (doc.wantedPerson.mainPhotoDocumentId === doc.id && diffusionVisible(actor, doc.wantedPerson)));
  }
  else if (doc.trafficEvidence) allowed = actor.permissions.has("traffic:view") && inScope(actor, doc.trafficEvidence.control);
  else if (doc.cashDeposit) allowed = cashAccess(actor, doc.cashDeposit, doc.cashDeposit.agentId);
  else if (doc.cashDiscrepancy) allowed = cashAccess(actor, doc.cashDiscrepancy.register, doc.cashDiscrepancy.agentId);
  if (!allowed) return apiError(404, "NOT_FOUND", "Document not found.");
  const v = doc.versions[0];
  if (!v) return apiError(404, "NOT_FOUND", "No file version available.");
  const buf = await readUpload(v.storagePath);
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": v.mimeType, "Content-Disposition": `attachment; filename="${v.fileName.replace(/"/g, "")}"` } });
});

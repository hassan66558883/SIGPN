import { apiError, apiOk, withApi } from "@/server/api";
import { logAudit } from "@/server/audit";
import { getTraining, issueCertificate } from "@/server/hr/training";
import { renderCertificatePdf } from "@/server/hr/training-pdf";
import { pdfResponse } from "@/server/traffic/api-utils";

/** GET /api/v1/hr/trainings/:id/certificate[?download=1] — the attestation PDF (only once issued; audited). */
export const GET = withApi<{ id: string }>({ permission: "hr:view" }, async ({ actor, ctx, params, req }) => {
  const t = await getTraining(actor, params.id);
  if (!t.certificateIssuedAt || !t.certificateNo) return apiError(409, "STATE", "The certificate has not been issued.");
  const buf = await renderCertificatePdf(t);
  await logAudit({ actor, action: "HR_TRAINING_CERTIFICATE_PDF", module: "hr", entityType: "Training", entityId: t.id, entityLabel: t.certificateNo, summary: `Certificate ${t.certificateNo} PDF generated`, context: ctx });
  return pdfResponse(buf, `${t.certificateNo}.pdf`, req.nextUrl.searchParams.get("download") === "1");
});

/** POST /api/v1/hr/trainings/:id/certificate — issue the attestation of a passed training. */
export const POST = withApi<{ id: string }>({ permission: "hr:training_manage" }, async ({ actor, ctx, params }) => apiOk(await issueCertificate(actor, params.id, ctx), { status: 201 }));

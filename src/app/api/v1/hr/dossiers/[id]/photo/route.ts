import { apiError, apiOk, withApi } from "@/server/api";
import { getOfficerPhoto, setOfficerPhoto } from "@/server/hr/documents";

/** GET /api/v1/hr/dossiers/:id/photo — identity photo (scope-checked). */
export const GET = withApi<{ id: string }>({ permission: "hr:view" }, async ({ actor, params }) => {
  const p = await getOfficerPhoto(actor, params.id);
  return new Response(new Uint8Array(p.body), { headers: { "Content-Type": p.mime, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
});

/** POST /api/v1/hr/dossiers/:id/photo (multipart: file) — JPEG or PNG up to 2 MB, verified on the content. */
export const POST = withApi<{ id: string }>({ permission: "hr:manage" }, async ({ actor, ctx, params, req }) => {
  const file = (await req.formData()).get("file");
  if (!(file instanceof File) || file.size === 0) return apiError(422, "VALIDATION", "A file is required.");
  await setOfficerPhoto(actor, params.id, file, ctx);
  return apiOk({ updated: true });
});

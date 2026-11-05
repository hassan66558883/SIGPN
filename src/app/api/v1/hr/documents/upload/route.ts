import { apiError, apiOk, withApi } from "@/server/api";
import { UPLOAD_KINDS, uploadDocument } from "@/server/hr/documents";

/** POST /api/v1/hr/documents/upload (multipart: file, kind, title, officerId?, confidential?) — supporting file; the type is verified on the content. */
export const POST = withApi({ permission: "hr:document_issue" }, async ({ actor, ctx, req }) => {
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return apiError(422, "VALIDATION", "A file is required.");
  const kind = String(fd.get("kind") ?? "");
  if (!(UPLOAD_KINDS as readonly string[]).includes(kind)) return apiError(422, "VALIDATION", "Invalid document kind.");
  const d = await uploadDocument(actor, { kind: kind as (typeof UPLOAD_KINDS)[number], title: String(fd.get("title") ?? ""), officerId: String(fd.get("officerId") ?? "") || undefined, confidential: fd.get("confidential") === "true" }, file, ctx);
  return apiOk({ ...d, snapshot: undefined }, { status: 201 });
});

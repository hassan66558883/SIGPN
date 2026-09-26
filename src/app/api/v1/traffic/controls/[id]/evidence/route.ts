import { apiOk, withApi } from "@/server/api";
import { attachEvidence } from "@/server/traffic/enforcement";
import { evidenceSchema } from "@/server/traffic/schemas";
import { BusinessError } from "@/server/errors";

type P = { id: string };

/** POST /api/v1/traffic/controls/{id}/evidence — multipart: `file` (photo/video/PDF), optional caption, latitude, longitude. */
export const POST = withApi<P>({ permission: "traffic:evidence_upload" }, async ({ actor, ctx, params, req }) => {
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) throw new BusinessError("`file` upload is required.");
  const entries: Record<string, string> = { controlId: params.id };
  for (const k of ["caption", "latitude", "longitude"]) {
    const v = fd.get(k);
    if (typeof v === "string") entries[k] = v;
  }
  const ev = await attachEvidence(actor, evidenceSchema.parse(entries), file, ctx);
  return apiOk(ev, { status: 201 });
});

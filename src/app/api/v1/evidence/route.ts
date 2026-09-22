import { z } from "zod";
import { apiOk, paginationSchema, parseQuery, withApi } from "@/server/api";
import { listEvidence } from "@/server/evidence/queries";
import { createEvidence } from "@/server/evidence/service";
import { evidenceSchema, EVIDENCE_CATEGORIES } from "@/server/evidence/schemas";
import { BusinessError } from "@/server/errors";

const querySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  category: z.enum(EVIDENCE_CATEGORIES).optional(),
  caseId: z.string().max(64).optional(),
});

export const GET = withApi({ permission: "evidence:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, querySchema);
  const r = await listEvidence(actor, q);
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

/** POST /api/v1/evidence — multipart form: evidence fields + optional `file`. */
export const POST = withApi({ permission: "evidence:create" }, async ({ actor, ctx, req }) => {
  const fd = await req.formData();
  const entries: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") entries[k] = v;
  const input = evidenceSchema.parse(entries);
  const file = fd.get("file");
  if (file !== null && !(file instanceof File)) throw new BusinessError("`file` must be a file upload.");
  const e = await createEvidence(actor, input, file instanceof File && file.size > 0 ? file : null, ctx);
  return apiOk(e, { status: 201 });
});

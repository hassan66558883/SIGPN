import { z } from "zod";
import { apiOk, paginationSchema, parseQuery, withApi } from "@/server/api";
import { biometricHistory } from "@/server/biometric/queries";

const querySchema = paginationSchema.extend({
  type: z.enum(["FINGERPRINT", "FACE", "VOICE", "ANPR"]).optional(),
  caseId: z.string().max(64).optional(),
  personId: z.string().max(64).optional(),
});

export const GET = withApi({ permission: "biometric:history_view" }, async ({ actor, req }) => {
  const q = parseQuery(req, querySchema);
  const r = await biometricHistory(actor, q);
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

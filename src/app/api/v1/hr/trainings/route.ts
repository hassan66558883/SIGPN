import { z } from "zod";
import { apiOk, paginationSchema, parseQuery, withApi } from "@/server/api";
import { TRAINING_KINDS, TRAINING_STATUSES, listTrainings } from "@/server/hr/training";

const query = paginationSchema.extend({ q: z.string().trim().max(100).optional(), kind: z.enum(TRAINING_KINDS).optional(), status: z.enum(TRAINING_STATUSES).optional(), expiringDays: z.coerce.number().int().min(1).max(730).optional() });

/** GET /api/v1/hr/trainings — trainings of officers inside the caller's scope. */
export const GET = withApi({ permission: "hr:view" }, async ({ actor, req }) => {
  const r = await listTrainings(actor, parseQuery(req, query));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { listOfficers } from "@/server/org/queries";
import { createOfficer } from "@/server/org/service";
import { officerSchema } from "@/server/org/schemas";

const querySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  stationId: z.string().max(64).optional(),
  departmentId: z.string().max(64).optional(),
  rankId: z.string().max(64).optional(),
  dutyStatus: z.enum(["ON_DUTY", "OFF_DUTY", "ON_LEAVE", "TRAINING", "SUSPENDED", "RETIRED", "DECEASED"]).optional(),
  includeInactive: z.coerce.boolean().optional(),
});

/** GET /api/v1/officers — officers inside the caller's territorial scope. */
export const GET = withApi({ permission: "officers:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, querySchema);
  const r = await listOfficers(actor, q);
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

/** POST /api/v1/officers — create an officer (scope-guarded). */
export const POST = withApi({ permission: "officers:manage" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, officerSchema);
  return apiOk(await createOfficer(actor, body, ctx), { status: 201 });
});

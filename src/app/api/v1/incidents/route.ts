import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { listIncidents } from "@/server/ops/queries";
import { createIncident } from "@/server/ops/service";
import { incidentSchema, INCIDENT_STATUSES, INCIDENT_TYPES, SEVERITIES } from "@/server/ops/schemas";

const querySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  type: z.enum(INCIDENT_TYPES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  status: z.enum(INCIDENT_STATUSES).optional(),
  stationId: z.string().max(64).optional(),
  open: z.coerce.boolean().optional(),
  mine: z.coerce.boolean().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const GET = withApi({ permission: "incidents:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, querySchema);
  const r = await listIncidents(actor, q);
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

export const POST = withApi({ permission: "incidents:create" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, incidentSchema);
  return apiOk(await createIncident(actor, body, ctx), { status: 201 });
});

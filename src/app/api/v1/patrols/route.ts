import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { listPatrols } from "@/server/ops/queries";
import { createPatrol } from "@/server/ops/service";
import { patrolSchema, PATROL_STATUSES, SHIFTS } from "@/server/ops/schemas";

const querySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(PATROL_STATUSES).optional(),
  shift: z.enum(SHIFTS).optional(),
  stationId: z.string().max(64).optional(),
  zoneId: z.string().max(64).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const GET = withApi({ permission: "patrols:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, querySchema);
  const r = await listPatrols(actor, q);
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

const createSchema = patrolSchema.extend({ officerIds: z.array(z.string().max(64)).max(30).default([]) });

export const POST = withApi({ permission: "patrols:manage" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, createSchema);
  const { officerIds, ...input } = body;
  return apiOk(await createPatrol(actor, input, officerIds, ctx), { status: 201 });
});

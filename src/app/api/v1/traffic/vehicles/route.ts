import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { createVehicle } from "@/server/traffic/registry";
import { listVehicles } from "@/server/traffic/queries";
import { TRAFFIC_VEHICLE_STATUSES, vehicleCreateSchema } from "@/server/traffic/schemas";

const query = paginationSchema.extend({ q: z.string().trim().max(100).optional(), plate: z.string().trim().max(20).optional(), status: z.enum(TRAFFIC_VEHICLE_STATUSES).optional() });

/** GET /api/v1/traffic/vehicles?plate=TD-1234-AB — search a vehicle directly by registration number (or free text with q). */
export const GET = withApi({ permission: "traffic:vehicles_view" }, async ({ req }) => {
  const { plate, ...q } = parseQuery(req, query);
  const r = await listVehicles({ ...q, q: plate ?? q.q });
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

export const POST = withApi({ permission: "traffic:vehicles_manage" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, vehicleCreateSchema);
  return apiOk(await createVehicle(actor, body, ctx), { status: 201 });
});

import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { createDriver } from "@/server/traffic/registry";
import { listDrivers } from "@/server/traffic/queries";
import { driverCreateSchema } from "@/server/traffic/schemas";

const query = paginationSchema.extend({ q: z.string().trim().max(100).optional(), expired: z.enum(["1", "true"]).optional() });

export const GET = withApi({ permission: "traffic:drivers_view" }, async ({ req }) => {
  const { expired, ...q } = parseQuery(req, query);
  const r = await listDrivers({ ...q, expired: !!expired });
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

export const POST = withApi({ permission: "traffic:drivers_manage" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, driverCreateSchema);
  return apiOk(await createDriver(actor, body, ctx), { status: 201 });
});

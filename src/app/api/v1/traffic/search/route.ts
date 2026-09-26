import { z } from "zod";
import { apiOk, paginationSchema, parseQuery, withApi } from "@/server/api";
import { searchTraffic } from "@/server/traffic/queries";
import { fineStatusQuery, rangeQuery } from "@/server/traffic/api-utils";

const t = z.string().trim().max(100).optional();
const query = paginationSchema.extend({ pv: t, fine: t, plate: t, driver: t, license: t, cni: t, violation: t, officer: t, stationId: z.string().max(64).optional(), fineStatus: fineStatusQuery, ...rangeQuery });

/** GET /api/v1/traffic/search — global search: PV, fine, plate, driver, licence, CNI (exact), offence, officer, station, date, payment status. */
export const GET = withApi({ permission: "traffic:view" }, async ({ actor, req }) => {
  const r = await searchTraffic(actor, parseQuery(req, query));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

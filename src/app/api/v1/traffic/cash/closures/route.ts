import { apiOk, parseQuery, withApi } from "@/server/api";
import { listClosures } from "@/server/traffic/cash-queries";
import { listQuery } from "@/server/traffic/api-utils";

/** GET /api/v1/traffic/cash/closures — daily closing statements. */
export const GET = withApi({}, async ({ actor, req }) => {
  const r = await listClosures(actor, parseQuery(req, listQuery));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

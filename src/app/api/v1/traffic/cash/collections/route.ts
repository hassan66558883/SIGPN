import { apiOk, parseQuery, withApi } from "@/server/api";
import { listCollections } from "@/server/traffic/cash-queries";
import { listQuery } from "@/server/traffic/api-utils";
import { z } from "zod";
import { CASH_COLLECTION_STATUSES } from "@/server/traffic/cash-schemas";

const query = listQuery.extend({ status: z.enum(CASH_COLLECTION_STATUSES).optional() });

/** GET /api/v1/traffic/cash/collections — collected revenue per closed register. */
export const GET = withApi({}, async ({ actor, req }) => {
  const r = await listCollections(actor, parseQuery(req, query));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total, sumCollected: r.sumCollected, sumDeposited: r.sumDeposited, sumValidated: r.sumValidated } });
});

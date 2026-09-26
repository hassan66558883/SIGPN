import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { CASH_DISCREPANCY_STATUSES } from "@/server/traffic/cash-schemas";
import { listDiscrepancies } from "@/server/traffic/cash-queries";
import { listQuery } from "@/server/traffic/api-utils";

const query = listQuery.extend({ status: z.enum(CASH_DISCREPANCY_STATUSES).optional() });

export const GET = withApi({}, async ({ actor, req }) => {
  const r = await listDiscrepancies(actor, parseQuery(req, query));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total, sumAmount: r.sumAmount } });
});

import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { CASH_RECONCILIATION_STATUSES } from "@/server/traffic/cash-schemas";
import { listReconciliations } from "@/server/traffic/cash-queries";
import { listQuery } from "@/server/traffic/api-utils";

const query = listQuery.extend({ status: z.enum(CASH_RECONCILIATION_STATUSES).optional() });

export const GET = withApi({ permission: "cash:view" }, async ({ actor, req }) => {
  const r = await listReconciliations(actor, parseQuery(req, query));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total, ...r.sums } });
});

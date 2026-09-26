import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { listFines } from "@/server/traffic/queries";
import { fineStatusQuery, listQuery } from "@/server/traffic/api-utils";

const query = listQuery.extend({ status: fineStatusQuery, stationId: z.string().max(64).optional(), overdue: z.enum(["1", "true"]).optional() });

export const GET = withApi({ permission: "traffic:view" }, async ({ actor, req }) => {
  const { overdue, ...q } = parseQuery(req, query);
  const r = await listFines(actor, { ...q, overdue: !!overdue });
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total, sumAmount: r.sumAmount, sumPaid: r.sumPaid } });
});

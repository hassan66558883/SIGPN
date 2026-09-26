import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { listTickets } from "@/server/traffic/queries";
import { fineStatusQuery, listQuery } from "@/server/traffic/api-utils";

const query = listQuery.extend({ status: z.enum(["ISSUED", "CANCELLED"]).optional(), fineStatus: fineStatusQuery, stationId: z.string().max(64).optional() });

export const GET = withApi({ permission: "traffic:view" }, async ({ actor, req }) => {
  const r = await listTickets(actor, parseQuery(req, query));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

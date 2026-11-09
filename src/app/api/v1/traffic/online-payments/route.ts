import { z } from "zod";
import { apiOk, paginationSchema, parseQuery, withApi } from "@/server/api";
import { listOnlinePayments } from "@/server/traffic/online-payments";

const query = paginationSchema.extend({ status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "EXPIRED"]).optional(), refund: z.enum(["1"]).optional(), q: z.string().trim().max(60).optional() });

/** GET /api/v1/traffic/online-payments — payments started on the public site, within scope (traffic:payment_record). refund=1: money taken but not credited. */
export const GET = withApi({ permission: "traffic:payment_record" }, async ({ actor, req }) => {
  const q = parseQuery(req, query);
  const r = await listOnlinePayments(actor, { status: q.status, refundOnly: q.refund === "1", q: q.q, page: q.page, pageSize: q.pageSize });
  return apiOk(r.rows, { meta: { total: r.total, page: q.page, pageSize: q.pageSize, pending: r.pending, refundRequired: r.refunds } });
});

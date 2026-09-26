import { z } from "zod";
import { apiOk, parseJson, parseQuery, withApi } from "@/server/api";
import { createDeposit } from "@/server/traffic/cash";
import { depositSchema, CASH_DEPOSIT_STATUSES } from "@/server/traffic/cash-schemas";
import { listDeposits } from "@/server/traffic/cash-queries";
import { listQuery } from "@/server/traffic/api-utils";

const query = listQuery.extend({ status: z.enum(CASH_DEPOSIT_STATUSES).optional() });

export const GET = withApi({}, async ({ actor, req }) => {
  const r = await listDeposits(actor, parseQuery(req, query));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total, sumDeposited: r.sumDeposited } });
});

/** POST /api/v1/traffic/cash/deposits — declares a deposit of a collection (cash:deposit_create). The supporting document is added through the web form. */
export const POST = withApi({ permission: "cash:deposit_create" }, async ({ actor, ctx, req }) => {
  return apiOk(await createDeposit(actor, await parseJson(req, depositSchema), null, ctx), { status: 201 });
});

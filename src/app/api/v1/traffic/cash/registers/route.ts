import { z } from "zod";
import { apiOk, parseJson, parseQuery, withApi } from "@/server/api";
import { openRegister } from "@/server/traffic/cash";
import { openRegisterSchema, CASH_REGISTER_STATUSES } from "@/server/traffic/cash-schemas";
import { listRegisters } from "@/server/traffic/cash-queries";
import { listQuery } from "@/server/traffic/api-utils";

const query = listQuery.extend({ status: z.enum(CASH_REGISTER_STATUSES).optional() });

/** GET /api/v1/traffic/cash/registers — cash registers in the caller's scope (a field agent sees their own). */
export const GET = withApi({}, async ({ actor, req }) => {
  const r = await listRegisters(actor, parseQuery(req, query));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

/** POST /api/v1/traffic/cash/registers — opens the caller's cash register (cash:register). */
export const POST = withApi({ permission: "cash:register" }, async ({ actor, ctx, req }) => {
  return apiOk(await openRegister(actor, await parseJson(req, openRegisterSchema), ctx), { status: 201 });
});

import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { listTransfers, proposeTransfer } from "@/server/hr/transfers";
import { TRANSFER_STATUSES, proposeTransferSchema } from "@/server/hr/transfer-schemas";

const querySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(TRANSFER_STATUSES).optional(),
  officerId: z.string().max(64).optional(),
});

/** GET /api/v1/hr/transfers — transfers whose origin or destination is in the caller's scope. */
export const GET = withApi({ permission: "hr:view" }, async ({ actor, req }) => {
  const r = await listTransfers(actor, parseQuery(req, querySchema));
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

/** POST /api/v1/hr/transfers — propose a transfer (enters the validation circuit; nothing moves yet). */
export const POST = withApi({ permission: "hr:transfer_propose" }, async ({ actor, ctx, req }) => {
  return apiOk(await proposeTransfer(actor, await parseJson(req, proposeTransferSchema), ctx), { status: 201 });
});

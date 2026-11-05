import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { elementSchema, listElements, requestElement } from "@/server/hr/pay";

const query = paginationSchema.extend({ status: z.enum(["PENDING", "ACTIVE", "REJECTED"]).optional(), officerId: z.string().max(64).optional() });

/** GET /api/v1/hr/pay/elements — pay elements granted to officers (the access is audited). */
export const GET = withApi({ permission: "hr:pay_view" }, async ({ actor, ctx, req }) => {
  const r = await listElements(actor, parseQuery(req, query), ctx);
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

/** POST /api/v1/hr/pay/elements — request a pay element for an officer (effective only once another person validates it). */
export const POST = withApi({ permission: "hr:pay_manage" }, async ({ actor, ctx, req }) => apiOk(await requestElement(actor, await parseJson(req, elementSchema), ctx), { status: 201 }));

import { z } from "zod";
import { apiOk, parseJson, parseQuery, withApi } from "@/server/api";
import { componentSchema, createComponent, listComponents } from "@/server/hr/pay";

/** GET /api/v1/hr/pay/components?all=1 — referential of pay elements (bonuses, allowances, benefits, deductions). */
export const GET = withApi({ permission: "hr:pay_view" }, async ({ actor, req }) => apiOk(await listComponents(actor, parseQuery(req, z.object({ all: z.string().optional() })).all === "1")));

/** POST /api/v1/hr/pay/components */
export const POST = withApi({ permission: "hr:pay_manage" }, async ({ actor, ctx, req }) => apiOk(await createComponent(actor, await parseJson(req, componentSchema), ctx), { status: 201 }));

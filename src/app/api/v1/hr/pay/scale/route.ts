import { apiOk, parseJson, withApi } from "@/server/api";
import { payScale, requestScaleEntry, scaleSchema } from "@/server/hr/pay";

/** GET /api/v1/hr/pay/scale — base salary of each rank (current, upcoming, pending, history). */
export const GET = withApi({ permission: "hr:pay_view" }, async ({ actor }) => apiOk(await payScale(actor)));

/** POST /api/v1/hr/pay/scale — request a base salary for a rank from a date (pending until another person validates it). */
export const POST = withApi({ permission: "hr:pay_manage" }, async ({ actor, ctx, req }) => apiOk(await requestScaleEntry(actor, await parseJson(req, scaleSchema), ctx), { status: 201 }));

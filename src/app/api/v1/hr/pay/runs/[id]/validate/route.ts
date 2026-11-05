import { apiOk, withApi } from "@/server/api";
import { validateRun } from "@/server/hr/pay";

/** POST /api/v1/hr/pay/runs/:id/validate — validate (and freeze) a statement; never by the person who generated it. */
export const POST = withApi<{ id: string }>({ permission: "hr:pay_validate" }, async ({ actor, ctx, params }) => {
  await validateRun(actor, params.id, ctx);
  return apiOk({ validated: true });
});

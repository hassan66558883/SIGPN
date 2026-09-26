import { apiOk, parseJson, withApi } from "@/server/api";
import { recordPayment } from "@/server/traffic/payments";
import { paymentSchema } from "@/server/traffic/schemas";

type P = { id: string };

/** POST /api/v1/traffic/fines/{id}/payments — records a payment and issues the receipt (traffic:payment_record). */
export const POST = withApi<P>({ permission: "traffic:payment_record" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, paymentSchema.omit({ fineId: true }));
  return apiOk(await recordPayment(actor, { ...body, fineId: params.id }, ctx), { status: 201 });
});

import { AuthError } from "@/server/errors";
import { apiOk, parseJson, withApi } from "@/server/api";
import { recordPayment } from "@/server/traffic/payments";
import { paymentSchema } from "@/server/traffic/schemas";

type P = { id: string };

/** POST /api/v1/traffic/fines/{id}/payments — records a payment and issues the receipt (traffic:payment_record, or cash:collect for a field agent). */
export const POST = withApi<P>({}, async ({ actor, ctx, params, req }) => {
  if (!actor.permissions.has("traffic:payment_record") && !actor.permissions.has("cash:collect")) throw new AuthError("forbidden", "Permission traffic:payment_record or cash:collect required");
  const body = await parseJson(req, paymentSchema.omit({ fineId: true }));
  return apiOk(await recordPayment(actor, { ...body, fineId: params.id }, ctx), { status: 201 });
});

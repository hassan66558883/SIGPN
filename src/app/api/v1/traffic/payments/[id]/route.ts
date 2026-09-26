import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { voidPayment } from "@/server/traffic/payments";

type P = { id: string };
const opSchema = z.object({ op: z.literal("void"), reason: z.string().trim().min(10).max(1000) });

/** PATCH /api/v1/traffic/payments/{id} — { op: "void", reason } (traffic:payment_void). Payments are never deleted. */
export const PATCH = withApi<P>({ permission: "traffic:payment_void" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, opSchema);
  await voidPayment(actor, { paymentId: params.id, reason: body.reason }, ctx);
  return apiOk({ id: params.id, status: "VOIDED" });
});

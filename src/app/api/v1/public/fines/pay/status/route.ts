import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { onlinePaymentStatus } from "@/server/traffic/online-payments";

/** POST /api/v1/public/fines/pay/status — { number, code }: where the payment stands (and the receipt once confirmed). */
export const POST = withApi({ public: true, bucket: "payApi" }, async ({ ctx, req }) => {
  const b = await parseJson(req, z.object({ number: z.string().trim().min(5).max(40), code: z.string().trim().min(8).max(64) }));
  return apiOk(await onlinePaymentStatus(b.number, b.code, ctx.ip));
});

import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { startOnlinePayment } from "@/server/traffic/online-payments";

const schema = z.object({
  pvNumber: z.string().trim().min(5).max(40),
  plate: z.string().trim().min(3).max(20),
  method: z.enum(["MOBILE_MONEY", "ELECTRONIC", "BANK_TRANSFER"]),
  phone: z.string().trim().max(24).optional(),
  amountFcfa: z.number().int().positive().max(100_000_000).optional(),
});

/**
 * POST /api/v1/public/fines/pay — starts an online payment. The fine is NOT settled here: it is settled when the operator confirms
 * (signed notification). The answer carries the payment number and a private access code to follow it.
 */
export const POST = withApi({ public: true, bucket: "payApi" }, async ({ ctx, req }) => {
  const b = await parseJson(req, schema);
  return apiOk(await startOnlinePayment(b, ctx.ip), { status: 201 });
});

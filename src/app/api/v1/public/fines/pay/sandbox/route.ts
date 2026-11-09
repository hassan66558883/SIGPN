import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { BusinessError } from "@/server/errors";
import { simulateOperator } from "@/server/traffic/online-payments";

/**
 * POST /api/v1/public/fines/pay/sandbox — { number, code, outcome }: plays the operator side in the SANDBOX only (confirms or refuses
 * the payment by sending the application its own signed notification). Refused for any real provider.
 */
export const POST = withApi({ public: true, bucket: "payApi" }, async ({ ctx, req }) => {
  if (!(process.env.TRAFFIC_ONLINE_PROVIDER || "off").toLowerCase().split(",").map((x) => x.trim()).includes("sandbox")) throw new BusinessError("Only available with the sandbox payment provider.", "STATE");
  const b = await parseJson(req, z.object({ number: z.string().trim().min(5).max(40), code: z.string().trim().min(8).max(64), outcome: z.enum(["SUCCESS", "FAILED"]) }));
  return apiOk(await simulateOperator(b.number, b.code, b.outcome, ctx));
});

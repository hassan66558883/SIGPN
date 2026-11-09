import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { lookupFineForPayer } from "@/server/traffic/online-payments";

/** POST /api/v1/public/fines/lookup — { pvNumber, plate }: the amount due on a fine. Same 404 for an unknown PV and a wrong plate; rate-limited. */
export const POST = withApi({ public: true, bucket: "payApi" }, async ({ ctx, req }) => {
  const b = await parseJson(req, z.object({ pvNumber: z.string().trim().min(5).max(40), plate: z.string().trim().min(3).max(20) }));
  return apiOk(await lookupFineForPayer(b.pvNumber, b.plate, ctx.ip));
});

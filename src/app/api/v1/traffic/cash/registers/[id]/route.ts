import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { closeRegister, setRegisterBlocked } from "@/server/traffic/cash";
import { getRegister } from "@/server/traffic/cash-queries";

type P = { id: string };
const opSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("close"), notes: z.string().trim().max(500).optional() }),
  z.object({ op: z.literal("block"), reason: z.string().trim().min(10).max(1000) }),
  z.object({ op: z.literal("unblock"), reason: z.string().trim().min(10).max(1000) }),
]);

export const GET = withApi<P>({}, async ({ actor, params }) => apiOk(await getRegister(actor, params.id)));

/** PATCH /api/v1/traffic/cash/registers/{id} — { op: "close" } (owner, cash:register) or { op: "block" | "unblock", reason } (cash:block). */
export const PATCH = withApi<P>({}, async ({ actor, ctx, params, req }) => {
  const b = await parseJson(req, opSchema);
  if (b.op === "close") {
    const r = await closeRegister(actor, { registerId: params.id, notes: b.notes }, ctx);
    return apiOk({ closureId: r.closure.id, closure: r.closure.number, collection: r.collection?.number ?? null, collectedFcfa: r.totals.collected, paymentsCount: r.totals.count });
  }
  await setRegisterBlocked(actor, { registerId: params.id, op: b.op, reason: b.reason }, ctx);
  return apiOk({ id: params.id, op: b.op });
});

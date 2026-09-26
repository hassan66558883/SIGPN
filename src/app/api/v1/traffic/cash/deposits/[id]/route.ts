import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { respondToJustification, reviewDeposit } from "@/server/traffic/cash";
import { getDeposit } from "@/server/traffic/cash-queries";

type P = { id: string };
const opSchema = z.object({ op: z.enum(["verify", "request_justification", "reject", "validate", "respond"]), note: z.string().trim().max(1000).optional() });

export const GET = withApi<P>({}, async ({ actor, params }) => apiOk(await getDeposit(actor, params.id)));

/** PATCH /api/v1/traffic/cash/deposits/{id} — { op: verify | request_justification | reject } (cash:deposit_review), validate (cash:deposit_validate), respond (agent). */
export const PATCH = withApi<P>({}, async ({ actor, ctx, params, req }) => {
  const b = await parseJson(req, opSchema);
  if (b.op === "respond") await respondToJustification(actor, { depositId: params.id, note: b.note ?? "" }, null, ctx);
  else await reviewDeposit(actor, { depositId: params.id, op: b.op, note: b.note }, ctx);
  return apiOk({ id: params.id, op: b.op });
});

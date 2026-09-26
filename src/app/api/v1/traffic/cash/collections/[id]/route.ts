import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { actOnReconciliation, verifyClosure } from "@/server/traffic/cash";
import { getCollection } from "@/server/traffic/cash-queries";

type P = { id: string };
const opSchema = z.object({ op: z.enum(["verify_closure", "finalize", "reject", "declare_gap"]), note: z.string().trim().max(1000).optional() });

export const GET = withApi<P>({}, async ({ actor, params }) => apiOk(await getCollection(actor, params.id)));

/** PATCH /api/v1/traffic/cash/collections/{id} — { op: "verify_closure" } (cash:verify_closure) or reconciliation ops (cash:reconcile). */
export const PATCH = withApi<P>({}, async ({ actor, ctx, params, req }) => {
  const b = await parseJson(req, opSchema);
  if (b.op === "verify_closure") await verifyClosure(actor, params.id, ctx);
  else await actOnReconciliation(actor, { collectionId: params.id, op: b.op, note: b.note }, ctx);
  return apiOk({ id: params.id, op: b.op });
});

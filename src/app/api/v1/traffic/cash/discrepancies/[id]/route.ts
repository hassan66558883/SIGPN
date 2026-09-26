import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { actOnDiscrepancy } from "@/server/traffic/cash";
import { getDiscrepancy } from "@/server/traffic/cash-queries";

type P = { id: string };
const opSchema = z.object({ op: z.enum(["justify", "validate", "reject"]), reason: z.string().trim().max(500).optional(), text: z.string().trim().max(2000).optional() });

export const GET = withApi<P>({}, async ({ actor, params }) => apiOk(await getDiscrepancy(actor, params.id)));

/** PATCH /api/v1/traffic/cash/discrepancies/{id} — { op: justify } (agent or cash:reconcile), validate / reject (cash:reconcile). Discrepancies are never deleted. */
export const PATCH = withApi<P>({}, async ({ actor, ctx, params, req }) => {
  const b = await parseJson(req, opSchema);
  await actOnDiscrepancy(actor, { discrepancyId: params.id, op: b.op, reason: b.reason, text: b.text }, null, ctx);
  return apiOk({ id: params.id, op: b.op });
});

import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { getFine } from "@/server/traffic/queries";
import { setFineStatus } from "@/server/traffic/enforcement";
import { need } from "@/server/traffic/api-utils";
import { TRAFFIC_FINE_STATUSES } from "@/server/traffic/schemas";

type P = { id: string };

export const GET = withApi<P>({ permission: "traffic:view" }, async ({ actor, params }) => apiOk(await getFine(actor, params.id)));

const opSchema = z.object({ op: z.literal("status"), status: z.enum(TRAFFIC_FINE_STATUSES), note: z.string().trim().max(1000).optional() });

/** PATCH /api/v1/traffic/fines/{id} — { op: "status", status, note } (traffic:fine_manage). PAID / PARTIALLY_PAID come from payments only. */
export const PATCH = withApi<P>({ permission: "traffic:view" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, opSchema);
  need(actor, "traffic:fine_manage");
  await setFineStatus(actor, { fineId: params.id, status: body.status, note: body.note }, ctx);
  return apiOk(await getFine(actor, params.id));
});

import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { getTicket } from "@/server/traffic/queries";
import { cancelTicket } from "@/server/traffic/enforcement";
import { need } from "@/server/traffic/api-utils";

type P = { id: string };

/** The seal itself (HMAC) is never returned; only its validity and a hash prefix. */
async function safeTicket(actor: Parameters<typeof getTicket>[0], id: string) {
  const { contentHash, signature, ...t } = await getTicket(actor, id);
  void signature;
  return { ...t, contentHashPrefix: contentHash.slice(0, 16) };
}

export const GET = withApi<P>({ permission: "traffic:view" }, async ({ actor, params }) => apiOk(await safeTicket(actor, params.id)));

const opSchema = z.object({ op: z.literal("cancel"), reason: z.string().trim().min(10).max(1000) });

/** PATCH /api/v1/traffic/tickets/{id} — { op: "cancel", reason } (traffic:ticket_cancel). */
export const PATCH = withApi<P>({ permission: "traffic:view" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, opSchema);
  need(actor, "traffic:ticket_cancel");
  await cancelTicket(actor, { ticketId: params.id, reason: body.reason }, ctx);
  return apiOk(await safeTicket(actor, params.id));
});

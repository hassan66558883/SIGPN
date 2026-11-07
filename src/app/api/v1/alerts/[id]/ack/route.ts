import { apiOk, withApi } from "@/server/api";
import { acknowledge } from "@/server/alerts/service";

/** POST /api/v1/alerts/{id}/ack — acknowledgement by the caller's unit (idempotent). */
export const POST = withApi<{ id: string }>({ permission: "alerts:ack" }, async ({ actor, ctx, params }) => apiOk(await acknowledge(actor, params.id, ctx)));

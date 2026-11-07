import { apiOk, withApi } from "@/server/api";
import { markRead } from "@/server/alerts/service";

/** POST /api/v1/alerts/{id}/read — read receipt of the caller's unit (idempotent). */
export const POST = withApi<{ id: string }>({ permission: "alerts:view" }, async ({ actor, ctx, params }) => apiOk(await markRead(actor, params.id, ctx)));

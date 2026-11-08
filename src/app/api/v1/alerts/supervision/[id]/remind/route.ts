import { apiOk, withApi } from "@/server/api";
import { remindPending } from "@/server/alerts/service";

/** POST /api/v1/alerts/supervision/{id}/remind — manual reminder to the units that have not acknowledged. */
export const POST = withApi<{ id: string }>({ permission: "alerts:supervise" }, async ({ actor, ctx, params }) => apiOk(await remindPending(actor, params.id, ctx)));

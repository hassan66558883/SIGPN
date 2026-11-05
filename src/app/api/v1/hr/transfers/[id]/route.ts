import { apiOk, withApi } from "@/server/api";
import { getTransfer } from "@/server/hr/transfers";

/** GET /api/v1/hr/transfers/:id */
export const GET = withApi<{ id: string }>({ permission: "hr:view" }, async ({ actor, params }) => apiOk(await getTransfer(actor, params.id)));

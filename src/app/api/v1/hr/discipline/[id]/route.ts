import { apiOk, withApi } from "@/server/api";
import { getCase } from "@/server/hr/discipline";

/** GET /api/v1/hr/discipline/:id — the full file with its steps (every read is audited). */
export const GET = withApi<{ id: string }>({ permission: "hr:discipline_view" }, async ({ actor, ctx, params }) => apiOk(await getCase(actor, params.id, ctx)));

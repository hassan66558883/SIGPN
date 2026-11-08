import { apiOk, withApi } from "@/server/api";
import { getInboxAlert } from "@/server/alerts/service";

export const GET = withApi<{ id: string }>({ permission: "alerts:view" }, async ({ actor, params }) => apiOk(await getInboxAlert(actor, params.id)));

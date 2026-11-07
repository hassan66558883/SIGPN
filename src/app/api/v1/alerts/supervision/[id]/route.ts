import { apiOk, withApi } from "@/server/api";
import { supervisionAlertDetail } from "@/server/alerts/service";

export const GET = withApi<{ id: string }>({ permission: "alerts:supervise" }, async ({ actor, params }) => apiOk(await supervisionAlertDetail(actor, params.id)));

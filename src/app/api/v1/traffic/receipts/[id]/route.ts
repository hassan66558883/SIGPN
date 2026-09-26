import { apiOk, withApi } from "@/server/api";
import { getReceipt } from "@/server/traffic/queries";

type P = { id: string };

export const GET = withApi<P>({ permission: "traffic:view" }, async ({ actor, params }) => apiOk(await getReceipt(actor, params.id)));

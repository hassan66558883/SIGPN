import { apiOk, withApi } from "@/server/api";
import { getClosure } from "@/server/traffic/cash-queries";

type P = { id: string };
export const GET = withApi<P>({}, async ({ actor, params }) => apiOk(await getClosure(actor, params.id)));

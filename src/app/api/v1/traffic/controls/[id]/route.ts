import { apiOk, withApi } from "@/server/api";
import { getControl } from "@/server/traffic/queries";
import { findWantedHits } from "@/server/traffic/enforcement";

type P = { id: string };

export const GET = withApi<P>({ permission: "traffic:view" }, async ({ actor, params }) => {
  const c = await getControl(actor, params.id);
  return apiOk({ ...c, wantedHits: await findWantedHits(c.driverPersonId, c.plateNumber) });
});

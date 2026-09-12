import { apiOk, withApi } from "@/server/api";
import { getStation } from "@/server/org/queries";

type P = { id: string };

/** GET /api/v1/stations/{id} — 404 when outside the caller's scope. */
export const GET = withApi<P>({ permission: "org:view" }, async ({ actor, params }) => {
  return apiOk(await getStation(actor, params.id));
});

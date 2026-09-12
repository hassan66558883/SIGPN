import { apiOk, withApi } from "@/server/api";
import { getOfficer } from "@/server/org/service";
import { officerAssignments } from "@/server/org/queries";

type P = { id: string };

/** GET /api/v1/officers/{id} — 404 when outside the caller's scope. */
export const GET = withApi<P>({ permission: "officers:view" }, async ({ actor, params }) => {
  const officer = await getOfficer(actor, params.id);
  const assignments = await officerAssignments(params.id);
  return apiOk({ ...officer, assignments });
});

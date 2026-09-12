import { apiOk, withApi } from "@/server/api";
import { getPerson } from "@/server/persons/service";

type P = { id: string };

/** GET /api/v1/persons/{id} — full record (identifiers, aliases, relationships, involvements); 404 outside scope. */
export const GET = withApi<P>({ permission: "persons:view" }, async ({ actor, params }) => {
  const p = await getPerson(actor, params.id);
  // Case involvements outside the caller's scope are hidden (sensitive-case rule applied by the case module on access).
  return apiOk(p);
});

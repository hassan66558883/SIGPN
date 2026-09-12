import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { searchPersons } from "@/server/persons/queries";

const schema = z.object({ q: z.string().trim().min(2).max(80), take: z.coerce.number().int().min(1).max(25).default(10) });

/** GET /api/v1/persons/search?q= — compact scoped search for pickers. */
export const GET = withApi({ permission: "persons:view" }, async ({ actor, req }) => {
  const { q, take } = parseQuery(req, schema);
  return apiOk(await searchPersons(actor, q, take));
});

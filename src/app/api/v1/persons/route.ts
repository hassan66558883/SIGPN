import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { listPersons } from "@/server/persons/queries";
import { createPerson } from "@/server/persons/service";
import { personSchema } from "@/server/persons/schemas";
import { BusinessError } from "@/server/errors";

const querySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]).optional(),
  regionId: z.string().max(64).optional(),
  stationId: z.string().max(64).optional(),
  includeMerged: z.coerce.boolean().optional(),
});

/** GET /api/v1/persons — persons registered inside the caller's scope. */
export const GET = withApi({ permission: "persons:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, querySchema);
  const r = await listPersons(actor, q);
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

/** POST /api/v1/persons — 409 with `duplicates` unless forceCreate="1". */
export const POST = withApi({ permission: "persons:create" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, personSchema);
  const r = await createPerson(actor, body, ctx);
  if (r.duplicates?.length) throw new BusinessError("Possible duplicate(s) found. Review them below, or confirm the creation.", "CONFLICT", Object.fromEntries(r.duplicates.map((d) => [d.number, d.reason])));
  return apiOk(r.person, { status: 201 });
});

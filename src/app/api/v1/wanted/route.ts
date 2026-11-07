import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { listWantedPersons } from "@/server/wanted/queries";
import { createWantedPerson } from "@/server/wanted/service";
import { wantedPersonSchema, DANGER_LEVELS, WANTED_KINDS, WANTED_STATUSES } from "@/server/wanted/schemas";

const querySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(WANTED_STATUSES).optional(),
  dangerLevel: z.enum(DANGER_LEVELS).optional(),
  kind: z.enum(WANTED_KINDS).optional(),
  stationId: z.string().max(64).optional(),
});

export const GET = withApi({ permission: "wanted:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, querySchema);
  const r = await listWantedPersons(actor, q);
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

export const POST = withApi({ permission: "wanted:create" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, wantedPersonSchema);
  const w = await createWantedPerson(actor, body, ctx);
  return apiOk(w, { status: 201 });
});

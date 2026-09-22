import { z } from "zod";
import { apiOk, parseJson, parseQuery, withApi } from "@/server/api";
import { operationalStations, zonesOf } from "@/server/ops/queries";
import { upsertZone } from "@/server/ops/service";
import { zoneSchema } from "@/server/ops/schemas";

const querySchema = z.object({ stationId: z.string().max(64).optional(), includeInactive: z.coerce.boolean().optional() });

/** GET /api/v1/patrols/zones — zones of the caller's operational stations (or one station). */
export const GET = withApi({ permission: "patrols:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, querySchema);
  const stations = await operationalStations(actor);
  const ids = stations.map((s) => s.id).filter((id) => !q.stationId || id === q.stationId);
  return apiOk(await zonesOf(ids, q.includeInactive));
});

export const POST = withApi({ permission: "patrols:manage" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, zoneSchema.omit({ id: true }));
  return apiOk(await upsertZone(actor, { ...body, id: "" }, ctx), { status: 201 });
});

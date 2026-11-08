import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { setSimulatedOffline } from "@/server/alerts/service";

/** POST /api/v1/alerts/units/{id}/presence — demonstration: set a unit offline / back online. */
export const POST = withApi<{ id: string }>({ permission: "alerts:simulate" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, z.object({ offline: z.boolean() }));
  return apiOk(await setSimulatedOffline(actor, params.id, body.offline, ctx));
});

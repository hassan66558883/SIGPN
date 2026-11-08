import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { publishSimulation } from "@/server/alerts/service";

/** POST /api/v1/alerts/simulate — fictitious alert for demonstrations (flagged SIMULATION, never linked to a real notice). */
export const POST = withApi({ permission: "alerts:simulate" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, z.object({ title: z.string().trim().min(3).max(120), diffusion: z.enum(["NATIONAL", "REGIONAL", "LOCAL"]).default("NATIONAL"), priority: z.enum(["LOW", "MEDIUM", "HIGH", "EXTREME"]).optional(), stationId: z.string().max(64).optional() }));
  const r = await publishSimulation(actor, body, ctx);
  return apiOk({ id: r.alert.id, number: r.alert.number, recipients: r.recipients }, { status: 201 });
});

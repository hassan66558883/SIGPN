import { z } from "zod";
import { apiError, apiOk, parseJson, withApi } from "@/server/api";
import * as svc from "@/server/ops/service";

type P = { id: string };

export const GET = withApi<P>({ permission: "patrols:view" }, async ({ actor, params }) => apiOk(await svc.getPatrol(actor, params.id)));

const opSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("start"), startKm: z.coerce.number().int().min(0).optional() }),
  z.object({ op: z.literal("complete"), endKm: z.coerce.number().int().min(0).optional(), report: z.string().min(10).max(8000) }),
  z.object({ op: z.literal("cancel"), reason: z.string().min(5).max(500) }),
  z.object({ op: z.literal("addOfficer"), officerId: z.string().min(1), role: z.string().max(60).optional() }),
]);

/** PATCH /api/v1/patrols/{id} — life-cycle operations (patrols:manage). */
export const PATCH = withApi<P>({ permission: "patrols:view" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, opSchema);
  if (!actor.permissions.has("patrols:manage")) return apiError(403, "FORBIDDEN", "patrols:manage required.");
  switch (body.op) {
    case "start":
      await svc.startPatrol(actor, params.id, body.startKm === undefined ? undefined : String(body.startKm), ctx);
      break;
    case "complete":
      await svc.completePatrol(actor, params.id, { endKm: body.endKm === undefined ? undefined : String(body.endKm), report: body.report }, ctx);
      break;
    case "cancel":
      await svc.cancelPatrol(actor, params.id, body.reason, ctx);
      break;
    case "addOfficer":
      await svc.addPatrolOfficer(actor, { patrolId: params.id, officerId: body.officerId, role: body.role }, ctx);
      break;
  }
  return apiOk(await svc.getPatrol(actor, params.id));
});

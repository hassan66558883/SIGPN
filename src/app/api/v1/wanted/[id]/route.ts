import { z } from "zod";
import { apiError, apiOk, withApi } from "@/server/api";
import * as svc from "@/server/wanted/service";
import { WANTED_STATUSES } from "@/server/wanted/schemas";

type P = { id: string };

export const GET = withApi<P>({ permission: "wanted:view" }, async ({ actor, params }) => apiOk(await svc.getWantedPerson(actor, params.id)));

const opSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("status"), status: z.enum(WANTED_STATUSES), closureNotes: z.string().max(2000).optional() }),
  z.object({ op: z.literal("addSighting"), location: z.string().min(2).max(300), occurredAt: z.string().min(1), source: z.string().max(120).optional(), notes: z.string().max(1000).optional() }),
  z.object({ op: z.literal("addVehicle"), plateNumber: z.string().max(20).optional(), make: z.string().max(60).optional(), model: z.string().max(60).optional(), color: z.string().max(40).optional(), year: z.string().max(4).optional(), notes: z.string().max(300).optional() }),
]);

/** PATCH /api/v1/wanted/{id} — status change (wanted:approve or wanted:status per transition), sightings and vehicles (wanted:update). */
export const PATCH = withApi<P>({ permission: "wanted:view" }, async ({ actor, ctx, params, req }) => {
  const body = opSchema.parse(await req.json());
  switch (body.op) {
    case "status": {
      const w = await svc.setWantedStatus(actor, { id: params.id, status: body.status, closureNotes: body.closureNotes }, ctx);
      return apiOk(w);
    }
    case "addSighting": {
      if (!actor.permissions.has("wanted:update")) return apiError(403, "FORBIDDEN", "wanted:update required.");
      const occurredAt = new Date(body.occurredAt);
      if (Number.isNaN(occurredAt.getTime())) return apiError(422, "VALIDATION", "Invalid occurredAt.");
      await svc.addSighting(actor, { wantedPersonId: params.id, location: body.location, occurredAt, source: body.source, notes: body.notes }, ctx);
      break;
    }
    case "addVehicle": {
      if (!actor.permissions.has("wanted:update")) return apiError(403, "FORBIDDEN", "wanted:update required.");
      await svc.addVehicle(actor, { wantedPersonId: params.id, plateNumber: body.plateNumber, make: body.make, model: body.model, color: body.color, year: body.year, notes: body.notes }, ctx);
      break;
    }
  }
  return apiOk(await svc.getWantedPerson(actor, params.id));
});

import { z } from "zod";
import { apiError, apiOk, parseJson, withApi } from "@/server/api";
import * as svc from "@/server/ops/service";

type P = { id: string };

export const GET = withApi<P>({ permission: "incidents:view" }, async ({ actor, params }) => apiOk(await svc.getIncident(actor, params.id)));

const opSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("status"), status: z.enum(["RESPONDING", "ON_SCENE", "RESOLVED", "CLOSED"]), report: z.string().max(8000).optional() }),
  z.object({ op: z.literal("escalate"), title: z.string().max(200).optional(), leadId: z.string().max(64).optional(), isSensitive: z.boolean().default(false) }),
  z.object({ op: z.literal("addOfficer"), officerId: z.string().min(1), role: z.string().max(60).optional() }),
  z.object({ op: z.literal("addPerson"), personId: z.string().min(1), role: z.enum(["COMPLAINANT", "VICTIM", "WITNESS", "SUSPECT", "PERSON_OF_INTEREST", "ACCUSED", "OTHER"]).default("OTHER"), notes: z.string().max(1000).optional() }),
]);

/** PATCH /api/v1/incidents/{id} — response operations (incidents:update; escalation also needs cases:create). */
export const PATCH = withApi<P>({ permission: "incidents:view" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, opSchema);
  const need = (perm: string) => (actor.permissions.has(perm) ? null : apiError(403, "FORBIDDEN", `${perm} required.`));
  const d = need("incidents:update");
  if (d) return d;
  switch (body.op) {
    case "status":
      await svc.setIncidentStatus(actor, params.id, body.status, body.report, ctx);
      break;
    case "escalate": {
      const e = need("cases:create");
      if (e) return e;
      const r = await svc.escalateIncident(actor, params.id, { title: body.title, leadId: body.leadId, isSensitive: body.isSensitive }, ctx);
      return apiOk(r);
    }
    case "addOfficer":
      await svc.addIncidentOfficer(actor, { incidentId: params.id, officerId: body.officerId, role: body.role }, ctx);
      break;
    case "addPerson":
      await svc.addIncidentPerson(actor, { incidentId: params.id, personId: body.personId, role: body.role, notes: body.notes }, ctx);
      break;
  }
  return apiOk(await svc.getIncident(actor, params.id));
});

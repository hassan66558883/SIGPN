import { z } from "zod";
import { apiError, apiOk, withApi } from "@/server/api";
import * as svc from "@/server/evidence/service";
import { CUSTODY_ACTIONS } from "@/server/evidence/schemas";

type P = { id: string };

export const GET = withApi<P>({ permission: "evidence:view" }, async ({ actor, params }) => apiOk(await svc.getEvidence(actor, params.id)));

const opSchema = z.object({ op: z.literal("transfer"), action: z.enum(CUSTODY_ACTIONS), toUserId: z.string().max(64).optional(), toLocationId: z.string().max(64).optional(), reason: z.string().trim().min(3).max(500), condition: z.string().max(300).optional(), notes: z.string().max(1000).optional() });

/** PATCH /api/v1/evidence/{id} — custody transfer (evidence:transfer). */
export const PATCH = withApi<P>({ permission: "evidence:view" }, async ({ actor, ctx, params, req }) => {
  const body = opSchema.parse(await req.json());
  if (!actor.permissions.has("evidence:transfer")) return apiError(403, "FORBIDDEN", "evidence:transfer required.");
  await svc.transferCustody(actor, { evidenceId: params.id, action: body.action, toUserId: body.toUserId, toLocationId: body.toLocationId, reason: body.reason, condition: body.condition, notes: body.notes }, ctx);
  return apiOk(await svc.getEvidence(actor, params.id));
});

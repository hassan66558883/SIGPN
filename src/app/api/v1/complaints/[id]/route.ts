import { z } from "zod";
import { apiError, apiOk, parseJson, withApi } from "@/server/api";
import * as svc from "@/server/complaints/service";
import { PRIORITIES } from "@/server/complaints/schemas";

type P = { id: string };

export const GET = withApi<P>({ permission: "complaints:view" }, async ({ actor, params }) => apiOk(await svc.getComplaint(actor, params.id)));

const opSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("register") }),
  z.object({ op: z.literal("review"), reviewNotes: z.string().max(2000).optional(), priority: z.enum(PRIORITIES).optional() }),
  z.object({ op: z.literal("assign"), assignedToId: z.string().min(1), reviewNotes: z.string().max(2000).optional() }),
  z.object({ op: z.literal("close"), outcome: z.enum(["CLOSED", "REJECTED"]), reason: z.string().min(5).max(1000) }),
  z.object({ op: z.literal("convert"), title: z.string().max(200).optional(), leadId: z.string().max(64).optional(), isSensitive: z.boolean().default(false) }),
]);

/** PATCH /api/v1/complaints/{id} — workflow operations; each requires its own permission. */
export const PATCH = withApi<P>({ permission: "complaints:view" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, opSchema);
  const need = (perm: string) => (actor.permissions.has(perm) ? null : apiError(403, "FORBIDDEN", `${perm} required.`));
  switch (body.op) {
    case "register": {
      const d = need("complaints:create");
      if (d) return d;
      await svc.registerComplaint(actor, params.id, ctx);
      break;
    }
    case "review": {
      const d = need("complaints:review");
      if (d) return d;
      await svc.reviewComplaint(actor, params.id, { reviewNotes: body.reviewNotes, priority: body.priority }, ctx);
      break;
    }
    case "assign": {
      const d = need("complaints:assign");
      if (d) return d;
      await svc.assignComplaint(actor, params.id, body.assignedToId, body.reviewNotes, ctx);
      break;
    }
    case "close": {
      const d = need("complaints:close");
      if (d) return d;
      await svc.closeComplaint(actor, params.id, body.outcome, body.reason, ctx);
      break;
    }
    case "convert": {
      const d = need("complaints:convert");
      if (d) return d;
      const k = await svc.convertToCase(actor, params.id, { title: body.title, leadId: body.leadId ?? null, isSensitive: body.isSensitive }, ctx);
      return apiOk({ complaint: await svc.getComplaint(actor, params.id), case: { id: k.id, number: k.number } });
    }
  }
  return apiOk(await svc.getComplaint(actor, params.id));
});

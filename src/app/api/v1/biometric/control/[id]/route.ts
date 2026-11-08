import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { getControl, notifySuperior, reportError, requestVerification, reviewControl } from "@/server/biometric/control";

type P = { id: string };

export const GET = withApi<P>({ permission: "biometric:control" }, async ({ actor, params }) => apiOk(await getControl(actor, params.id)));

const opSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("requestVerification") }),
  z.object({ op: z.literal("notifySuperior") }),
  z.object({ op: z.literal("reportError"), kind: z.enum(["FALSE_POSITIVE", "FALSE_NEGATIVE", "POOR_CAPTURE", "CONTESTED"]), notes: z.string().trim().max(1000).optional() }),
  z.object({ op: z.literal("review"), outcome: z.enum(["CONFIRMED", "REJECTED"]), notes: z.string().trim().max(1000).default("") }),
]);

/** PATCH /api/v1/biometric/control/{id} — the four buttons of the screen plus the human review (biometric:verify, never the same officer). */
export const PATCH = withApi<P>({ permission: "biometric:control" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, opSchema);
  switch (body.op) {
    case "requestVerification":
      await requestVerification(actor, params.id, ctx);
      break;
    case "notifySuperior":
      await notifySuperior(actor, params.id, ctx);
      break;
    case "reportError":
      await reportError(actor, params.id, { kind: body.kind, notes: body.notes }, ctx);
      break;
    case "review":
      await reviewControl(actor, params.id, { outcome: body.outcome, notes: body.notes }, ctx);
      break;
  }
  return apiOk(await getControl(actor, params.id));
});

import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { addDetentionLog, endDetention, extendDetention, getDetention } from "@/server/detention/service";
import { detentionLogSchema, endDetentionSchema, extendDetentionSchema } from "@/server/detention/schemas";
import { AuthError } from "@/server/errors";

type P = { id: string };

export const GET = withApi<P>({ permission: "detention:view" }, async ({ actor, params }) => apiOk(await getDetention(actor, params.id)));

/** PATCH { action: "log" | "extend" | "end", ... } — each action has its own permission. */
export const PATCH = withApi<P>({ permission: "detention:manage" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, z.object({ action: z.enum(["log", "extend", "end"]) }).passthrough());
  const detentionId = params.id;
  if (body.action === "log") return apiOk(await addDetentionLog(actor, detentionLogSchema.parse({ ...body, detentionId }), ctx));
  if (body.action === "extend") {
    if (!actor.permissions.has("detention:extend")) throw new AuthError("forbidden", "Permission detention:extend required");
    return apiOk(await extendDetention(actor, extendDetentionSchema.parse({ ...body, detentionId }), ctx));
  }
  return apiOk(await endDetention(actor, endDetentionSchema.parse({ ...body, detentionId }), ctx));
});

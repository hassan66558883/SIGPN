import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { decideWarrant, viewWarrant } from "@/server/warrants/service";
import { warrantDecisionSchema } from "@/server/warrants/schemas";

type P = { id: string };

export const GET = withApi<P>({ permission: "warrants:view" }, async ({ actor, ctx, params }) => apiOk(await viewWarrant(actor, params.id, ctx)));

export const PATCH = withApi<P>({ permission: "warrants:view" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, warrantDecisionSchema.omit({ warrantId: true }).extend({ notes: z.string().max(2000).optional() }));
  return apiOk(await decideWarrant(actor, { ...body, warrantId: params.id }, ctx));
});

import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { openCaseFromTicket } from "@/server/traffic/enforcement";

type P = { id: string };
const body = z.object({ title: z.string().trim().max(200).optional(), description: z.string().trim().max(4000).optional() });

/** POST /api/v1/traffic/tickets/{id}/case — opens a case from the PV (needs cases:create). */
export const POST = withApi<P>({ permission: "traffic:view" }, async ({ actor, ctx, params, req }) => {
  const b = await parseJson(req, body);
  const kase = await openCaseFromTicket(actor, params.id, b, ctx);
  return apiOk({ id: kase.id, number: kase.number }, { status: 201 });
});

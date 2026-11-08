import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { convertToComplaint, getSubmission, submissionUpdateSchema, updateSubmission } from "@/server/public/admin";

type P = { id: string };

/** GET — one submission with the declarant's contact data: personal data, every consultation is audited. */
export const GET = withApi<P>({ permission: "intake:view" }, async ({ actor, ctx, params }) => apiOk(await getSubmission(actor, params.id, ctx)));

const opSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("update"), status: submissionUpdateSchema.shape.status, publicReply: z.string().trim().max(1500).optional() }),
  z.object({ op: z.literal("convert"), stationId: z.string().max(64).optional() }),
]);

export const PATCH = withApi<P>({ permission: "intake:manage" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, opSchema);
  if (body.op === "convert") {
    const c = await convertToComplaint(actor, params.id, body.stationId || null, ctx);
    return apiOk({ complaintId: c.id, complaintNumber: c.number });
  }
  await updateSubmission(actor, { id: params.id, status: body.status, publicReply: body.publicReply || undefined }, ctx);
  return apiOk(await getSubmission(actor, params.id));
});

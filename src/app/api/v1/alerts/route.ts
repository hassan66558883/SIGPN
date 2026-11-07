import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { listInbox } from "@/server/alerts/service";

const querySchema = z.object({
  afterSeq: z.coerce.number().int().min(0).optional(),
  status: z.enum(["PENDING", "DELIVERED", "READ", "ACKNOWLEDGED", "FAILED"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

/** GET /api/v1/alerts — inbox of the caller's unit. Fetching pending items is the delivery receipt; `afterSeq` resumes after an outage. */
export const GET = withApi({ permission: "alerts:view" }, async ({ actor, ctx, req }) => {
  const q = parseQuery(req, querySchema);
  const r = await listInbox(actor, q, ctx);
  return apiOk(r.items, { meta: { offline: r.offline, caughtUp: r.caughtUp } as never });
});

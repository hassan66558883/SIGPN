import { z } from "zod";
import { apiOk, parseJson, parseQuery, withApi } from "@/server/api";
import { getRollCall, recordRollCall } from "@/server/hr/attendance";
import { rollCallSchema } from "@/server/hr/attendance-schemas";

const query = z.object({ stationId: z.string().min(1).max(64), date: z.string().optional() });

/** GET /api/v1/hr/attendance?stationId=&date= — the roll-call sheet of a structure for a day (default: today). */
export const GET = withApi({ permission: "hr:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, query);
  const date = q.date ? new Date(q.date) : new Date();
  if (Number.isNaN(date.getTime())) return apiOk(null, { status: 422 });
  return apiOk(await getRollCall(actor, q.stationId, date));
});

/** PUT /api/v1/hr/attendance — record the roll-call (PRESENT / LATE / ABSENT) of a structure for a day. */
export const PUT = withApi({ permission: "hr:attendance_record" }, async ({ actor, ctx, req }) => apiOk(await recordRollCall(actor, await parseJson(req, rollCallSchema), ctx)));

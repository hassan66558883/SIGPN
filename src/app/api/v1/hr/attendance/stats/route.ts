import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { attendanceStats } from "@/server/hr/attendance";

const query = z.object({ from: z.string().optional(), to: z.string().optional(), stationId: z.string().max(64).optional() });

/** GET /api/v1/hr/attendance/stats?from=&to=&stationId= — presence statistics inside the caller's scope (default: last 30 days). */
export const GET = withApi({ permission: "hr:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, query);
  const to = q.to ? new Date(q.to) : new Date();
  const from = q.from ? new Date(q.from) : new Date(to.getTime() - 29 * 86_400_000);
  return apiOk(await attendanceStats(actor, { from, to, stationId: q.stationId }));
});

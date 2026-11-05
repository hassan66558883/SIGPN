import { apiOk, withApi } from "@/server/api";
import { rotationOverview } from "@/server/hr/rotation";

/** GET /api/v1/hr/rotation — AFFECTATION_AUTOMATIQUE status, parameters, last run and upcoming/due officers in scope. */
export const GET = withApi({ permission: "hr:view" }, async ({ actor }) => {
  const o = await rotationOverview(actor);
  return apiOk({ settings: o.cfg, dueCount: o.dueCount, upcomingCount: o.upcomingCount, lastRun: o.lastRun, officers: o.rows.map((r) => ({ id: r.id, badgeNumber: r.badgeNumber, currentPostSince: r.currentPostSince, hasException: r.rotationExceptions.length > 0, openTransfer: r.transferRequests[0]?.number ?? null })) });
});

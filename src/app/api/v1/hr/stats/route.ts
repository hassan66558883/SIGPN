import { apiOk, parseQuery, withApi } from "@/server/api";
import { hrStatistics, statsQuery } from "@/server/hr/stats";

const date = (s?: string) => {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** GET /api/v1/hr/stats?from=&to=&regionId=&stationId=&rankId= — HR statistics inside the caller's scope (stock figures today, flow figures over the period). */
export const GET = withApi({ permission: "hr:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, statsQuery);
  return apiOk(await hrStatistics(actor, { from: date(q.from), to: date(q.to), regionId: q.regionId, stationId: q.stationId, rankId: q.rankId }));
});

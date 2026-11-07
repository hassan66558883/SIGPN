import "dotenv/config";
import Module from "node:module";

const m = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolve = m._resolveFilename;
m._resolveFilename = function (request: string, ...rest: unknown[]) {
  return request === "server-only" ? require.resolve("./empty.cjs") : resolve.call(this, request, ...rest);
};

async function main() {
  const { operationalStats } = await import("../src/server/dashboard/stats");
  const { prisma } = await import("../src/server/db");
  const perms = new Set(["incidents:view", "officers:view", "cases:view", "complaints:view", "wanted:view"]);
  const station = await prisma.station.findFirst({ where: { code: "CS-01" }, select: { id: true, regionId: true } });
  const national = { scopeLevel: "NATIONAL", permissions: perms, regionId: null, stationIds: [] } as never;
  const local = { scopeLevel: "STATION", permissions: perms, regionId: station!.regionId, stationIds: [station!.id] } as never;
  const nat = await operationalStats(national, { days: 30 });
  const loc = await operationalStats(local, { days: 30 });
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rawNat = await prisma.incident.count({ where: { occurredAt: { gte: since } } });
  const rawLoc = await prisma.incident.count({ where: { occurredAt: { gte: since }, stationId: station!.id } });
  const rawOff = await prisma.officer.count({ where: { isActive: true, deletedAt: null } });
  console.log("national", { officers: nat.officers, stations: nat.stations, incidents: nat.incidents, cases: nat.cases, complaints: nat.complaints, wanted: nat.wanted, trendSum: nat.trend!.reduce((s, x) => s + x.value, 0), typeSum: nat.byType!.reduce((s, x) => s + x.count, 0) });
  console.log("local   ", { officers: loc.officers, stations: loc.stations, incidents: loc.incidents, cases: loc.cases, wanted: loc.wanted });
  console.log("raw", { rawNat, rawLoc, rawOff });
  const ok = nat.incidents === rawNat && loc.incidents === rawLoc && nat.officers === rawOff && nat.byType!.reduce((s, x) => s + x.count, 0) === rawNat && (loc.incidents ?? 0) <= (nat.incidents ?? 0) && loc.stations === 1;
  const none = await operationalStats({ scopeLevel: "STATION", permissions: new Set(), regionId: null, stationIds: [] } as never, {});
  console.log("no-permission actor sees", JSON.stringify({ o: none.officers, i: none.incidents, w: none.wanted }), ok ? "PASS" : "FAIL");
  process.exit(ok && none.officers === null ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });

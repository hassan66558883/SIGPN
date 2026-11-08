import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { scopeWhere, type Actor } from "@/server/auth/dal";
import { wantedScopeWhere } from "@/server/wanted/service";
import { buckets, parsePeriod } from "@/lib/dash-period";

export type DashFilter = { days?: number; regionId?: string };

/**
 * Operational figures for the dashboard. Every number is computed from the real tables inside the actor's territorial scope;
 * a KPI the actor has no permission for is returned as null (never as 0), so the UI can hide it.
 */
export async function operationalStats(actor: Actor, filter: DashFilter = {}) {
  const days = parsePeriod(String(filter.days ?? 30));
  const since = new Date(Date.now() - days * 86_400_000);
  const regionFilter = actor.scopeLevel === "NATIONAL" && filter.regionId ? filter.regionId : null;
  const nationalRegion = regionFilter ? { regionId: regionFilter } : {};
  const has = (p: string) => actor.permissions.has(p);

  const incidentWhere: Prisma.IncidentWhereInput = { AND: [scopeWhere(actor), nationalRegion] };
  const caseWhere: Prisma.CaseWhereInput = { AND: [scopeWhere(actor), nationalRegion], status: { notIn: ["CLOSED", "ARCHIVED"] } };
  const complaintWhere: Prisma.ComplaintWhereInput = { AND: [scopeWhere(actor), nationalRegion], receivedAt: { gte: since } };
  const officerWhere: Prisma.OfficerWhereInput = { AND: [scopeWhere(actor, { via: "station" }), regionFilter ? { station: { regionId: regionFilter } } : {}], isActive: true, deletedAt: null };
  const stationWhere: Prisma.StationWhereInput = {
    isActive: true,
    ...(actor.scopeLevel === "REGIONAL" ? { regionId: actor.regionId ?? "-" } : actor.scopeLevel === "NATIONAL" ? (regionFilter ? { regionId: regionFilter } : {}) : { id: { in: actor.stationIds?.length ? actor.stationIds : ["-"] } }),
  };
  const wantedWhere: Prisma.WantedPersonWhereInput = { AND: [wantedScopeWhere(actor), nationalRegion], status: "ACTIVE" };

  const bs = buckets(days);
  const canIncidents = has("incidents:view");
  const [officers, stations, incidents, cases, complaints, wanted, byType, trend, recentIncidents, recentWanted] = await Promise.all([
    has("officers:view") ? prisma.officer.count({ where: officerWhere }) : null,
    has("officers:view") || canIncidents ? prisma.station.count({ where: stationWhere }) : null,
    canIncidents ? prisma.incident.count({ where: { ...incidentWhere, occurredAt: { gte: since } } }) : null,
    has("cases:view") ? prisma.case.count({ where: caseWhere }) : null,
    has("complaints:view") ? prisma.complaint.count({ where: complaintWhere }) : null,
    has("wanted:view") ? prisma.wantedPerson.count({ where: wantedWhere }) : null,
    canIncidents ? prisma.incident.groupBy({ by: ["type"], where: { ...incidentWhere, occurredAt: { gte: since } }, _count: true }) : null,
    canIncidents ? Promise.all(bs.map((b) => prisma.incident.count({ where: { ...incidentWhere, occurredAt: { gte: b.start, lt: b.end } } }))) : null,
    canIncidents ? prisma.incident.findMany({ where: incidentWhere, orderBy: { occurredAt: "desc" }, take: 6, select: { id: true, number: true, title: true, type: true, severity: true, occurredAt: true, station: { select: { name: true } } } }) : null,
    has("wanted:view") ? prisma.wantedPerson.findMany({ where: wantedWhere, orderBy: { issuedAt: "desc" }, take: 5, select: { id: true, number: true, offense: true, dangerLevel: true, issuedAt: true, person: { select: { firstName: true, lastName: true } } } }) : null,
  ]);
  return {
    days,
    officers,
    stations,
    incidents,
    cases,
    complaints,
    wanted,
    byType: byType ? byType.map((r) => ({ type: r.type as string, count: r._count })).sort((a, b) => b.count - a.count) : null,
    trend: trend ? bs.map((b, i) => ({ label: b.label, value: trend[i] })) : null,
    recentIncidents,
    recentWanted,
  };
}

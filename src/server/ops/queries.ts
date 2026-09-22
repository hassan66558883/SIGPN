import "server-only";
import type { IncidentStatus, IncidentType, PatrolStatus, Prisma, Severity, Shift } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import type { Actor } from "@/server/auth/dal";
import { incidentScopeWhere, patrolScopeWhere } from "@/server/ops/service";

const ci = (v: string): Prisma.StringFilter => ({ contains: v, mode: "insensitive" });

export async function listIncidents(actor: Actor, filter: { q?: string; type?: IncidentType; severity?: Severity; status?: IncidentStatus; stationId?: string; open?: boolean; mine?: boolean; from?: Date; to?: Date; page?: number; pageSize?: number } = {}) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const q = filter.q?.trim();
  const where: Prisma.IncidentWhereInput = {
    AND: [incidentScopeWhere(actor), ...(filter.mine ? [{ OR: [{ reportedById: actor.id }, ...(actor.officerId ? [{ officers: { some: { officerId: actor.officerId } } }] : [])] }] : [])],
    ...(filter.type ? { type: filter.type } : {}),
    ...(filter.severity ? { severity: filter.severity } : {}),
    ...(filter.status ? { status: filter.status } : filter.open ? { status: { in: ["REPORTED", "RESPONDING", "ON_SCENE"] } } : {}),
    ...(filter.stationId ? { stationId: filter.stationId } : {}),
    ...(filter.from || filter.to ? { occurredAt: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } } : {}),
    ...(q ? { OR: [{ number: ci(q) }, { title: ci(q) }, { locationText: ci(q) }, { description: ci(q) }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, number: true, type: true, severity: true, title: true, status: true, occurredAt: true, reportedAt: true, locationText: true, station: { select: { code: true, name: true } }, reportedBy: { select: { firstName: true, lastName: true } }, case: { select: { id: true, number: true } }, patrol: { select: { id: true, number: true } }, _count: { select: { officers: true, persons: true } } },
    }),
    prisma.incident.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function incidentCounts(actor: Actor) {
  const rows = await prisma.incident.groupBy({ by: ["status"], where: incidentScopeWhere(actor), _count: true });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = r._count;
  return out;
}

export async function listPatrols(actor: Actor, filter: { q?: string; status?: PatrolStatus; shift?: Shift; stationId?: string; zoneId?: string; from?: Date; to?: Date; page?: number; pageSize?: number } = {}) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const q = filter.q?.trim();
  const where: Prisma.PatrolWhereInput = {
    AND: [patrolScopeWhere(actor)],
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.shift ? { shift: filter.shift } : {}),
    ...(filter.stationId ? { stationId: filter.stationId } : {}),
    ...(filter.zoneId ? { zoneId: filter.zoneId } : {}),
    ...(filter.from || filter.to ? { plannedStart: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } } : {}),
    ...(q ? { OR: [{ number: ci(q) }, { mission: ci(q) }, { zone: { name: ci(q) } }, { supervisor: { lastName: ci(q) } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.patrol.findMany({
      where,
      orderBy: [{ plannedStart: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, number: true, shift: true, mission: true, plannedStart: true, plannedEnd: true, actualStart: true, actualEnd: true, status: true, station: { select: { code: true, name: true } }, zone: { select: { code: true, name: true } }, supervisor: { select: { firstName: true, lastName: true, badgeNumber: true } }, vehicle: { select: { fleetNumber: true } }, _count: { select: { officers: true, incidents: true } } },
    }),
    prisma.patrol.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function patrolCounts(actor: Actor) {
  const rows = await prisma.patrol.groupBy({ by: ["status"], where: patrolScopeWhere(actor), _count: true });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = r._count;
  return out;
}

/** Stations an actor can plan operations for (operational structures inside the scope). */
export async function operationalStations(actor: Actor) {
  const where: Prisma.StationWhereInput = actor.scopeLevel === "NATIONAL" ? {} : actor.scopeLevel === "REGIONAL" ? { regionId: actor.regionId ?? "__none__" } : { id: { in: actor.stationIds?.length ? actor.stationIds : ["__none__"] } };
  return prisma.station.findMany({ where: { isActive: true, ...where, type: { notIn: ["HEADQUARTERS", "PROVINCIAL_DIRECTION", "DEPARTMENTAL_DIRECTION"] } }, orderBy: [{ name: "asc" }], select: { id: true, code: true, name: true } });
}

export async function zonesOf(stationIds: string[], includeInactive = false) {
  if (!stationIds.length) return [];
  return prisma.zone.findMany({ where: { stationId: { in: stationIds }, ...(includeInactive ? {} : { isActive: true }) }, orderBy: [{ stationId: "asc" }, { code: "asc" }], select: { id: true, code: true, name: true, description: true, isActive: true, stationId: true, station: { select: { code: true } }, _count: { select: { patrols: true } } } });
}

export async function vehiclesOf(stationIds: string[]) {
  if (!stationIds.length) return [];
  return prisma.vehicle.findMany({ where: { stationId: { in: stationIds }, isActive: true, status: { in: ["AVAILABLE", "IN_USE"] } }, orderBy: [{ fleetNumber: "asc" }], select: { id: true, fleetNumber: true, plateNumber: true, make: true, model: true, status: true, stationId: true } });
}

export async function officersOf(stationIds: string[]) {
  if (!stationIds.length) return [];
  return prisma.officer.findMany({ where: { stationId: { in: stationIds }, isActive: true, deletedAt: null, dutyStatus: { notIn: ["SUSPENDED", "RETIRED", "DECEASED"] } }, orderBy: [{ rank: { level: "desc" } }, { lastName: "asc" }], select: { id: true, badgeNumber: true, firstName: true, lastName: true, stationId: true, rank: { select: { name: true } }, station: { select: { code: true } } } });
}

/** Active patrols of a station (for linking a new incident). */
export async function activePatrolsOf(stationIds: string[]) {
  if (!stationIds.length) return [];
  return prisma.patrol.findMany({ where: { stationId: { in: stationIds }, status: { in: ["PLANNED", "ACTIVE"] } }, orderBy: [{ plannedStart: "desc" }], take: 50, select: { id: true, number: true, mission: true, status: true, stationId: true } });
}

/** Ids of the stations an actor may write to, for select lists (station actors: own scope; wider: given station). */
export function stationIdsForForms(actor: Actor, stationId?: string | null): string[] {
  if (actor.stationIds && actor.stationIds.length) return actor.stationIds;
  return stationId ? [stationId] : [];
}

import "server-only";
import type { DutyStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import { NotFoundError } from "@/server/errors";

export async function organizationOverview() {
  const [org, regions, ranks, totals] = await Promise.all([
    prisma.organization.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    prisma.region.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { stations: true, users: true } } } }),
    prisma.rank.findMany({ orderBy: [{ level: "desc" }], include: { _count: { select: { officers: true } } } }),
    Promise.all([prisma.station.count({ where: { isActive: true } }), prisma.department.count({ where: { isActive: true } }), prisma.officer.count({ where: { isActive: true, deletedAt: null } })]),
  ]);
  const stationsByRegion = await prisma.station.groupBy({ by: ["regionId"], where: { isActive: true }, _count: true });
  const officersByRegion = await prisma.officer.findMany({ where: { isActive: true, deletedAt: null }, select: { station: { select: { regionId: true } } } });
  const officerCount = new Map<string, number>();
  for (const o of officersByRegion) officerCount.set(o.station.regionId, (officerCount.get(o.station.regionId) ?? 0) + 1);
  return {
    org,
    regions: regions.map((r) => ({ ...r, activeStations: stationsByRegion.find((s) => s.regionId === r.id)?._count ?? 0, officers: officerCount.get(r.id) ?? 0 })),
    ranks,
    totals: { stations: totals[0], departments: totals[1], officers: totals[2] },
  };
}

export async function getRegion(id: string) {
  const r = await prisma.region.findUnique({
    where: { id },
    include: {
      organization: { select: { name: true } },
      stations: { orderBy: { name: "asc" }, include: { commander: { select: { id: true, firstName: true, lastName: true, badgeNumber: true } }, _count: { select: { departments: true, officers: true, users: true } } } },
    },
  });
  if (!r) throw new NotFoundError("Region");
  return r;
}

export async function getStation(actor: Actor, id: string) {
  const s = await prisma.station.findUnique({
    where: { id },
    include: {
      region: { select: { id: true, code: true, name: true } },
      commander: { select: { id: true, firstName: true, lastName: true, badgeNumber: true, rank: { select: { name: true } } } },
      departments: { orderBy: { name: "asc" }, include: { head: { select: { id: true, firstName: true, lastName: true, badgeNumber: true } }, _count: { select: { officers: true } } } },
      _count: { select: { officers: true, users: true, vehicles: true } },
    },
  });
  if (!s) throw new NotFoundError("Station");
  // Reading master data is allowed for everyone with org:view; details are still scoped for regional/station actors.
  if (!inScope(actor, { stationId: s.id, regionId: s.regionId }) && actor.scopeLevel !== "NATIONAL") {
    if (actor.scopeLevel === "REGIONAL" && actor.regionId !== s.regionId) throw new NotFoundError("Station");
  }
  return s;
}

export async function listOfficers(actor: Actor, filter: { q?: string; stationId?: string; departmentId?: string; rankId?: string; dutyStatus?: DutyStatus; includeInactive?: boolean; page?: number; pageSize?: number } = {}) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const scope = actor.scopeLevel === "REGIONAL" ? { station: { regionId: actor.regionId ?? "__none__" } } : scopeWhere(actor, { stationId: "stationId" });
  const where = {
    deletedAt: null,
    ...(filter.includeInactive ? {} : { isActive: true }),
    ...(actor.scopeLevel === "REGIONAL" ? scope : scope),
    ...(filter.stationId ? { stationId: filter.stationId } : {}),
    ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
    ...(filter.rankId ? { rankId: filter.rankId } : {}),
    ...(filter.dutyStatus ? { dutyStatus: filter.dutyStatus } : {}),
    ...(filter.q
      ? { OR: [{ badgeNumber: { contains: filter.q, mode: "insensitive" as const } }, { firstName: { contains: filter.q, mode: "insensitive" as const } }, { lastName: { contains: filter.q, mode: "insensitive" as const } }, { phone: { contains: filter.q } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.officer.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, badgeNumber: true, firstName: true, lastName: true, gender: true, dutyStatus: true, isActive: true, phone: true, rank: { select: { code: true, name: true, level: true } }, station: { select: { id: true, code: true, name: true } }, department: { select: { id: true, code: true, name: true } }, user: { select: { username: true } } },
    }),
    prisma.officer.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function officerAssignments(officerId: string) {
  return prisma.officerAssignment.findMany({
    where: { officerId },
    orderBy: { startDate: "desc" },
    include: { station: { select: { code: true, name: true } }, department: { select: { code: true, name: true } }, rank: { select: { code: true, name: true } }, createdBy: { select: { username: true } } },
  });
}

/** Reference lists for forms (active only), scoped for non-national actors. */
export async function orgReferences(actor: Actor) {
  const regionWhere = actor.scopeLevel === "NATIONAL" ? {} : { id: actor.regionId ?? "__none__" };
  const stationWhere = actor.scopeLevel === "NATIONAL" ? {} : actor.scopeLevel === "REGIONAL" ? { regionId: actor.regionId ?? "__none__" } : { id: actor.stationId ?? "__none__" };
  const [regions, stations, departments, ranks] = await Promise.all([
    prisma.region.findMany({ where: { isActive: true, ...regionWhere }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.station.findMany({ where: { isActive: true, ...stationWhere }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, regionId: true, type: true } }),
    prisma.department.findMany({ where: { isActive: true, station: stationWhere }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, stationId: true, type: true } }),
    prisma.rank.findMany({ where: { isActive: true }, orderBy: { level: "desc" }, select: { id: true, code: true, name: true, level: true, category: true } }),
  ]);
  return { regions, stations, departments, ranks };
}

export async function stationOfficersForSelect(stationId: string) {
  return prisma.officer.findMany({ where: { stationId, isActive: true, deletedAt: null }, orderBy: [{ rank: { level: "desc" } }, { lastName: "asc" }], select: { id: true, badgeNumber: true, firstName: true, lastName: true, rank: { select: { name: true } } } });
}

export async function officersWithoutAccount(actor: Actor) {
  const scope = actor.scopeLevel === "REGIONAL" ? { station: { regionId: actor.regionId ?? "__none__" } } : scopeWhere(actor, { stationId: "stationId" });
  return prisma.officer.findMany({ where: { userId: null, isActive: true, deletedAt: null, ...scope }, orderBy: { lastName: "asc" }, select: { id: true, badgeNumber: true, firstName: true, lastName: true, stationId: true } });
}

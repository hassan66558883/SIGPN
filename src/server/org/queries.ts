import "server-only";
import type { DutyStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { canManageRegion, inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import { NotFoundError } from "@/server/errors";

/** Provinces visible to the actor (NATIONAL: all; others: own province). */
function regionFilter(actor: Actor) {
  return actor.scopeLevel === "NATIONAL" ? {} : { id: actor.regionId ?? "__none__" };
}

export async function organizationOverview(actor: Actor) {
  const rf = regionFilter(actor);
  const [org, regions, ranks, totals] = await Promise.all([
    prisma.organization.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    prisma.region.findMany({ where: rf, orderBy: { name: "asc" }, include: { _count: { select: { stations: true, users: true, adminDepartments: true } } } }),
    prisma.rank.findMany({ orderBy: [{ level: "desc" }], include: { _count: { select: { officers: true } } } }),
    Promise.all([
      prisma.station.count({ where: { isActive: true, region: rf } }),
      prisma.department.count({ where: { isActive: true, station: { region: rf } } }),
      prisma.officer.count({ where: { isActive: true, deletedAt: null, station: { region: rf } } }),
      prisma.adminDepartment.count({ where: { isActive: true, region: rf } }),
    ]),
  ]);
  const stationsByRegion = await prisma.station.groupBy({ by: ["regionId"], where: { isActive: true }, _count: true });
  const officersByRegion = await prisma.officer.findMany({ where: { isActive: true, deletedAt: null }, select: { station: { select: { regionId: true } } } });
  const officerCount = new Map<string, number>();
  for (const o of officersByRegion) officerCount.set(o.station.regionId, (officerCount.get(o.station.regionId) ?? 0) + 1);
  // The administrator of a province is its provincial authority: an active account with the délégué provincial role placed in it.
  const delegates = await prisma.user.findMany({ where: { deletedAt: null, status: "ACTIVE", regionId: { not: null }, role: { code: "REGIONAL_COMMANDER", isActive: true } }, select: { regionId: true, username: true, firstName: true, lastName: true } });
  const delegateOf = new Map<string, { username: string; fullName: string }[]>();
  for (const d of delegates) delegateOf.set(d.regionId!, [...(delegateOf.get(d.regionId!) ?? []), { username: d.username, fullName: `${d.firstName} ${d.lastName}` }]);
  return {
    org,
    regions: regions.map((r) => ({ ...r, activeStations: stationsByRegion.find((s) => s.regionId === r.id)?._count ?? 0, officers: officerCount.get(r.id) ?? 0, delegates: delegateOf.get(r.id) ?? [] })),
    ranks,
    totals: { stations: totals[0], departments: totals[1], officers: totals[2], adminDepartments: totals[3] },
  };
}

export async function getRegion(actor: Actor, id: string) {
  if (actor.scopeLevel !== "NATIONAL" && actor.regionId !== id) throw new NotFoundError("Province");
  const r = await prisma.region.findUnique({
    where: { id },
    include: {
      organization: { select: { name: true } },
      adminDepartments: { orderBy: { name: "asc" }, include: { _count: { select: { communes: true, stations: true } } } },
      stations: {
        orderBy: [{ parentId: "asc" }, { name: "asc" }],
        include: { commander: { select: { id: true, firstName: true, lastName: true, badgeNumber: true } }, parent: { select: { id: true, name: true } }, adminDepartment: { select: { name: true } }, _count: { select: { departments: true, officers: true, users: true, children: true } } },
      },
    },
  });
  if (!r) throw new NotFoundError("Province");
  return r;
}

export async function getAdminDepartment(actor: Actor, id: string) {
  const d = await prisma.adminDepartment.findUnique({
    where: { id },
    include: {
      region: { select: { id: true, code: true, name: true } },
      communes: { orderBy: { name: "asc" }, include: { _count: { select: { localities: true, stations: true } } } },
      stations: { orderBy: { name: "asc" }, include: { parent: { select: { id: true, name: true } }, commune: { select: { name: true } }, _count: { select: { officers: true, children: true } } } },
    },
  });
  if (!d) throw new NotFoundError("Department");
  if (actor.scopeLevel !== "NATIONAL" && actor.regionId !== d.regionId) throw new NotFoundError("Department");
  return d;
}

export async function getStation(actor: Actor, id: string) {
  const s = await prisma.station.findUnique({
    where: { id },
    include: {
      region: { select: { id: true, code: true, name: true } },
      adminDepartment: { select: { id: true, code: true, name: true } },
      commune: { select: { id: true, code: true, name: true, type: true } },
      locality: { select: { id: true, name: true, type: true } },
      parent: { select: { id: true, code: true, name: true, type: true } },
      children: { orderBy: { name: "asc" }, include: { _count: { select: { officers: true, departments: true } } } },
      commander: { select: { id: true, firstName: true, lastName: true, badgeNumber: true, rank: { select: { name: true } } } },
      departments: { orderBy: { name: "asc" }, include: { head: { select: { id: true, firstName: true, lastName: true, badgeNumber: true } }, _count: { select: { officers: true } } } },
      _count: { select: { officers: true, users: true, vehicles: true, cases: true, complaints: true, incidents: true, children: true } },
    },
  });
  if (!s) throw new NotFoundError("Station");
  // Visibility: national/regional admins of the province, or actors whose station scope includes this structure.
  const visible = canManageRegion(actor, s.regionId) || actor.scopeLevel === "NATIONAL" || (actor.scopeLevel === "REGIONAL" && actor.regionId === s.regionId) || inScope(actor, { stationId: s.id, regionId: s.regionId });
  if (!visible) throw new NotFoundError("Station");
  return s;
}

export async function listOfficers(actor: Actor, filter: { q?: string; stationId?: string; departmentId?: string; rankId?: string; dutyStatus?: DutyStatus; includeInactive?: boolean; page?: number; pageSize?: number } = {}) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const where = {
    deletedAt: null,
    ...(filter.includeInactive ? {} : { isActive: true }),
    ...scopeWhere(actor, { via: "station" }),
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
  const regionWhere = regionFilter(actor);
  const stationWhere = actor.scopeLevel === "NATIONAL" ? {} : actor.scopeLevel === "REGIONAL" ? { regionId: actor.regionId ?? "__none__" } : { id: { in: actor.stationIds?.length ? actor.stationIds : ["__none__"] } };
  const [regions, adminDepartments, communes, stations, departments, ranks] = await Promise.all([
    prisma.region.findMany({ where: { isActive: true, ...regionWhere }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.adminDepartment.findMany({ where: { isActive: true, region: regionWhere }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, regionId: true } }),
    prisma.commune.findMany({ where: { isActive: true, adminDepartment: { region: regionWhere } }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, type: true, adminDepartmentId: true } }),
    prisma.station.findMany({ where: { isActive: true, ...stationWhere }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, regionId: true, type: true, parentId: true } }),
    prisma.department.findMany({ where: { isActive: true, station: stationWhere }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, stationId: true, type: true } }),
    prisma.rank.findMany({ where: { isActive: true }, orderBy: { level: "desc" }, select: { id: true, code: true, name: true, level: true, category: true } }),
  ]);
  return { regions, adminDepartments, communes, stations, departments, ranks };
}

export async function stationOfficersForSelect(stationId: string) {
  return prisma.officer.findMany({ where: { stationId, isActive: true, deletedAt: null }, orderBy: [{ rank: { level: "desc" } }, { lastName: "asc" }], select: { id: true, badgeNumber: true, firstName: true, lastName: true, rank: { select: { name: true } } } });
}

/** Localities of a commune (for station forms). */
export async function localitiesOf(communeId: string | null | undefined) {
  if (!communeId) return [];
  return prisma.locality.findMany({ where: { communeId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true } });
}

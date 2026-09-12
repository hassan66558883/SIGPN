import "server-only";
import type { ComplaintStatus, OffenseCategory, Prisma, Priority } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import type { Actor } from "@/server/auth/dal";
import { complaintScopeWhere } from "@/server/complaints/service";

export async function listComplaints(actor: Actor, filter: { q?: string; status?: ComplaintStatus; category?: OffenseCategory; priority?: Priority; stationId?: string; assignedToId?: string; mine?: boolean; page?: number; pageSize?: number } = {}) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const q = filter.q?.trim();
  const where: Prisma.ComplaintWhereInput = {
    deletedAt: null,
    ...complaintScopeWhere(actor),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.category ? { category: filter.category } : {}),
    ...(filter.priority ? { priority: filter.priority } : {}),
    ...(filter.stationId ? { stationId: filter.stationId } : {}),
    ...(filter.assignedToId ? { assignedToId: filter.assignedToId } : {}),
    AND: [...(filter.mine ? [{ OR: [{ assignedToId: actor.id }, { createdById: actor.id }] }] : [])],
    ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }, { locationText: { contains: q, mode: "insensitive" } }, { complainant: { OR: [{ lastName: { contains: q, mode: "insensitive" } }, { firstName: { contains: q, mode: "insensitive" } }] } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      orderBy: [{ receivedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, number: true, title: true, category: true, priority: true, status: true, isAnonymous: true, receivedAt: true, incidentAt: true, station: { select: { code: true, name: true } }, complainant: { select: { id: true, firstName: true, lastName: true } }, assignedTo: { select: { username: true, firstName: true, lastName: true } }, case: { select: { id: true, number: true } } },
    }),
    prisma.complaint.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function complaintCounts(actor: Actor) {
  const rows = await prisma.complaint.groupBy({ by: ["status"], where: { deletedAt: null, ...complaintScopeWhere(actor) }, _count: true });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = r._count;
  return out;
}

/** Users who can be assigned complaints/cases inside the actor's scope (investigators, chiefs). */
export async function assignableInvestigators(actor: Actor, stationId?: string | null) {
  const stationFilter = stationId && (actor.scopeLevel === "NATIONAL" || actor.scopeLevel === "REGIONAL" || actor.scopeLevel === "DEPARTMENTAL") ? { stationId } : actor.scopeLevel === "NATIONAL" ? {} : actor.scopeLevel === "REGIONAL" ? { regionId: actor.regionId ?? "__none__" } : { stationId: { in: actor.stationIds?.length ? actor.stationIds : ["__none__"] } };
  return prisma.user.findMany({
    where: { status: "ACTIVE", deletedAt: null, ...stationFilter, role: { isActive: true, permissions: { some: { permission: { code: { in: ["cases:update", "investigations:manage"] } } } } } },
    orderBy: [{ lastName: "asc" }],
    select: { id: true, username: true, firstName: true, lastName: true, role: { select: { code: true, name: true } }, station: { select: { code: true } } },
  });
}

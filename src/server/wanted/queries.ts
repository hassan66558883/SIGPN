import "server-only";
import type { DangerLevel, Prisma, WantedStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import type { Actor } from "@/server/auth/dal";
import { wantedScopeWhere } from "@/server/wanted/service";

export async function listWantedPersons(actor: Actor, filter: { q?: string; status?: WantedStatus; dangerLevel?: DangerLevel; stationId?: string; page?: number; pageSize?: number } = {}) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const q = filter.q?.trim();
  const where: Prisma.WantedPersonWhereInput = {
    AND: [wantedScopeWhere(actor)],
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.dangerLevel ? { dangerLevel: filter.dangerLevel } : {}),
    ...(filter.stationId ? { stationId: filter.stationId } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { offense: { contains: q, mode: "insensitive" } },
            { lastSeenLocation: { contains: q, mode: "insensitive" } },
            { case: { number: { contains: q, mode: "insensitive" } } },
            { person: { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { number: { contains: q, mode: "insensitive" } }, { aliases: { some: { alias: { contains: q, mode: "insensitive" } } } }] } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.wantedPerson.findMany({
      where,
      orderBy: [{ issuedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        number: true,
        offense: true,
        dangerLevel: true,
        status: true,
        lastSeenLocation: true,
        issuedAt: true,
        person: { select: { id: true, number: true, firstName: true, lastName: true, dateOfBirth: true, aliases: { select: { alias: true }, take: 1 } } },
        case: { select: { id: true, number: true } },
        station: { select: { code: true, name: true } },
        mainPhoto: { select: { versions: { orderBy: { version: "desc" }, take: 1, select: { storagePath: true } } } },
      },
    }),
    prisma.wantedPerson.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function wantedDashboardStats(actor: Actor) {
  const where = wantedScopeWhere(actor);
  const [byStatus, highPriority, recentCount] = await Promise.all([
    prisma.wantedPerson.groupBy({ by: ["status"], where, _count: true }),
    prisma.wantedPerson.count({ where: { ...where, status: { in: ["ACTIVE", "LOCATED"] }, dangerLevel: { in: ["HIGH", "EXTREME"] } } }),
    prisma.wantedPerson.count({ where: { ...where, issuedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
  ]);
  const counts: Record<string, number> = { DRAFT: 0, PENDING_APPROVAL: 0, ACTIVE: 0, LOCATED: 0, ARRESTED: 0, CANCELLED: 0, EXPIRED: 0 };
  for (const r of byStatus) counts[r.status] = r._count;
  return { active: counts.ACTIVE, highPriority, recentlyAdded: recentCount, located: counts.LOCATED, apprehended: counts.ARRESTED, cancelled: counts.CANCELLED };
}

export async function personWantedSummary(personId: string) {
  const rows = await prisma.wantedPerson.findMany({ where: { personId }, orderBy: { issuedAt: "desc" }, select: { id: true, number: true, status: true, dangerLevel: true, offense: true, issuedAt: true } });
  return rows;
}

import "server-only";
import type { Gender, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import type { Actor } from "@/server/auth/dal";
import { personScopeWhere } from "@/server/persons/service";

export async function listPersons(actor: Actor, filter: { q?: string; gender?: Gender; regionId?: string; stationId?: string; includeMerged?: boolean; page?: number; pageSize?: number } = {}) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const q = filter.q?.trim();
  const where: Prisma.PersonWhereInput = {
    deletedAt: null,
    ...(filter.includeMerged ? {} : { mergedIntoId: null }),
    // scope and search both use OR → combine them with AND so neither overrides the other
    AND: [personScopeWhere(actor)],
    ...(filter.gender ? { gender: filter.gender } : {}),
    ...(filter.regionId ? { regionId: filter.regionId } : {}),
    ...(filter.stationId ? { stationId: filter.stationId } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { otherNames: { contains: q, mode: "insensitive" } },
            { phone: { contains: q.replace(/\s+/g, "") } },
            { aliases: { some: { alias: { contains: q, mode: "insensitive" } } } },
            { identifiers: { some: { value: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.person.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, number: true, firstName: true, lastName: true, otherNames: true, gender: true, dateOfBirth: true, phone: true, city: true, isDeceased: true, mergedIntoId: true, station: { select: { code: true, name: true } }, _count: { select: { caseParties: true, complaints: true, identifiers: true } } },
    }),
    prisma.person.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

/** Compact search for pickers (complaint / case party forms). */
export async function searchPersons(actor: Actor, q: string, take = 10) {
  const s = q.trim();
  if (s.length < 2) return [];
  return prisma.person.findMany({
    where: {
      deletedAt: null,
      mergedIntoId: null,
      AND: [personScopeWhere(actor)],
      OR: [{ number: { contains: s, mode: "insensitive" } }, { firstName: { contains: s, mode: "insensitive" } }, { lastName: { contains: s, mode: "insensitive" } }, { phone: { contains: s.replace(/\s+/g, "") } }],
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take,
    select: { id: true, number: true, firstName: true, lastName: true, dateOfBirth: true, phone: true, city: true },
  });
}

export async function personsForSelect(actor: Actor) {
  return prisma.person.findMany({ where: { deletedAt: null, mergedIntoId: null, ...personScopeWhere(actor) }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 500, select: { id: true, number: true, firstName: true, lastName: true, dateOfBirth: true } });
}

import "server-only";
import type { EvidenceCategory, EvidenceStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import type { Actor } from "@/server/auth/dal";
import { evidenceScopeWhere } from "@/server/evidence/service";

export async function listEvidence(actor: Actor, filter: { q?: string; category?: EvidenceCategory; status?: EvidenceStatus; caseId?: string; page?: number; pageSize?: number } = {}) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const q = filter.q?.trim();
  const where: Prisma.EvidenceWhereInput = {
    AND: [evidenceScopeWhere(actor)],
    ...(filter.category ? { category: filter.category } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.caseId ? { caseId: filter.caseId } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { sealNumber: { contains: q, mode: "insensitive" } }, { case: { number: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.evidence.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, number: true, category: true, description: true, status: true, isSensitive: true, createdAt: true, case: { select: { id: true, number: true, title: true } }, currentLocation: { select: { code: true, name: true } }, _count: { select: { documents: true } } },
    }),
    prisma.evidence.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function evidenceForCase(actor: Actor, caseId: string) {
  return prisma.evidence.findMany({ where: { caseId, ...evidenceScopeWhere(actor) }, orderBy: { createdAt: "desc" }, select: { id: true, number: true, category: true, description: true, status: true, isSensitive: true, createdAt: true, _count: { select: { documents: true } } } });
}

export async function stationStorageLocations(stationIds: string[]) {
  return prisma.storageLocation.findMany({ where: { stationId: { in: stationIds }, isActive: true }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, type: true, stationId: true } });
}

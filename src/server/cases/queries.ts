import "server-only";
import type { CaseStatus, OffenseCategory, Prisma, Priority } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import type { Actor } from "@/server/auth/dal";
import { caseScopeWhere } from "@/server/cases/service";

export async function listCases(actor: Actor, filter: { q?: string; status?: CaseStatus; category?: OffenseCategory; priority?: Priority; stationId?: string; mine?: boolean; page?: number; pageSize?: number } = {}) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const q = filter.q?.trim();
  const where: Prisma.CaseWhereInput = {
    deletedAt: null,
    AND: [caseScopeWhere(actor), ...(filter.mine ? [{ OR: [{ leadId: actor.id }, { supervisorId: actor.id }, { assignments: { some: { userId: actor.id, endedAt: null } } }] }] : [])],
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.category ? { category: filter.category } : {}),
    ...(filter.priority ? { priority: filter.priority } : {}),
    ...(filter.stationId ? { stationId: filter.stationId } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }, { locationText: { contains: q, mode: "insensitive" } }, { parties: { some: { person: { OR: [{ lastName: { contains: q, mode: "insensitive" } }, { firstName: { contains: q, mode: "insensitive" } }] } } } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.case.findMany({
      where,
      orderBy: [{ reportedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, number: true, title: true, category: true, priority: true, status: true, isSensitive: true, reportedAt: true, station: { select: { code: true, name: true } }, lead: { select: { username: true, firstName: true, lastName: true } }, _count: { select: { parties: true, tasks: true, evidence: true } } },
    }),
    prisma.case.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function caseCounts(actor: Actor) {
  const rows = await prisma.case.groupBy({ by: ["status"], where: { deletedAt: null, ...caseScopeWhere(actor) }, _count: true });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = r._count;
  return out;
}

export async function caseTimeline(caseId: string, take = 200) {
  return prisma.caseEvent.findMany({ where: { caseId }, orderBy: { occurredAt: "desc" }, take, include: { actor: { select: { username: true, firstName: true, lastName: true } } } });
}

export async function caseNotes(actor: Actor, caseId: string, canSeeConfidential: boolean) {
  return prisma.caseNote.findMany({ where: { caseId, ...(canSeeConfidential ? {} : { OR: [{ isConfidential: false }, { authorId: actor.id }] }) }, orderBy: { createdAt: "desc" }, include: { author: { select: { username: true, firstName: true, lastName: true } } } });
}

export async function caseTasks(caseId: string) {
  return prisma.task.findMany({ where: { caseId }, orderBy: [{ status: "asc" }, { dueAt: "asc" }], include: { assignedTo: { select: { username: true, firstName: true, lastName: true } }, createdBy: { select: { username: true } } } });
}

export async function caseAuditTrail(caseId: string, take = 100) {
  return prisma.auditLog.findMany({ where: { OR: [{ entityType: "Case", entityId: caseId }, { module: "cases", entityLabel: { startsWith: "" }, summary: { contains: caseId } }] }, orderBy: { at: "desc" }, take });
}

export async function myTasks(actor: Actor) {
  return prisma.task.findMany({ where: { assignedToId: actor.id, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } }, orderBy: [{ dueAt: "asc" }], include: { case: { select: { id: true, number: true, title: true } } } });
}

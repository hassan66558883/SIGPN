import "server-only";
import type { AuditOutcome } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import type { Actor } from "@/server/auth/dal";
import { SENSITIVE_PERMISSIONS } from "@/server/rbac/sensitivity";

export async function listAuditLogs(filter: { q?: string; module?: string; action?: string; actorId?: string; entityType?: string; entityId?: string; outcome?: AuditOutcome; from?: Date; to?: Date; page?: number; pageSize?: number }) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 50, 200);
  const where = {
    ...(filter.module ? { module: filter.module } : {}),
    ...(filter.action ? { action: { contains: filter.action.toUpperCase() } } : {}),
    ...(filter.actorId ? { actorId: filter.actorId } : {}),
    ...(filter.entityType ? { entityType: filter.entityType } : {}),
    ...(filter.entityId ? { entityId: filter.entityId } : {}),
    ...(filter.outcome ? { outcome: filter.outcome } : {}),
    ...(filter.from || filter.to ? { at: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } } : {}),
    ...(filter.q ? { OR: [{ summary: { contains: filter.q, mode: "insensitive" as const } }, { actorLabel: { contains: filter.q, mode: "insensitive" as const } }, { entityLabel: { contains: filter.q, mode: "insensitive" as const } }] } : {}),
  };
  const [items, total] = await Promise.all([prisma.auditLog.findMany({ where, orderBy: { at: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), prisma.auditLog.count({ where })]);
  return { items, total, page, pageSize };
}

export async function auditModules() {
  const rows = await prisma.auditLog.groupBy({ by: ["module"], _count: true, orderBy: { module: "asc" } });
  return rows.map((r) => r.module);
}

export async function securityOverview() {
  const since24h = new Date(Date.now() - 86_400_000);
  const [activeSessions, lockedAccounts, failed24h, success24h, mfaEnabled, totalUsers, recentDenied, pendingResets, apiKeys] = await Promise.all([
    prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.user.findMany({ where: { status: "LOCKED", deletedAt: null }, select: { id: true, username: true, lockedUntil: true, failedLoginCount: true }, take: 50 }),
    prisma.loginAttempt.count({ where: { success: false, createdAt: { gte: since24h } } }),
    prisma.loginAttempt.count({ where: { success: true, createdAt: { gte: since24h } } }),
    prisma.user.count({ where: { mfaEnabled: true, deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.auditLog.findMany({ where: { outcome: "DENIED", at: { gte: since24h } }, orderBy: { at: "desc" }, take: 20 }),
    prisma.passwordResetToken.count({ where: { usedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.apiKey.count({ where: { revokedAt: null } }),
  ]);
  // Mandatory MFA (lot 3): the role says so, OR the role holds a sensitive permission, OR the user is cleared above standard.
  const rolesRequiringMfa = await prisma.user.count({ where: { deletedAt: null, status: "ACTIVE", mfaEnabled: false, OR: [{ role: { requiresMfa: true } }, { clearance: { not: "STANDARD" } }, { role: { permissions: { some: { permission: { code: { in: [...SENSITIVE_PERMISSIONS] } } } } } }] } });
  const recentAttempts = await prisma.loginAttempt.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  const topFailingIps = await prisma.loginAttempt.groupBy({ by: ["ipAddress"], where: { success: false, createdAt: { gte: since24h } }, _count: true, orderBy: { _count: { ipAddress: "desc" } }, take: 10 });
  return { activeSessions, lockedAccounts, failed24h, success24h, mfaEnabled, totalUsers, recentDenied, pendingResets, apiKeys, rolesRequiringMfa, recentAttempts, topFailingIps };
}

export async function listActiveSessions() {
  return prisma.session.findMany({ where: { revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" }, take: 100, include: { user: { select: { id: true, username: true, firstName: true, lastName: true, role: { select: { code: true } } } } } });
}

export async function listNotifications(actor: Actor, opts: { unreadOnly?: boolean; take?: number } = {}) {
  return prisma.notification.findMany({ where: { userId: actor.id, ...(opts.unreadOnly ? { readAt: null } : {}) }, orderBy: { createdAt: "desc" }, take: opts.take ?? 50 });
}

export async function unreadCount(actor: Actor) {
  return prisma.notification.count({ where: { userId: actor.id, readAt: null } });
}

/**
 * Reference lists for the user forms. With `grantableBy`, the role list only holds roles the actor may really assign
 * (same rule as the server guard: every permission of the role must be held by the actor), plus `keepRoleId` (the user's current role).
 */
export async function referenceLists(opts: { grantableBy?: Actor; keepRoleId?: string } = {}) {
  const [allRoles, regions, adminDepartments, stations] = await Promise.all([
    prisma.role.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, scopeLevel: true, requiresMfa: true, permissions: { select: { permission: { select: { code: true } } } } } }),
    prisma.region.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.adminDepartment.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, regionId: true } }),
    prisma.station.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, regionId: true, adminDepartmentId: true } }),
  ]);
  const grantor = opts.grantableBy;
  const roles = allRoles
    .filter((r) => !grantor || r.id === opts.keepRoleId || r.permissions.every((p) => grantor.permissions.has(p.permission.code as never)))
    .map(({ permissions: _p, ...r }) => r);
  return { roles, regions, adminDepartments, stations };
}

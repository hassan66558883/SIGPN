import { apiOk, withApi } from "@/server/api";
import { listRoles } from "@/server/admin/roles";
import { prisma } from "@/server/db";

export const GET = withApi({ permission: "roles:view" }, async () => {
  const roles = await listRoles();
  const perms = await prisma.rolePermission.findMany({ select: { roleId: true, permission: { select: { code: true } } } });
  const byRole = new Map<string, string[]>();
  for (const p of perms) byRole.set(p.roleId, [...(byRole.get(p.roleId) ?? []), p.permission.code]);
  return apiOk(roles.map((r) => ({ id: r.id, code: r.code, name: r.name, description: r.description, scopeLevel: r.scopeLevel, requiresMfa: r.requiresMfa, isSystem: r.isSystem, isActive: r.isActive, userCount: r._count.users, permissions: (byRole.get(r.id) ?? []).sort() })));
});

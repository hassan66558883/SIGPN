import "server-only";
import { z } from "zod";
import type { ScopeLevel } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError, NotFoundError } from "@/server/errors";
import { revokeAllSessions } from "@/server/auth/session";
import type { Actor } from "@/server/auth/dal";
import { isPermission, PERMISSION_CATALOG } from "@/server/rbac/permissions";
import { LOCKED_ROLE_CODES, SYSTEM_ROLES } from "@/server/rbac/roles";
import type { RequestContext } from "@/server/request-context";
import { optionalText } from "@/server/action-utils";
import type { Locale } from "@/lib/i18n";
import { permissionDescription } from "@/lib/i18n/catalog";

export const roleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Z][A-Z0-9_]*$/, "UPPER_SNAKE_CASE")
    .transform((s) => s.toUpperCase()),
  name: z.string().trim().min(2).max(80),
  description: optionalText(300),
  scopeLevel: z.enum(["NATIONAL", "REGIONAL", "STATION", "OWN"]),
  requiresMfa: z.boolean().default(false),
});
export type RoleInput = z.infer<typeof roleSchema>;

export async function listRoles() {
  const roles = await prisma.role.findMany({ orderBy: [{ isSystem: "desc" }, { name: "asc" }], include: { _count: { select: { users: true, permissions: true } } } });
  return roles;
}

export async function getRole(id: string) {
  const r = await prisma.role.findUnique({ where: { id }, include: { permissions: { select: { permission: { select: { code: true } } } }, _count: { select: { users: true } } } });
  if (!r) throw new NotFoundError("Role");
  return { ...r, permissionCodes: r.permissions.map((p) => p.permission.code) };
}

export async function createRole(actor: Actor, input: RoleInput, ctx: RequestContext) {
  if (actor.scopeLevel !== "NATIONAL" && input.scopeLevel === "NATIONAL") throw new BusinessError("Only national administrators can create national-scope roles.", "STATE");
  const dup = await prisma.role.findUnique({ where: { code: input.code } });
  if (dup) throw new BusinessError("A role with this code already exists.", "CONFLICT");
  const role = await prisma.$transaction(async (tx) => {
    const r = await tx.role.create({ data: { code: input.code, name: input.name, description: input.description || null, scopeLevel: input.scopeLevel as ScopeLevel, requiresMfa: input.requiresMfa, isSystem: false } });
    await logAudit({ actor, action: "ROLE_CREATED", module: "roles", entityType: "Role", entityId: r.id, entityLabel: r.code, summary: `Created role ${r.code}`, after: r, context: ctx }, tx);
    return r;
  });
  return role;
}

export async function updateRole(actor: Actor, id: string, input: Omit<RoleInput, "code">, ctx: RequestContext) {
  const before = await getRole(id);
  if (before.isSystem && LOCKED_ROLE_CODES.includes(before.code)) throw new BusinessError("The system administrator roles are fixed by the system and cannot be edited.", "STATE");
  if (actor.scopeLevel !== "NATIONAL" && (input.scopeLevel === "NATIONAL" || before.scopeLevel === "NATIONAL")) throw new BusinessError("Only national administrators can edit national-scope roles.", "STATE");
  const sys = SYSTEM_ROLES.find((r) => r.code === before.code);
  if (sys && sys.requiresMfa && !input.requiresMfa) throw new BusinessError(`MFA cannot be switched off for the system role ${before.code}.`, "STATE");
  const after = await prisma.$transaction(async (tx) => {
    const r = await tx.role.update({ where: { id }, data: { name: input.name, description: input.description || null, scopeLevel: input.scopeLevel as ScopeLevel, requiresMfa: input.requiresMfa } });
    await logAudit({ actor, action: "ROLE_UPDATED", module: "roles", entityType: "Role", entityId: id, entityLabel: r.code, summary: `Updated role ${r.code}`, before: { name: before.name, description: before.description, scopeLevel: before.scopeLevel, requiresMfa: before.requiresMfa }, after: input, context: ctx }, tx);
    return r;
  });
  return after;
}

/** Replaces the permission set of a role. The actor can only grant permissions they hold themselves. */
export async function setRolePermissions(actor: Actor, id: string, codes: string[], ctx: RequestContext) {
  const before = await getRole(id);
  if (LOCKED_ROLE_CODES.includes(before.code)) throw new BusinessError("The system administrator roles are fixed by the system and cannot be edited.", "STATE");
  const wanted: string[] = Array.from(new Set(codes.filter(isPermission)));
  const excess = wanted.filter((c) => !actor.permissions.has(c));
  if (excess.length) throw new BusinessError(`You cannot grant permissions you do not hold: ${excess.slice(0, 5).join(", ")}${excess.length > 5 ? "…" : ""}.`, "STATE");
  // Prevent a non-super admin from making a role more powerful than themselves (privilege escalation via role edit).
  const removing = before.permissionCodes.filter((c) => !wanted.includes(c));
  const removingHeldByOthersOnly = removing.filter((c) => !actor.permissions.has(c));
  if (removingHeldByOthersOnly.length) throw new BusinessError(`You cannot remove permissions you do not hold yourself: ${removingHeldByOthersOnly.slice(0, 5).join(", ")}.`, "STATE");
  const perms = await prisma.permission.findMany({ where: { code: { in: wanted } }, select: { id: true, code: true } });
  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: id } });
    if (perms.length) await tx.rolePermission.createMany({ data: perms.map((p) => ({ roleId: id, permissionId: p.id })) });
    const added = wanted.filter((c) => !before.permissionCodes.includes(c));
    await logAudit({ actor, action: "PERMISSION_CHANGED", module: "roles", entityType: "Role", entityId: id, entityLabel: before.code, summary: `Permissions of ${before.code}: +${added.length} −${removing.length}`, before: { permissions: before.permissionCodes }, after: { permissions: wanted, added, removed: removing }, context: ctx }, tx);
    // Permission changes take effect immediately; force re-login for affected users when permissions were removed.
    if (removing.length) {
      const users = await tx.user.findMany({ where: { roleId: id }, select: { id: true } });
      for (const u of users) await revokeAllSessions(u.id, "permissions_changed", u.id === actor.id ? actor.sessionId : null, tx);
    }
  });
}

export async function setRoleActive(actor: Actor, id: string, isActive: boolean, ctx: RequestContext) {
  const r = await getRole(id);
  if (r.isSystem) throw new BusinessError("System roles cannot be deactivated.", "STATE");
  if (!isActive && r._count.users > 0) throw new BusinessError(`This role is still assigned to ${r._count.users} user(s). Reassign them first.`, "STATE");
  await prisma.role.update({ where: { id }, data: { isActive } });
  await logAudit({ actor, action: isActive ? "ROLE_ACTIVATED" : "ROLE_DEACTIVATED", module: "roles", entityType: "Role", entityId: id, entityLabel: r.code, summary: `${r.code} ${isActive ? "activated" : "deactivated"}`, context: ctx });
}

export function permissionCatalogGrouped(locale: Locale = "fr") {
  const groups = new Map<string, { code: string; description: string }[]>();
  for (const [code, description] of PERMISSION_CATALOG) {
    const mod = code.split(":")[0];
    if (!groups.has(mod)) groups.set(mod, []);
    groups.get(mod)!.push({ code, description: permissionDescription(code, description, locale) });
  }
  return Array.from(groups.entries()).map(([module, items]) => ({ module, items }));
}

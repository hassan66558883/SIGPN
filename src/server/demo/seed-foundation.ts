/**
 * Foundation seed (idempotent): permission catalog, system roles, minimal organization
 * (1 organization, 2 regions, 2 stations) and the fictional demo accounts.
 * Later phases add the full master data and operational demo data.
 */
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { hashPassword } from "@/server/auth/password";
import { PERMISSION_CATALOG } from "@/server/rbac/permissions";
import { SYSTEM_ROLES } from "@/server/rbac/roles";
import { DEMO_ACCOUNTS } from "@/server/demo/accounts";

export async function syncPermissionCatalog() {
  for (const [code, description] of PERMISSION_CATALOG) {
    const [module, action] = code.split(":");
    await prisma.permission.upsert({ where: { code }, update: { module, action, description }, create: { code, module, action, description } });
  }
  return PERMISSION_CATALOG.length;
}

/** Creates missing system roles and (re)applies their default permission sets. Custom roles are untouched. */
export async function syncSystemRoles(opts: { resetPermissions?: boolean } = {}) {
  const perms = await prisma.permission.findMany({ select: { id: true, code: true } });
  const byCode = new Map(perms.map((p) => [p.code, p.id]));
  for (const def of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { code: def.code },
      update: { name: def.name, description: def.description, isSystem: true, requiresMfa: def.requiresMfa },
      create: { code: def.code, name: def.name, description: def.description, scopeLevel: def.scopeLevel, requiresMfa: def.requiresMfa, isSystem: true },
    });
    const existing = await prisma.rolePermission.count({ where: { roleId: role.id } });
    if (existing === 0 || opts.resetPermissions) {
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      await prisma.rolePermission.createMany({ data: def.permissions.map((c) => ({ roleId: role.id, permissionId: byCode.get(c)! })), skipDuplicates: true });
    }
  }
  return SYSTEM_ROLES.length;
}

export async function seedMinimalOrganization() {
  const org = await prisma.organization.upsert({ where: { code: "NPS" }, update: {}, create: { code: "NPS", name: "National Police Service", shortName: "NPS", description: "Fictional national police organization used for demonstration." } });
  const central = await prisma.region.upsert({ where: { code: "CEN" }, update: {}, create: { organizationId: org.id, code: "CEN", name: "Central Region", capital: "Capital City" } });
  const north = await prisma.region.upsert({ where: { code: "NOR" }, update: {}, create: { organizationId: org.id, code: "NOR", name: "Northern Region", capital: "Northgate" } });
  const cs1 = await prisma.station.upsert({ where: { code: "CS-01" }, update: {}, create: { regionId: central.id, code: "CS-01", name: "Central Station 1", type: "CENTRAL_STATION", city: "Capital City", address: "1 Justice Avenue" } });
  const ns1 = await prisma.station.upsert({ where: { code: "NS-01" }, update: {}, create: { regionId: north.id, code: "NS-01", name: "Northgate Station", type: "STATION", city: "Northgate", address: "12 Market Road" } });
  return { org, central, north, cs1, ns1 };
}

export async function seedDemoAccounts() {
  const { org, central, cs1 } = await seedMinimalOrganization();
  const roles = await prisma.role.findMany({ select: { id: true, code: true, scopeLevel: true } });
  const roleByCode = new Map(roles.map((r) => [r.code, r]));
  const passwordHash = await hashPassword(env.demoPassword);
  let created = 0;
  for (const a of DEMO_ACCOUNTS) {
    const role = roleByCode.get(a.roleCode);
    if (!role) throw new Error(`role ${a.roleCode} missing`);
    const placement = role.scopeLevel === "NATIONAL" ? { regionId: null, stationId: null } : role.scopeLevel === "REGIONAL" ? { regionId: central.id, stationId: null } : { regionId: central.id, stationId: cs1.id };
    const existing = await prisma.user.findUnique({ where: { username: a.username } });
    if (existing) continue;
    await prisma.user.create({
      data: { username: a.username, email: `${a.username}@pms.example`, firstName: a.firstName, lastName: a.lastName, passwordHash, roleId: role.id, organizationId: org.id, ...placement, mustChangePassword: false, status: "ACTIVE" },
    });
    created++;
  }
  return created;
}

export async function seedFoundation() {
  const permissions = await syncPermissionCatalog();
  const roles = await syncSystemRoles();
  const users = await seedDemoAccounts();
  await prisma.auditLog.create({ data: { actorLabel: "system", action: "SEED_FOUNDATION", module: "system", summary: `Foundation seed: ${permissions} permissions, ${roles} roles, ${users} new demo users` } });
  return { permissions, roles, users };
}

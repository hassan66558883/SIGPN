/**
 * Foundation seed (idempotent): permission catalog, system roles, national organization,
 * territorial referential + DEMO structures (seed-territory) and the fictional demo accounts.
 */
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { hashPassword } from "@/server/auth/password";
import { PERMISSION_CATALOG } from "@/server/rbac/permissions";
import { SYSTEM_ROLES } from "@/server/rbac/roles";
import { DEMO_ACCOUNTS } from "@/server/demo/accounts";
import { seedTerritory } from "@/server/demo/seed-territory";
import { seedOperations } from "@/server/demo/seed-operations";
import { seedFieldOps } from "@/server/demo/seed-field-ops";
import { seedBiometric } from "@/server/demo/seed-biometric";
import { seedWanted } from "@/server/demo/seed-wanted";

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
      update: { name: def.name, description: def.description, isSystem: true, requiresMfa: def.requiresMfa, scopeLevel: def.scopeLevel },
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

export async function seedOrganization() {
  return prisma.organization.upsert({ where: { code: "NPS" }, update: {}, create: { code: "NPS", name: "Police Nationale du Tchad", shortName: "PNT", description: "Organisation nationale (démonstration TPMS)." } });
}

/** Creates missing demo accounts and (re)places every demo account in the territorial hierarchy. */
export async function seedDemoAccounts() {
  const org = await seedOrganization();
  const roles = await prisma.role.findMany({ select: { id: true, code: true, scopeLevel: true } });
  const roleByCode = new Map(roles.map((r) => [r.code, r]));
  const passwordHash = await hashPassword(env.demoPassword);
  let created = 0;
  for (const a of DEMO_ACCOUNTS) {
    const role = roleByCode.get(a.roleCode);
    if (!role) throw new Error(`role ${a.roleCode} missing`);
    const station = "station" in a && a.station ? await prisma.station.findUnique({ where: { code: a.station }, select: { id: true, regionId: true, adminDepartmentId: true } }) : null;
    const department = "department" in a && a.department ? await prisma.adminDepartment.findUnique({ where: { code: a.department }, select: { id: true, regionId: true } }) : null;
    const province = "province" in a && a.province ? await prisma.region.findUnique({ where: { code: a.province }, select: { id: true } }) : null;
    const placement = {
      stationId: station?.id ?? null,
      adminDepartmentId: station?.adminDepartmentId ?? department?.id ?? null,
      regionId: station?.regionId ?? department?.regionId ?? province?.id ?? null,
    };
    const existing = await prisma.user.findUnique({ where: { username: a.username } });
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { ...placement, roleId: role.id } });
      continue;
    }
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
  await seedOrganization();
  const territory = await seedTerritory();
  const users = await seedDemoAccounts();
  const ops = await seedOperations();
  const field = await seedFieldOps();
  const biometric = await seedBiometric();
  const wanted = await seedWanted();
  await prisma.auditLog.create({ data: { actorLabel: "system", action: "SEED_FOUNDATION", module: "system", summary: `Seed: ${permissions} permissions, ${roles} roles, ${territory.provinces} provinces, ${territory.stations} demo structures, ${territory.officers} new demo officers, ${users} new demo users, ${ops.persons} persons, ${ops.complaints} complaints, ${ops.cases} cases, ${field.zones} zones, ${field.vehicles} vehicles, ${field.patrols} patrols, ${field.incidents} incidents, ${biometric.fingerprintEnrolled} fingerprints, ${biometric.faceEnrolled} face templates, ${biometric.searches} biometric searches, ${biometric.plates} plate detections, ${wanted.created} wanted notices, ${wanted.warrants} warrants` } });
  return { permissions, roles, users, territory, ops, field, biometric, wanted };
}

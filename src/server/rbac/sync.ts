import "server-only";
import { prisma } from "@/server/db";
import { PERMISSION_CATALOG } from "@/server/rbac/permissions";
import { CASH_DEFAULT_GRANTS, HR_DEFAULT_GRANTS, SYSTEM_ROLES, TRAFFIC_DEFAULT_GRANTS } from "@/server/rbac/roles";

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
  await grantTrafficDefaultsOnce(byCode);
  await grantCashDefaultsOnce(byCode);
  await grantHrDefaultsOnce(byCode);
  await grantHrTransferDefaultsOnce(byCode);
  await grantHrRotationDefaultsOnce(byCode);
  await grantHrPhase6DefaultsOnce(byCode);
  await grantHrPhase7DefaultsOnce(byCode);
  await grantHrPayDefaultsOnce(byCode);
  await grantWantedVerifyOnce(byCode);
  return SYSTEM_ROLES.length;
}

/**
 * Databases seeded before the traffic module already have their system roles populated, and
 * `syncSystemRoles` never touches an existing permission set. Grant the traffic defaults ONCE
 * (marked in SystemSetting) so later manual changes by an administrator are respected.
 */
async function grantTrafficDefaultsOnce(byCode: Map<string, string>) {
  const KEY = "rbac.traffic_defaults_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const roles = await prisma.role.findMany({ where: { isSystem: true }, select: { id: true, code: true } });
  for (const role of roles) {
    const grants = TRAFFIC_DEFAULT_GRANTS[role.code] ?? [];
    if (!grants.length) continue;
    await prisma.rolePermission.createMany({ data: grants.map((c) => ({ roleId: role.id, permissionId: byCode.get(c)! })), skipDuplicates: true });
  }
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "Les permissions par défaut du module circulation ont été accordées aux rôles système." } });
}

/** Same one-time additive grant for the revenue module (`cash:*`), plus `audit:view` where the revenue audit trail is required. */
async function grantCashDefaultsOnce(byCode: Map<string, string>) {
  const KEY = "rbac.cash_defaults_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const roles = await prisma.role.findMany({ where: { isSystem: true }, select: { id: true, code: true } });
  for (const role of roles) {
    const grants = [...(CASH_DEFAULT_GRANTS[role.code] ?? [])];
    if (role.code === "TRAFFIC_SUPERVISOR" || role.code === "TRAFFIC_PAYMENT_MANAGER") grants.push("audit:view");
    if (!grants.length) continue;
    await prisma.rolePermission.createMany({ data: grants.map((c) => ({ roleId: role.id, permissionId: byCode.get(c)! })), skipDuplicates: true });
  }
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "Les permissions par défaut du module recettes et versements ont été accordées aux rôles système." } });
}

/** One-time additive grant for the HR module (`hr:*`) on already-seeded databases. */
async function grantHrDefaultsOnce(byCode: Map<string, string>) {
  const KEY = "rbac.hr_defaults_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const roles = await prisma.role.findMany({ where: { isSystem: true }, select: { id: true, code: true } });
  for (const role of roles) {
    const grants = HR_DEFAULT_GRANTS[role.code] ?? [];
    if (!grants.length) continue;
    await prisma.rolePermission.createMany({ data: grants.map((c) => ({ roleId: role.id, permissionId: byCode.get(c)! })), skipDuplicates: true });
  }
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "Les permissions par défaut du module ressources humaines ont été accordées aux rôles système." } });
}

/** Phase 4 of the HR module: the transfer-circuit permissions, granted once to already-seeded databases. */
async function grantHrTransferDefaultsOnce(byCode: Map<string, string>) {
  const KEY = "rbac.hr_transfer_defaults_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const roles = await prisma.role.findMany({ where: { isSystem: true }, select: { id: true, code: true } });
  for (const role of roles) {
    const grants = (HR_DEFAULT_GRANTS[role.code] ?? []).filter((c) => c.startsWith("hr:transfer_"));
    if (!grants.length) continue;
    await prisma.rolePermission.createMany({ data: grants.map((c) => ({ roleId: role.id, permissionId: byCode.get(c)! })), skipDuplicates: true });
  }
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "Les permissions du circuit de mutation ont été accordées aux rôles système." } });
}

/** Phase 5: `hr:auto_assign_config` (automatic assignment settings), granted once to already-seeded databases. */
async function grantHrRotationDefaultsOnce(byCode: Map<string, string>) {
  const KEY = "rbac.hr_rotation_defaults_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const roles = await prisma.role.findMany({ where: { isSystem: true }, select: { id: true, code: true } });
  for (const role of roles) {
    const grants = (HR_DEFAULT_GRANTS[role.code] ?? []).filter((c) => c === "hr:auto_assign_config");
    if (!grants.length) continue;
    await prisma.rolePermission.createMany({ data: grants.map((c) => ({ roleId: role.id, permissionId: byCode.get(c)! })), skipDuplicates: true });
  }
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "La permission de paramétrage de l'affectation automatique a été accordée aux rôles système." } });
}

/** Phase 6: attendance, leave and training permissions, granted once to already-seeded databases. */
async function grantHrPhase6DefaultsOnce(byCode: Map<string, string>) {
  const KEY = "rbac.hr_phase6_defaults_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const wanted = new Set(["hr:attendance_record", "hr:leave_request", "hr:leave_approve", "hr:training_manage"]);
  const roles = await prisma.role.findMany({ where: { isSystem: true }, select: { id: true, code: true } });
  for (const role of roles) {
    const grants = (HR_DEFAULT_GRANTS[role.code] ?? []).filter((c) => wanted.has(c));
    if (!grants.length) continue;
    await prisma.rolePermission.createMany({ data: grants.map((c) => ({ roleId: role.id, permissionId: byCode.get(c)! })), skipDuplicates: true });
  }
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "Les permissions présences, congés et formations ont été accordées aux rôles système." } });
}

/** Phase 7: discipline and document permissions, granted once to already-seeded databases. */
async function grantHrPhase7DefaultsOnce(byCode: Map<string, string>) {
  const KEY = "rbac.hr_phase7_defaults_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const wanted = new Set(["hr:discipline_view", "hr:discipline_manage", "hr:discipline_decide", "hr:document_issue"]);
  const roles = await prisma.role.findMany({ where: { isSystem: true }, select: { id: true, code: true } });
  for (const role of roles) {
    const grants = (HR_DEFAULT_GRANTS[role.code] ?? []).filter((c) => wanted.has(c));
    if (!grants.length) continue;
    await prisma.rolePermission.createMany({ data: grants.map((c) => ({ roleId: role.id, permissionId: byCode.get(c)! })), skipDuplicates: true });
  }
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "Les permissions discipline et documents RH ont été accordées aux rôles système." } });
}

/** Payroll permissions (`hr:pay_*`), granted once to already-seeded databases: only the dedicated payroll roles hold them. */
async function grantHrPayDefaultsOnce(byCode: Map<string, string>) {
  const KEY = "rbac.hr_pay_defaults_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const roles = await prisma.role.findMany({ where: { isSystem: true }, select: { id: true, code: true } });
  for (const role of roles) {
    const grants = (HR_DEFAULT_GRANTS[role.code] ?? []).filter((c) => c.startsWith("hr:pay_"));
    if (!grants.length) continue;
    await prisma.rolePermission.createMany({ data: grants.map((c) => ({ roleId: role.id, permissionId: byCode.get(c)! })), skipDuplicates: true });
  }
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "Les permissions de solde ont été accordées aux rôles de paie dédiés." } });
}

/** Wanted-notice verification (SIGPN-T v2.0): roles that already approve notices also verify them, granted once. */
async function grantWantedVerifyOnce(byCode: Map<string, string>) {
  const KEY = "rbac.wanted_verify_defaults_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const verify = byCode.get("wanted:verify");
  if (verify) {
    const holders = await prisma.rolePermission.findMany({ where: { permission: { code: "wanted:approve" } }, select: { roleId: true } });
    await prisma.rolePermission.createMany({ data: holders.map((h) => ({ roleId: h.roleId, permissionId: verify })), skipDuplicates: true });
  }
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "La permission de vérification des avis de recherche a été accordée aux rôles qui les approuvent." } });
}

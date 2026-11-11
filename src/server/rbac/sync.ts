import "server-only";
import { prisma } from "@/server/db";
import { PERMISSION_CATALOG } from "@/server/rbac/permissions";
import { logAudit } from "@/server/audit";
import { APPROVAL_DEFAULT_GRANTS, CASH_DEFAULT_GRANTS, HR_DEFAULT_GRANTS, PDF_EXPORT_HEADS, SYSTEM_ROLES, TECH_ADMIN_PERMISSIONS, TRAFFIC_DEFAULT_GRANTS } from "@/server/rbac/roles";

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
  await separateAdministrationOnce(byCode);
  await grantApprovalsOnce(byCode);
  await grantTrafficDefaultsOnce(byCode);
  await grantCashDefaultsOnce(byCode);
  await grantHrDefaultsOnce(byCode);
  await grantHrTransferDefaultsOnce(byCode);
  await grantHrRotationDefaultsOnce(byCode);
  await grantHrPhase6DefaultsOnce(byCode);
  await grantHrPhase7DefaultsOnce(byCode);
  await grantHrPayDefaultsOnce(byCode);
  await grantWantedVerifyOnce(byCode);
  await grantAlertsOnce(byCode);
  await grantBiometricControlOnce(byCode);
  await grantPublicPortalOnce(byCode);
  await grantPdfExportOnce(byCode);
  return SYSTEM_ROLES.length;
}

/**
 * Security audit, lot 1: databases created before the separation give SUPER_ADMIN every permission. Remove, ONCE, everything
 * that is not technical administration (marked in SystemSetting, so a later deliberate change is never overwritten).
 * Runs before the other one-time grants so they cannot hand operational permissions back through "holders of X".
 */
async function separateAdministrationOnce(byCode: Map<string, string>) {
  const KEY = "rbac.admin_separation_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const role = await prisma.role.findUnique({ where: { code: "SUPER_ADMIN" }, select: { id: true } });
  let removed = 0;
  if (role) {
    const keep = TECH_ADMIN_PERMISSIONS.map((c) => byCode.get(c)!).filter(Boolean);
    removed = (await prisma.rolePermission.deleteMany({ where: { roleId: role.id, permissionId: { notIn: keep } } })).count;
    await logAudit({ actor: null, action: "ADMIN_SEPARATION_APPLIED", module: "roles", entityType: "Role", entityId: role.id, entityLabel: "SUPER_ADMIN", summary: `Separation of duties: ${removed} operational permission(s) removed from the technical administrator role`, after: { removed, kept: keep.length } });
  }
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "Les permissions opérationnelles ont été retirées du rôle d'administrateur technique (audit de sécurité, lot 1)." } });
}

/** Lot 4: the approval permissions, granted once to already-seeded databases (commanders and the police administrator decide; the two administrators follow their own requests). */
async function grantApprovalsOnce(byCode: Map<string, string>) {
  const KEY = "rbac.approvals_defaults_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const roles = await prisma.role.findMany({ where: { isSystem: true }, select: { id: true, code: true } });
  for (const role of roles) {
    const grants = APPROVAL_DEFAULT_GRANTS[role.code] ?? [];
    if (!grants.length) continue;
    await prisma.rolePermission.createMany({ data: grants.map((c) => ({ roleId: role.id, permissionId: byCode.get(c)! })), skipDuplicates: true });
  }
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "Les permissions d'approbation ont été accordées aux rôles système (lot 4 de l'audit de sécurité)." } });
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

/**
 * National alert network (SIGPN-T v2.0, section 5), granted once: every role that sees wanted notices receives and acknowledges alerts,
 * roles that approve notices supervise the diffusion, and only the system administrator and the national command simulate (demonstration).
 */
async function grantAlertsOnce(byCode: Map<string, string>) {
  const KEY = "rbac.alerts_defaults_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const id = (c: string) => byCode.get(c)!;
  const holders = async (code: string) => (await prisma.rolePermission.findMany({ where: { permission: { code } }, select: { roleId: true } })).map((h) => h.roleId);
  const grant = async (roleIds: string[], code: string) => roleIds.length && prisma.rolePermission.createMany({ data: roleIds.map((roleId) => ({ roleId, permissionId: id(code) })), skipDuplicates: true });
  const viewers = await holders("wanted:view");
  await grant(viewers, "alerts:view");
  await grant(viewers, "alerts:ack");
  await grant(await holders("wanted:approve"), "alerts:supervise");
  const sim = await prisma.role.findMany({ where: { code: { in: ["NATIONAL_COMMANDER"] } }, select: { id: true } });
  await grant(sim.map((r) => r.id), "alerts:simulate");
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "Les permissions du réseau d'alertes nationales ont été accordées aux rôles système." } });
}

/** Biometric control screen: granted once to the roles that already run fingerprint or face searches. */
async function grantBiometricControlOnce(byCode: Map<string, string>) {
  const KEY = "rbac.biometric_control_defaults_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const perm = byCode.get("biometric:control");
  if (perm) {
    const holders = await prisma.rolePermission.findMany({ where: { permission: { code: { in: ["biometric:search_fingerprint", "biometric:search_face"] } } }, select: { roleId: true } });
    await prisma.rolePermission.createMany({ data: [...new Set(holders.map((h) => h.roleId))].map((roleId) => ({ roleId, permissionId: perm })), skipDuplicates: true });
  }
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "La permission de contrôle biométrique a été accordée aux rôles qui effectuent déjà des recherches d'empreinte ou de visage." } });
}

/** PDF export of lists and records: the heads of each level of command only (PDF_EXPORT_HEADS), granted once to already-seeded databases. */
async function grantPdfExportOnce(byCode: Map<string, string>) {
  const KEY = "rbac.pdf_export_defaults_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const perm = byCode.get("records:export_pdf");
  if (perm) {
    const roles = await prisma.role.findMany({ where: { code: { in: [...PDF_EXPORT_HEADS] }, isSystem: true }, select: { id: true } });
    await prisma.rolePermission.createMany({ data: roles.map((r) => ({ roleId: r.id, permissionId: perm })), skipDuplicates: true });
  }
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "L'export PDF des listes et fiches a été accordé aux chefs de chaque niveau de commandement." } });
}

/** Public portal: roles that review complaints handle public submissions; roles that publish notices manage the public content. Granted once. */
async function grantPublicPortalOnce(byCode: Map<string, string>) {
  const KEY = "rbac.public_portal_defaults_applied";
  if (await prisma.systemSetting.findUnique({ where: { key: KEY } })) return;
  const holders = async (code: string) => (await prisma.rolePermission.findMany({ where: { permission: { code } }, select: { roleId: true } })).map((h) => h.roleId);
  const grant = async (roleIds: string[], code: string) => {
    const id = byCode.get(code);
    if (id && roleIds.length) await prisma.rolePermission.createMany({ data: [...new Set(roleIds)].map((roleId) => ({ roleId, permissionId: id })), skipDuplicates: true });
  };
  const reviewers = await holders("complaints:review");
  await grant(reviewers, "intake:view");
  await grant(reviewers, "intake:manage");
  await grant(await holders("wanted:publish"), "public:content");
  await prisma.systemSetting.create({ data: { key: KEY, value: true, description: "Les permissions du portail public ont été accordées aux rôles système concernés." } });
}

import "server-only";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { hashPassword, passwordPolicyErrors } from "@/server/auth/password";
import { syncPermissionCatalog, syncSystemRoles } from "@/server/rbac/sync";
import { CHAD_PROVINCES } from "@/server/demo/seed-territory";

/**
 * Production bootstrap, run once at every server start (idempotent, no demonstration data):
 *  1. permission catalog and system roles are synchronised with the code (new permissions are granted once to the
 *     roles that define them; an administrator's later changes to a role are never overwritten);
 *  2. the national organisation and the 23 official provinces exist;
 *  3. when no system administrator exists and BOOTSTRAP_ADMIN_USERNAME / _EMAIL / _PASSWORD are set, the first one is
 *     created with a password that MUST be changed (and MFA enrolled) at the first sign-in. Remove these variables afterwards.
 * Disable with BOOTSTRAP=off.
 */
export async function bootstrap(log: (m: string) => void = console.log) {
  if (process.env.BOOTSTRAP === "off") return;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const permissions = await syncPermissionCatalog();
      const roles = await syncSystemRoles();
      log(`[bootstrap] ${permissions} permissions and ${roles} system roles synchronised`);
      break;
    } catch (e) {
      if (attempt === 2) throw e; // two instances starting together can race on the one-time grants: retry once
    }
  }
  const org = (await prisma.organization.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } })) ?? (await prisma.organization.create({ data: { code: "NPS", name: "Police Nationale du Tchad", shortName: "PNT", description: "Organisation nationale." } }));
  if ((await prisma.region.count()) === 0) {
    for (const p of CHAD_PROVINCES) await prisma.region.create({ data: { organizationId: org.id, code: p.code, name: p.name, capital: p.capital, isDemo: false } });
    log(`[bootstrap] ${CHAD_PROVINCES.length} official provinces created`);
  }

  // The technical administrator (SUPER_ADMIN) and the security administrator (SECURITY_ADMIN) are separate people:
  // neither can create the other (a role can only be granted by someone who holds all its permissions), so each has its own bootstrap.
  await bootstrapAdmin(log, org.id, { roleCode: "SUPER_ADMIN", label: "technical administrator", prefix: "BOOTSTRAP_ADMIN", defaultFirst: "Administrateur", defaultLast: "Technique" });
  await bootstrapAdmin(log, org.id, { roleCode: "SECURITY_ADMIN", label: "security administrator", prefix: "BOOTSTRAP_SECURITY", defaultFirst: "Administrateur", defaultLast: "Sécurité" });
}

async function bootstrapAdmin(log: (m: string) => void, organizationId: string, o: { roleCode: string; label: string; prefix: string; defaultFirst: string; defaultLast: string }) {
  const env = process.env;
  const username = env[`${o.prefix}_USERNAME`];
  const email = env[`${o.prefix}_EMAIL`];
  const password = env[`${o.prefix}_PASSWORD`];
  if (!(username && email && password)) return;
  const role = await prisma.role.findUnique({ where: { code: o.roleCode }, select: { id: true } });
  if (!role || (await prisma.user.count({ where: { roleId: role.id, deletedAt: null } })) > 0) return;
  const problems = passwordPolicyErrors(password, { username, email });
  if (problems.length) {
    log(`[bootstrap] first ${o.label} NOT created: the password does not meet the policy (${problems.join("; ")})`);
    return;
  }
  const u = await prisma.user.create({
    data: { username: username.toLowerCase(), email: email.toLowerCase(), firstName: env[`${o.prefix}_FIRST_NAME`] || o.defaultFirst, lastName: env[`${o.prefix}_LAST_NAME`] || o.defaultLast, passwordHash: await hashPassword(password), roleId: role.id, organizationId, mustChangePassword: true, status: "ACTIVE" },
  });
  await logAudit({ actor: null, action: "BOOTSTRAP_ADMIN_CREATED", module: "system", entityType: "User", entityId: u.id, entityLabel: u.username, summary: `First ${o.label} "${u.username}" created by the bootstrap (password change and MFA enrolment required at first sign-in)` });
  log(`[bootstrap] first ${o.label} "${u.username}" created — change the password at first sign-in, then remove ${o.prefix}_* from the environment`);
}

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

  const { BOOTSTRAP_ADMIN_USERNAME: username, BOOTSTRAP_ADMIN_EMAIL: email, BOOTSTRAP_ADMIN_PASSWORD: password } = process.env;
  if (username && email && password) {
    const role = await prisma.role.findUnique({ where: { code: "SUPER_ADMIN" }, select: { id: true } });
    if (role && (await prisma.user.count({ where: { roleId: role.id, deletedAt: null } })) === 0) {
      const problems = passwordPolicyErrors(password, { username, email });
      if (problems.length) {
        log(`[bootstrap] first administrator NOT created: the password does not meet the policy (${problems.join("; ")})`);
        return;
      }
      const u = await prisma.user.create({
        data: { username: username.toLowerCase(), email: email.toLowerCase(), firstName: process.env.BOOTSTRAP_ADMIN_FIRST_NAME || "Administrateur", lastName: process.env.BOOTSTRAP_ADMIN_LAST_NAME || "Système", passwordHash: await hashPassword(password), roleId: role.id, organizationId: org.id, mustChangePassword: true, status: "ACTIVE" },
      });
      await logAudit({ actor: null, action: "BOOTSTRAP_ADMIN_CREATED", module: "system", entityType: "User", entityId: u.id, entityLabel: u.username, summary: `First system administrator "${u.username}" created by the bootstrap (password change and MFA enrolment required at first sign-in)` });
      log(`[bootstrap] first administrator "${u.username}" created — change the password at first sign-in, then remove BOOTSTRAP_ADMIN_* from the environment`);
    }
  }
}

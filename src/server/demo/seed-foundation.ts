/**
 * Foundation seed (idempotent): permission catalog, system roles, national organization,
 * territorial referential + DEMO structures (seed-territory) and the fictional demo accounts.
 */
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { hashPassword } from "@/server/auth/password";
import { syncPermissionCatalog, syncSystemRoles } from "@/server/rbac/sync";
import { SYSTEM_ROLES } from "@/server/rbac/roles";
import { impliedClearance } from "@/server/rbac/sensitivity";
import { DEMO_ACCOUNTS } from "@/server/demo/accounts";
import { seedTerritory } from "@/server/demo/seed-territory";
import { seedOperations } from "@/server/demo/seed-operations";
import { seedFieldOps } from "@/server/demo/seed-field-ops";
import { seedBiometric } from "@/server/demo/seed-biometric";
import { seedWanted } from "@/server/demo/seed-wanted";
import { syncTrafficCatalog } from "@/server/traffic/catalog";
import { seedTraffic } from "@/server/demo/seed-traffic";
import { seedCash } from "@/server/demo/seed-cash";

export async function seedOrganization() {
  return prisma.organization.upsert({ where: { code: "NPS" }, update: {}, create: { code: "NPS", name: "Police Nationale du Tchad", shortName: "PNT", description: "Organisation nationale (démonstration SIGPN-T)." } });
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
      data: { username: a.username, email: `${a.username}@pms.example`, firstName: a.firstName, lastName: a.lastName, passwordHash, roleId: role.id, clearance: impliedClearance(SYSTEM_ROLES.find((r) => r.code === a.roleCode)?.permissions ?? []), organizationId: org.id, ...placement, mustChangePassword: false, status: "ACTIVE" },
    });
    created++;
  }
  return created;
}

/** HR defaults for officers created by the seeds (idempotent, only fills what is empty): corps by rank category, service start, post tenure start, recruitment event. */
export async function backfillHrDefaults() {
  await prisma.$executeRawUnsafe(`UPDATE "Officer" o SET "corpsId" = CASE r."category" WHEN 'COMMISSIONER' THEN 'corps_commissaires' WHEN 'OFFICER' THEN 'corps_officiers' WHEN 'INSPECTOR' THEN 'corps_inspecteurs' WHEN 'NON_COMMISSIONED' THEN 'corps_grades' WHEN 'CONSTABLE' THEN 'corps_agents' ELSE 'corps_civils' END FROM "Rank" r WHERE r."id" = o."rankId" AND o."corpsId" IS NULL AND EXISTS (SELECT 1 FROM "Corps" WHERE "id" = 'corps_agents')`);
  await prisma.$executeRawUnsafe(`UPDATE "Officer" SET "serviceStartDate" = "hiredAt" WHERE "serviceStartDate" IS NULL AND "hiredAt" IS NOT NULL`);
  await prisma.$executeRawUnsafe(`UPDATE "Officer" o SET "currentPostSince" = COALESCE((SELECT max(a."startDate") FROM "OfficerAssignment" a WHERE a."officerId" = o."id" AND a."endDate" IS NULL), o."hiredAt") WHERE o."currentPostSince" IS NULL`);
  await prisma.$executeRawUnsafe(`INSERT INTO "CareerEvent" ("id", "officerId", "type", "effectiveDate", "reference", "reason", "toRankId", "toStationId", "toStatus") SELECT 'ce_' || md5(o."id" || 'recruitment'), o."id", 'RECRUITMENT', o."hiredAt", 'HISTORIQUE', 'Imported from the hiring date on record', o."rankId", o."stationId", 'ACTIVE' FROM "Officer" o WHERE o."hiredAt" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "CareerEvent" e WHERE e."officerId" = o."id" AND e."type" = 'RECRUITMENT')`);
}

export async function seedFoundation() {
  const permissions = await syncPermissionCatalog();
  const roles = await syncSystemRoles();
  const trafficCatalog = await syncTrafficCatalog();
  await seedOrganization();
  const territory = await seedTerritory();
  const users = await seedDemoAccounts();
  const ops = await seedOperations();
  const field = await seedFieldOps();
  const biometric = await seedBiometric();
  const wanted = await seedWanted();
  const traffic = await seedTraffic();
  const cash = await seedCash();
  await backfillHrDefaults();
  await prisma.auditLog.create({ data: { actorLabel: "system", action: "SEED_FOUNDATION", module: "system", summary: `Seed: ${permissions} permissions, ${roles} roles, ${territory.provinces} provinces, ${territory.stations} demo structures, ${territory.officers} new demo officers, ${users} new demo users, ${ops.persons} persons, ${ops.complaints} complaints, ${ops.cases} cases, ${field.zones} zones, ${field.vehicles} vehicles, ${field.patrols} patrols, ${field.incidents} incidents, ${biometric.fingerprintEnrolled} fingerprints, ${biometric.faceEnrolled} face templates, ${biometric.searches} biometric searches, ${biometric.plates} plate detections, ${wanted.created} wanted notices, ${wanted.warrants} warrants, ${trafficCatalog.violations} traffic offences imported, ${traffic.controls} traffic controls (${traffic.tickets} PV, ${traffic.fines} fines, ${traffic.payments} payments)` } });
  return { permissions, roles, users, territory, ops, field, biometric, wanted, trafficCatalog, traffic, cash };
}

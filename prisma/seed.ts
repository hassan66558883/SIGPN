/**
 * `npm run db:seed` — permission catalog, system roles, national organization, Chad territorial
 * referential (official provinces), DEMO structures/officers and demo accounts. Idempotent.
 */
import "dotenv/config";
import { seedFoundation } from "../src/server/demo/seed-foundation";
import { prisma } from "../src/server/db";

seedFoundation()
  .then(async (r) => {
    console.log(`[seed] ${r.permissions} permissions, ${r.roles} roles, ${r.territory.provinces} provinces, ${r.territory.departments} departments, ${r.territory.communes} communes, ${r.territory.stations} demo structures, ${r.territory.officers} new officers, ${r.users} new demo users, ${r.ops.positioned} positions set, ${r.ops.trainingsCreated} trainings, ${r.ops.persons} persons, ${r.ops.complaints} complaints, ${r.ops.cases} cases, ${r.field.zones} zones, ${r.field.vehicles} vehicles, ${r.field.patrols} patrols, ${r.field.incidents} incidents (${r.field.escalated} escalated), ${r.biometric.fingerprintEnrolled} fingerprints, ${r.biometric.faceEnrolled} face templates, ${r.biometric.searches} biometric searches, ${r.biometric.plates} plate detections, ${r.wanted.created} wanted notices, ${r.wanted.warrants} warrants, ${r.trafficCatalog.violations} traffic offences, ${r.traffic.controls} traffic controls (${r.traffic.tickets} PV, ${r.traffic.fines} fines, ${r.traffic.payments} payments)`);
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("[seed] failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

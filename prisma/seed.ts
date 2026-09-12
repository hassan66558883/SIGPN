/**
 * `npm run db:seed` — permission catalog, system roles, national organization, Chad territorial
 * referential (official provinces), DEMO structures/officers and demo accounts. Idempotent.
 */
import "dotenv/config";
import { seedFoundation } from "../src/server/demo/seed-foundation";
import { prisma } from "../src/server/db";

seedFoundation()
  .then(async (r) => {
    console.log(`[seed] ${r.permissions} permissions, ${r.roles} roles, ${r.territory.provinces} provinces, ${r.territory.departments} departments, ${r.territory.communes} communes, ${r.territory.stations} demo structures, ${r.territory.officers} new officers, ${r.users} new demo users, ${r.ops.positioned} positions set, ${r.ops.trainingsCreated} trainings, ${r.ops.persons} persons, ${r.ops.complaints} complaints, ${r.ops.cases} cases`);
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("[seed] failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

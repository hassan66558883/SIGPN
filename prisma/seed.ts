/**
 * `npm run db:seed` — loads the permission catalog, system roles, minimal organization and demo accounts.
 * Fictional data only. Idempotent.
 */
import "dotenv/config";
import { seedFoundation } from "../src/server/demo/seed-foundation";
import { prisma } from "../src/server/db";

seedFoundation()
  .then(async (r) => {
    console.log(`[seed] foundation: ${r.permissions} permissions, ${r.roles} roles, ${r.users} new demo users`);
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("[seed] failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

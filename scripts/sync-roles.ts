/**
 * `npm run roles:sync` — applies the permission catalog and the system roles to the configured database (what the bootstrap
 * does at every server start), including the one-time separation of the technical administrator from police command,
 * then creates the missing fictional demo accounts. Idempotent.
 */
import "dotenv/config";
import Module from "node:module";

// The server modules carry the `server-only` guard (meant for Next bundles); neutralise it for this CLI entry point.
const m = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolve = m._resolveFilename;
m._resolveFilename = function (request: string, ...rest: unknown[]) {
  return request === "server-only" ? require.resolve("./empty.cjs") : resolve.call(this, request, ...rest);
};

async function main() {
  const { syncPermissionCatalog, syncSystemRoles } = await import("../src/server/rbac/sync");
  const { seedDemoAccounts } = await import("../src/server/demo/seed-foundation");
  const { syncCentralDirections } = await import("../src/server/org/central");
  const { prisma } = await import("../src/server/db");
  const permissions = await syncPermissionCatalog();
  const roles = await syncSystemRoles();
  const users = process.argv.includes("--demo-accounts") ? await seedDemoAccounts() : 0;
  const central = await syncCentralDirections();
  console.log(`[roles:sync] ${permissions} permissions, ${roles} roles, ${users} new demo accounts, ${central} new central directions`);
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error("[roles:sync] failed:", e);
  process.exit(1);
});

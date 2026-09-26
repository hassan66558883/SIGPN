/**
 * `npm run traffic:import` — imports (or refreshes) the official offence table into the database and
 * verifies it against the source. Idempotent; safe to run in production (reference data only).
 */
import "dotenv/config";
import { prisma } from "../src/server/db";
import { syncTrafficCatalog, verifyTrafficCatalog } from "../src/server/traffic/catalog";
import { TRAFFIC_SOURCE_DOCUMENT } from "../src/server/traffic/data/violations-source";

async function main() {
  const r = await syncTrafficCatalog();
  const problems = await verifyTrafficCatalog();
  const byCat = await prisma.trafficViolation.groupBy({ by: ["categoryId"], _count: true });
  console.log(`[traffic:import] source: ${TRAFFIC_SOURCE_DOCUMENT.title} (sha256 ${TRAFFIC_SOURCE_DOCUMENT.sha256.slice(0, 12)}…)`);
  console.log(`[traffic:import] ${r.violations} infractions (${r.created} créées, ${r.updated} mises à jour), ${r.references} références juridiques, ${r.categories} catégories (${byCat.map((c) => c._count).join(" / ")})`);
  if (problems.length) {
    console.error("[traffic:import] ÉCART avec la source :\n - " + problems.join("\n - "));
    process.exitCode = 1;
  } else {
    console.log("[traffic:import] catalogue conforme à la source.");
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("[traffic:import] échec :", e);
  await prisma.$disconnect();
  process.exit(1);
});

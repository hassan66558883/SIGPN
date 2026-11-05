/**
 * `npm run hr:rotation` — one pass of the automatic assignment (for an external cron when HR_SCHEDULER=off).
 * Does nothing while AFFECTATION_AUTOMATIQUE is disabled. Prints the summary as JSON.
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
  const { runRotation } = await import("../src/server/hr/rotation");
  const { applyDueDiscipline } = await import("../src/server/hr/discipline");
  const { prisma } = await import("../src/server/db");
  try {
    const discipline = await applyDueDiscipline();
    console.log(JSON.stringify({ discipline, rotation: await runRotation({ trigger: "SCHEDULER" }) }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0)) // some imported server modules keep timers alive; the job is done
  .catch((e) => {
    console.error("[hr-rotation] failed:", e);
    process.exit(1);
  });

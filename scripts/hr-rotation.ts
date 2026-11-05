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
  const { prisma } = await import("../src/server/db");
  try {
    console.log(JSON.stringify(await runRotation({ trigger: "SCHEDULER" }), null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[hr-rotation] failed:", e);
  process.exit(1);
});

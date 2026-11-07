/**
 * `npm run alerts:maintain` — one pass of the alert network maintenance (retries, reminders, escalations),
 * for an external cron when ALERT_SCHEDULER=off. Prints the summary as JSON.
 */
import "dotenv/config";
import Module from "node:module";

const m = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolve = m._resolveFilename;
m._resolveFilename = function (request: string, ...rest: unknown[]) {
  return request === "server-only" ? require.resolve("./empty.cjs") : resolve.call(this, request, ...rest);
};

async function main() {
  const { runAlertMaintenance } = await import("../src/server/alerts/maintenance");
  const { prisma } = await import("../src/server/db");
  try {
    console.log(JSON.stringify(await runAlertMaintenance(), null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[alerts-maintain] failed:", e);
    process.exit(2);
  });

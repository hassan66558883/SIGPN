/**
 * `npm run hr:check` — consistency checks of the HR data. Prints the anomalies; exit code 1 when an error-level
 * anomaly exists (usable in a deployment pipeline or a nightly cron).
 */
import "dotenv/config";
import Module from "node:module";

const m = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolve = m._resolveFilename;
m._resolveFilename = function (request: string, ...rest: unknown[]) {
  return request === "server-only" ? require.resolve("./empty.cjs") : resolve.call(this, request, ...rest);
};

async function main() {
  const { runIntegrityChecks } = await import("../src/server/hr/integrity");
  const r = await runIntegrityChecks();
  for (const i of r.issues) console.log(`${i.severity === "error" ? "ERROR  " : "warning"} ${i.code.padEnd(36)} ${String(i.count).padStart(6)}  ${i.description}`);
  console.log(`\n${r.errors} error type(s), ${r.warnings} warning type(s).`);
  process.exit(r.errors > 0 ? 1 : 0);
}
main().catch((e) => {
  console.error("[hr-check] failed:", e);
  process.exit(2);
});

/**
 * `npm run hr:import -- <file.csv> [--apply] [--report report.csv]` — bulk creation of officer dossiers from a CSV.
 * Dry run by default (validation + report only). Existing badge numbers are never overwritten. Rows with errors are
 * skipped and listed in the report; valid rows are still imported with --apply.
 * Columns: badgeNumber,firstName,lastName,gender,dateOfBirth,birthPlace,maritalStatus,rankCode,stationCode,positionCode,
 * corpsCode,hiredAt,serviceStartDate,currentPostSince,phone,email (dates: YYYY-MM-DD or DD/MM/YYYY).
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import Module from "node:module";

const m = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolve = m._resolveFilename;
m._resolveFilename = function (request: string, ...rest: unknown[]) {
  return request === "server-only" ? require.resolve("./empty.cjs") : resolve.call(this, request, ...rest);
};

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) throw new Error("Usage: npm run hr:import -- <file.csv> [--apply] [--report report.csv]");
  const apply = args.includes("--apply");
  const rIdx = args.indexOf("--report");
  const { importOfficers } = await import("../src/server/hr/import");
  const started = Date.now();
  const rep = await importOfficers(readFileSync(file, "utf8"), { apply });
  const lines = ["line,badgeNumber,level,message", ...rep.errors.map((e) => `${e.line},${e.badgeNumber},error,"${e.message.replace(/"/g, '""')}"`), ...rep.warnings.map((e) => `${e.line},${e.badgeNumber},warning,"${e.message.replace(/"/g, '""')}"`)];
  if (rIdx >= 0 && args[rIdx + 1]) writeFileSync(args[rIdx + 1], lines.join("\n") + "\n");
  console.log(`${rep.dryRun ? "DRY RUN" : "APPLIED"} in ${((Date.now() - started) / 1000).toFixed(1)} s — rows: ${rep.rows}, valid: ${rep.valid}, created: ${rep.created}, skipped (existing): ${rep.skippedExisting}, errors: ${rep.errors.length}, warnings: ${rep.warnings.length}`);
  for (const e of rep.errors.slice(0, 15)) console.log(`  line ${e.line} ${e.badgeNumber}: ${e.message}`);
  if (rep.errors.length > 15) console.log(`  … ${rep.errors.length - 15} more error(s) (use --report)`);
  if (rep.dryRun) console.log("Nothing was written. Re-run with --apply to import the valid rows.");
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[hr-import] failed:", e.message ?? e);
    process.exit(2);
  });

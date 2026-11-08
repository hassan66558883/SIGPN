/**
 * Gives the demonstration accounts that need a second factor a TOTP secret, so a live demo can sign in.
 *   DATABASE_URL=…/pms_demo npx tsx scripts/demo/mfa.ts      then      DATABASE_URL=…/pms_demo npx tsx scripts/demo-totp.ts chief.abe
 * Demonstration accounts only; refuses a database whose name does not end with _demo.
 */
import { ensureMfa, pool } from "./lib";

(async () => {
  const name = new URL(process.env.DATABASE_URL ?? "postgresql://x/none").pathname.slice(1);
  if (!name.endsWith("_demo")) { console.error(`Refusing: "${name}" is not a demonstration database (name must end with _demo).`); process.exit(2); }
  const users = ["admin", "commander.national", "commander.central", "chief.cs1", "chief.abe", "chief.arr5", "chief.mdu"];
  await ensureMfa(users);
  console.log(`second factor enabled for: ${users.join(", ")}`);
  await pool.end();
})();

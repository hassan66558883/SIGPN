/**
 * Rebuilds the DG demonstration database from nothing: drop + create + migrations + fictitious seed.
 *   DEMO_DATABASE_URL=postgresql://user:pass@host:port/pms_demo npx tsx scripts/demo/reset.ts
 * Refuses any database whose name does not end with `_demo`. Stop the demo server first (its connections are closed here anyway).
 */
import "dotenv/config";
import { Pool } from "pg";
import { execSync } from "node:child_process";

const target = process.env.DEMO_DATABASE_URL ?? "";
if (!target) { console.error("DEMO_DATABASE_URL is required"); process.exit(2); }
const u = new URL(target);
const name = u.pathname.replace(/^\//, "");
if (!/^[a-z0-9_]+_demo$/.test(name)) { console.error(`Refusing: database "${name}" does not end with _demo.`); process.exit(2); }

(async () => {
  const admin = new URL(target);
  admin.pathname = "/postgres";
  const pool = new Pool({ connectionString: admin.toString() });
  await pool.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()`, [name]);
  await pool.query(`DROP DATABASE IF EXISTS "${name}"`);
  await pool.query(`CREATE DATABASE "${name}"`);
  await pool.end();
  const env = { ...process.env, DATABASE_URL: target, NODE_OPTIONS: "--conditions=react-server" };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  try { execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env }); } catch { console.log("(seed reported an error: it is idempotent, running it a second time)"); execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env }); }
  console.log(`demo database ${name} ready`);
})().catch((e) => { console.error(e); process.exit(1); });

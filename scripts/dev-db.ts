/**
 * Local development database (embedded PostgreSQL 18, port 5436).
 * Usage: npm run db:dev   (keep it running while developing)
 *
 * Production uses a managed/Dockerised PostgreSQL — see deploy/docker-compose.yml.
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const DATA_DIR = path.resolve(process.cwd(), ".pgdata");
const DB_NAME = "pms";

function parseDatabaseUrl(url: string | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return { user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), port: Number(u.port || 5432), db: u.pathname.replace(/^\//, "") || DB_NAME };
  } catch {
    return null;
  }
}

async function main() {
  const fromEnv = parseDatabaseUrl(process.env.DATABASE_URL);
  const user = fromEnv?.user || "pms_app";
  const password = fromEnv?.password || "pms_dev_password";
  const port = fromEnv?.port || 5436;
  const dbName = fromEnv?.db || DB_NAME;
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user,
    password,
    port,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: (m) => process.stdout.write(`[pg] ${String(m).trimEnd()}\n`),
    onError: (m) => process.stderr.write(`[pg] ${String(m).trimEnd()}\n`),
  });
  const initialised = existsSync(path.join(DATA_DIR, "PG_VERSION"));
  if (!initialised) {
    console.log(`[dev-db] initialising cluster in ${DATA_DIR}`);
    await pg.initialise();
  }
  await pg.start();
  console.log(`[dev-db] PostgreSQL listening on 127.0.0.1:${port} (user ${user})`);
  if (!initialised) {
    await pg.createDatabase(dbName);
    console.log(`[dev-db] database "${dbName}" created`);
  }
  console.log("[dev-db] ready. Ctrl+C to stop.");
  const shutdown = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error("[dev-db] failed:", e);
  process.exit(1);
});

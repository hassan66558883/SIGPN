/**
 * `DATABASE_URL=…/pms_load PMS_URL=http://localhost:3301 npx tsx scripts/hr-bench.ts` — response-time measurements of
 * the HR API on the synthetic national dataset (see hr-loadgen). Refuses to run on a non-scratch database.
 * Prints median / p95 / max (ms) and payload size for each endpoint over N runs (the first run is a warm-up).
 */
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { Client } from "pg";

const url = process.env.DATABASE_URL ?? "";
if (!new URL(url).pathname.replace(/^\//, "").endsWith("_load")) {
  console.error("Refusing to run: not a scratch (_load) database.");
  process.exit(2);
}
const BASE = process.env.PMS_URL ?? "http://localhost:3301";
const RUNS = Number(process.env.RUNS ?? 7);

async function main() {
  const c = new Client({ connectionString: url });
  await c.connect();
  const keyFor = async (username: string) => {
    const key = `pms_bn${randomBytes(32).toString("base64url")}`;
    const u = await c.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
    await c.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'hr-bench','bench',$3) ON CONFLICT DO NOTHING`, [`apikey_bn_${username}_${Date.now()}`, u.rows[0].id, createHash("sha256").update(key).digest("hex")]);
    return key;
  };
  const director = await keyFor("hr.director");
  const chief = await keyFor("chief.cs1");
  const admin = await keyFor("police.admin");
  const station = (await c.query(`SELECT s.id FROM "Station" s JOIN "Officer" o ON o."stationId"=s.id AND o."isActive" WHERE s.code LIKE 'LD-%' GROUP BY s.id ORDER BY count(*) DESC LIMIT 1`)).rows[0].id as string;
  const officer = (await c.query(`SELECT id FROM "Officer" WHERE "badgeNumber"='LD007000'`)).rows[0].id as string;
  const region = (await c.query(`SELECT "regionId" FROM "Station" WHERE id=$1`, [station])).rows[0].regionId as string;
  const rank = (await c.query(`SELECT id FROM "Rank" WHERE code='IP'`)).rows[0].id as string;
  const entries = (await c.query(`SELECT id FROM "Officer" WHERE "stationId"=$1 AND "isActive" LIMIT 60`, [station])).rows.map((r) => ({ officerId: r.id, status: "PRESENT" }));
  const day = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);

  const cases: { name: string; key: string; method?: string; path: string; body?: unknown }[] = [
    { name: "dossiers list (national, page 1)", key: director, path: "/api/v1/hr/dossiers?pageSize=25" },
    { name: "dossiers list (page 400)", key: director, path: "/api/v1/hr/dossiers?pageSize=25&page=400" },
    { name: "dossiers search by name", key: director, path: "/api/v1/hr/dossiers?q=Mahamat" },
    { name: "dossiers search by badge", key: director, path: "/api/v1/hr/dossiers?q=LD0070" },
    { name: "dossiers filtered (province + grade)", key: director, path: `/api/v1/hr/dossiers?regionId=${region}&rankId=${rank}` },
    { name: "dossier (one officer)", key: director, path: `/api/v1/hr/dossiers/${officer}` },
    { name: "dossiers list as a station commander", key: chief, path: "/api/v1/hr/dossiers?pageSize=25" },
    { name: "statistics (national, 12 months)", key: director, path: "/api/v1/hr/stats" },
    { name: "statistics (one province)", key: director, path: `/api/v1/hr/stats?regionId=${region}` },
    { name: "statistics CSV export", key: director, path: "/api/v1/hr/stats/export" },
    { name: "roll-call sheet of one structure", key: director, path: `/api/v1/hr/attendance?stationId=${station}&date=${day}` },
    { name: "roll-call save (60 officers)", key: admin, method: "PUT", path: "/api/v1/hr/attendance", body: { stationId: station, date: day, entries } },
    { name: "attendance statistics (national, 30 days)", key: director, path: "/api/v1/hr/attendance/stats" },
    { name: "leaves list", key: director, path: "/api/v1/hr/leaves?pageSize=25" },
    { name: "trainings list", key: director, path: "/api/v1/hr/trainings?pageSize=25" },
    { name: "transfers list", key: director, path: "/api/v1/hr/transfers?pageSize=25" },
    { name: "documents list", key: director, path: "/api/v1/hr/documents?pageSize=25" },
    { name: "disciplinary files list", key: director, path: "/api/v1/hr/discipline?pageSize=25" },
    { name: "automatic assignment overview", key: director, path: "/api/v1/hr/rotation" },
    { name: "integrity checks", key: director, path: "/api/v1/hr/integrity" },
  ];
  console.log(`API ${BASE} — ${RUNS} runs each (first = warm-up)\n`);
  console.log("endpoint".padEnd(46), "median".padStart(8), "p95".padStart(8), "max".padStart(8), "payload".padStart(10));
  for (const t of cases) {
    const times: number[] = [];
    let size = 0;
    let status = 0;
    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      const res = await fetch(`${BASE}${t.path}`, { method: t.method ?? "GET", headers: { authorization: `Bearer ${t.key}`, ...(t.body ? { "content-type": "application/json" } : {}) }, body: t.body ? JSON.stringify(t.body) : undefined });
      const buf = await res.arrayBuffer();
      const dt = performance.now() - t0;
      status = res.status;
      size = buf.byteLength;
      if (i > 0) times.push(dt);
    }
    times.sort((a, b) => a - b);
    const q = (p: number) => times[Math.min(times.length - 1, Math.floor(p * times.length))];
    console.log(t.name.padEnd(46), `${q(0.5).toFixed(0)} ms`.padStart(8), `${q(0.95).toFixed(0)} ms`.padStart(8), `${times[times.length - 1].toFixed(0)} ms`.padStart(8), `${(size / 1024).toFixed(1)} KB`.padStart(10), status === 200 ? "" : `  ← HTTP ${status}`);
  }
  await c.query(`DELETE FROM "ApiKey" WHERE name='hr-bench'`);
  await c.end();
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

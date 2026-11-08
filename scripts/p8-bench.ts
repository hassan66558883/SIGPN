/**
 * Phase 8 performance bench of the national alert network and the public portal.
 *   DATABASE_URL=…/pms_p8_load PMS_URL=http://localhost:3301 npx tsx scripts/p8-bench.ts [units=300] [alerts=20] [seconds=30]
 * Runs ONLY against a scratch database whose name ends with `_load` (it tops the network up to N units and publishes real alerts).
 * Reports latency percentiles and error counts; exits 1 if a budget is exceeded. Fictional data only.
 */
import "dotenv/config";
import { randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";

const url = process.env.DATABASE_URL ?? "";
const dbName = new URL(url).pathname.replace(/^\//, "");
if (!dbName.endsWith("_load")) {
  console.error(`Refusing to run: database "${dbName}" is not a scratch database (name must end with _load).`);
  process.exit(2);
}
const BASE = process.env.PMS_URL ?? "http://localhost:3301";
const UNITS = Number(process.argv[2] ?? 300);
const ALERTS = Number(process.argv[3] ?? 20);
const SECONDS = Number(process.argv[4] ?? 30);
const pool = new Pool({ connectionString: url, max: 4 });
const RUN = Date.now().toString(36).slice(-5);

const pct = (a: number[], p: number) => (a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor((p / 100) * a.length))] : 0);
const stats = (name: string, ms: number[], errors: number, budgetP95: number) => {
  const row = { name, n: ms.length, errors, p50: Math.round(pct(ms, 50)), p95: Math.round(pct(ms, 95)), p99: Math.round(pct(ms, 99)), max: Math.round(Math.max(0, ...ms)), budgetP95 };
  console.log(`${name.padEnd(46)} n=${String(row.n).padStart(5)} err=${String(errors).padStart(3)} p50=${String(row.p50).padStart(5)}ms p95=${String(row.p95).padStart(5)}ms p99=${String(row.p99).padStart(5)}ms max=${String(row.max).padStart(5)}ms  (budget p95 ${budgetP95} ms)`);
  return row;
};
const failures: string[] = [];
const check = (r: ReturnType<typeof stats>) => {
  if (r.errors > 0) failures.push(`${r.name}: ${r.errors} errors`);
  if (r.p95 > r.budgetP95) failures.push(`${r.name}: p95 ${r.p95} ms > ${r.budgetP95} ms`);
};

async function timed(fn: () => Promise<Response>) {
  const t = performance.now();
  try {
    const r = await fn();
    await r.arrayBuffer();
    return { ms: performance.now() - t, ok: r.status < 400 || r.status === 404, status: r.status };
  } catch {
    return { ms: performance.now() - t, ok: false, status: 0 };
  }
}

let n = 0;
async function keyFor(username: string) {
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  if (!u.rowCount) throw new Error(`user ${username} missing`);
  const key = `pms_bn${RUN}_${randomBytes(32).toString("base64url")}`;
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'bench',$3,$4)`, [`apikey_bn_${username}_${RUN}_${n++}`, u.rows[0].id, `bn${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
const call = (key: string | null, method: string, path: string, body?: unknown) =>
  fetch(`${BASE}${path}`, { method, headers: { ...(key ? { authorization: `Bearer ${key}` } : {}), "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

async function main() {
  console.log(`# bench ${RUN} on ${dbName} -> ${BASE}: ${UNITS} units, ${ALERTS} alerts, ${SECONDS}s polling`);
  // 1. network size
  const regions = (await pool.query(`SELECT id FROM "Region" ORDER BY code`)).rows;
  const have = (await pool.query(`SELECT count(*)::int n FROM "Station" WHERE "isActive"`)).rows[0].n as number;
  for (let i = have; i < UNITS; i++)
    await pool.query(`INSERT INTO "Station"(id,"regionId",code,name,type,status,"isActive","isDemo","updatedAt") VALUES ($1,$2,$3,$4,'STATION','ACTIVE',true,true,now()) ON CONFLICT DO NOTHING`, [`st_bn_${i}`, regions[i % regions.length].id, `BN-${String(i).padStart(3, "0")}`, `Unité de charge ${i}`]);
  const units = (await pool.query(`SELECT count(*)::int n FROM "Station" WHERE "isActive"`)).rows[0].n as number;
  console.log(`active units: ${units}`);

  const keys = { admin: await keyFor("admin"), inv: await keyFor("inv.diallo"), chief: await keyFor("chief.cs1") };
  // pollers: every seeded user that can read alerts and belongs to a unit (one key per user: the 240/min limit is per account)
  const pollers: string[] = [];
  for (const r of (await pool.query(`SELECT u.username FROM "User" u JOIN "Role" ro ON ro.id=u."roleId" JOIN "RolePermission" rp ON rp."roleId"=ro.id JOIN "Permission" p ON p.id=rp."permissionId" WHERE p.code='alerts:view' AND u.status='ACTIVE' AND u."stationId" IS NOT NULL LIMIT 30`)).rows) pollers.push(await keyFor(r.username));
  console.log(`polling accounts: ${pollers.length}`);

  // 2. publication of real alerts to the whole network
  const persons = (await pool.query(`SELECT p.id FROM "Person" p WHERE p."deletedAt" IS NULL AND p."mergedIntoId" IS NULL AND NOT EXISTS (SELECT 1 FROM "WantedPerson" w WHERE w."personId"=p.id AND w.status IN ('DRAFT','PENDING_APPROVAL','ACTIVE','LOCATED','SUSPENDED')) LIMIT ${ALERTS}`)).rows;
  const cs1 = (await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`)).rows[0].id as string;
  const pub: number[] = [];
  let pubErr = 0;
  for (const p of persons) {
    const c = await call(keys.inv, "POST", "/api/v1/wanted", { personId: p.id, stationId: cs1, offense: `Charge ${RUN}`, reason: "Motif de test de charge suffisamment long pour la validation.", dangerLevel: "HIGH", kind: "HEARING", diffusionLevel: "NATIONAL", legalBasis: "Test", issuingAuthority: "Test" });
    const id = ((await c.json()) as { data?: { id: string } }).data?.id;
    if (!id) { pubErr++; continue; }
    await (await call(keys.chief, "PATCH", `/api/v1/wanted/${id}`, { op: "verify" })).arrayBuffer();
    const t = await timed(() => call(keys.admin, "PATCH", `/api/v1/wanted/${id}`, { op: "status", status: "ACTIVE" }));
    pub.push(t.ms);
    if (!t.ok) pubErr++;
  }
  check(stats(`approve + publish to ${units} units`, pub, pubErr, 3000));
  const rows = (await pool.query(`SELECT count(*)::int n FROM "AlertDelivery"`)).rows[0].n;
  console.log(`delivery rows: ${rows}`);

  // 3. polling load: each unit syncs every 20 s -> units/20 req/s of (heartbeat + inbox)
  const rate = units / 20; // requests per second for heartbeat, same for inbox
  const hb: number[] = [], inbox: number[] = [];
  let hbErr = 0, inErr = 0, limited = 0;
  const end = Date.now() + SECONDS * 1000;
  let i = 0;
  const tick = async () => {
    const key = pollers[i++ % pollers.length];
    const a = await timed(() => call(key, "POST", "/api/v1/alerts/heartbeat"));
    if (a.status === 429) limited++; else { hb.push(a.ms); if (!a.ok) hbErr++; }
    const b = await timed(() => call(key, "GET", "/api/v1/alerts?limit=50"));
    if (b.status === 429) limited++; else { inbox.push(b.ms); if (!b.ok) inErr++; }
  };
  const inflight = new Set<Promise<void>>();
  while (Date.now() < end) {
    const p = tick().finally(() => inflight.delete(p));
    inflight.add(p);
    await new Promise((ok) => setTimeout(ok, 1000 / rate));
  }
  await Promise.all(inflight);
  console.log(`target ${rate.toFixed(1)} sync/s; throttled by the per-account limit: ${limited}`);
  check(stats("heartbeat (unit synchronisation)", hb, hbErr, 400));
  check(stats("inbox page of 50", inbox, inErr, 600));

  // 4. national supervision and detail with the full network
  const sup: number[] = [], det: number[] = [];
  let supErr = 0;
  for (let k = 0; k < 15; k++) {
    const t = await timed(() => call(keys.admin, "GET", "/api/v1/alerts/supervision"));
    sup.push(t.ms); if (!t.ok) supErr++;
  }
  const first = (await pool.query(`SELECT id FROM "NationalAlert" ORDER BY seq DESC LIMIT 1`)).rows[0]?.id;
  for (let k = 0; k < 15 && first; k++) { const t = await timed(() => call(keys.admin, "GET", `/api/v1/alerts/supervision/${first}`)); det.push(t.ms); if (!t.ok) supErr++; }
  check(stats(`supervision overview (${units} units)`, sup, supErr, 1500));
  check(stats(`supervision detail (${units} units)`, det, 0, 1500));

  // 5. maintenance pass over the whole queue
  const { runAlertMaintenance } = await import("node:module").then(async (M) => {
    const m = M.default as unknown as { _resolveFilename: (r: string, ...rest: unknown[]) => string };
    const orig = m._resolveFilename;
    m._resolveFilename = function (request: string, ...rest: unknown[]) { return request === "server-only" ? require.resolve("./empty.cjs") : orig.call(this, request, ...rest); };
    return import("../src/server/alerts/maintenance");
  });
  const t0 = performance.now();
  const res = await runAlertMaintenance(new Date(Date.now() + 120 * 60_000));
  const mt = performance.now() - t0;
  console.log(`maintenance pass over ${rows} deliveries: ${Math.round(mt)} ms ${JSON.stringify(res)} (budget 15000 ms)`);
  if (mt > 15_000) failures.push(`maintenance ${Math.round(mt)} ms`);

  // 6. public portal, anonymous, concurrent
  for (const [name, path, budget] of [["public home page", "/", 800], ["public stations API", "/api/v1/public/stations", 400], ["public wanted API", "/api/v1/public/wanted", 400], ["public directory page", "/commissariats", 800], ["public notices page", "/avis-de-recherche", 800]] as const) {
    const ms: number[] = []; let err = 0;
    for (let round = 0; round < 6; round++) {
      const batch = await Promise.all(Array.from({ length: 20 }, () => timed(() => call(null, "GET", path))));
      for (const b of batch) { if (b.status === 429) continue; ms.push(b.ms); if (!b.ok) err++; }
    }
    check(stats(`${name} (20 concurrent)`, ms, err, budget));
  }

  await pool.query(`DELETE FROM "ApiKey" WHERE name='bench' AND "keyPrefix"=$1`, [`bn${RUN}`]);
  await pool.end();
  if (failures.length) {
    console.log("\nBUDGET EXCEEDED:\n - " + failures.join("\n - "));
    process.exit(1);
  }
  console.log("\nall budgets respected");
}
main().catch((e) => { console.error(e); process.exit(2); });

/**
 * Territorial scope isolation — Role + Organizational scope + Permission.
 * Live dev server + seeded database (npm run db:seed).
 *   npx tsx --test tests/integration/territory-scope.test.ts
 */
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";

const BASE = process.env.PMS_URL ?? "http://localhost:3300";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const RUN = Date.now().toString(36).slice(-5);
const keys: Record<string, string> = {};
const st: Record<string, string> = {};

async function keyFor(username: string) {
  const key = `pms_ts${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing — run npm run db:seed`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'territory-test',$3,$4)`, [`apikey_ts_${username}_${RUN}`, u.rows[0].id, `ts${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function api(key: string, path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { authorization: `Bearer ${key}` } });
  const json = (await res.json().catch(() => ({}))) as { data?: unknown; error?: { code: string }; meta?: { total: number } };
  return { res, json };
}
type Officer = { id: string; station: { id: string; code: string } };
type Station = { id: string; code: string };

before(async () => {
  for (const u of ["admin", "commander.central", "commander.dept", "chief.cs1", "chief.arr5", "chief.mdu", "desk.post1"]) keys[u] = await keyFor(u);
  const rows = await pool.query(`SELECT id, code FROM "Station" WHERE code IN ('CS-01','PP-NDJ-01A','BAC-NDJ','CA-NDJ-05','PP-NDJ-05A','NS-01','CC-ABE','DGPN')`);
  for (const r of rows.rows) st[r.code] = r.id;
  assert.ok(st["CS-01"] && st["PP-NDJ-01A"] && st["CA-NDJ-05"] && st["NS-01"], "demo structures missing — run npm run db:seed");
});

after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='territory-test' AND "keyPrefix"=$1`, [`ts${RUN}`]);
  await pool.end();
});

test("station commander sees own structure AND its child posts/units, nothing else", async () => {
  const { res, json } = await api(keys["chief.cs1"], "/api/v1/officers?pageSize=100");
  assert.equal(res.status, 200);
  const officers = json.data as Officer[];
  assert.ok(officers.length > 0);
  const codes = new Set(officers.map((o) => o.station.code));
  assert.ok(codes.has("CS-01"), "own station");
  assert.ok(codes.has("PP-NDJ-01A"), "child post visible to parent commissariat");
  assert.ok(codes.has("BAC-NDJ"), "child unit visible to parent commissariat");
  assert.ok(!codes.has("CA-NDJ-05"), "sibling commissariat NOT visible");
  assert.ok(!codes.has("NS-01"), "other province NOT visible");
  const stations = await api(keys["chief.cs1"], "/api/v1/stations?pageSize=100");
  const scodes = new Set((stations.json.data as Station[]).map((s) => s.code));
  assert.deepEqual([...scodes].sort(), ["BAC-NDJ", "CS-01", "PP-NDJ-01A", "PP-NDJ-02A"].sort());
});

test("an agent of a post sees only their own post (no parent, no siblings)", async () => {
  const { json } = await api(keys["desk.post1"], "/api/v1/officers?pageSize=100");
  const codes = new Set((json.data as Officer[]).map((o) => o.station.code));
  assert.deepEqual([...codes], ["PP-NDJ-01A"]);
});

test("a commissariat cannot read an officer or a structure of another commissariat (404, no existence leak)", async () => {
  const other = await pool.query(`SELECT id FROM "Officer" WHERE "stationId"=$1 LIMIT 1`, [st["CA-NDJ-05"]]);
  const r1 = await api(keys["chief.cs1"], `/api/v1/officers/${other.rows[0].id}`);
  assert.equal(r1.res.status, 404);
  const r2 = await api(keys["chief.cs1"], `/api/v1/stations/${st["CA-NDJ-05"]}`);
  assert.equal(r2.res.status, 404);
  const own = await api(keys["chief.cs1"], `/api/v1/stations/${st["PP-NDJ-01A"]}`);
  assert.equal(own.res.status, 200);
  const r3 = await api(keys["chief.arr5"], `/api/v1/stations/${st["CS-01"]}`);
  assert.equal(r3.res.status, 404);
});

test("provincial commander sees every structure of the province but nothing from other provinces", async () => {
  const { json } = await api(keys["commander.central"], "/api/v1/stations?pageSize=100");
  const codes = new Set((json.data as Station[]).map((s) => s.code));
  for (const c of ["DGPN", "CS-01", "PP-NDJ-01A", "CA-NDJ-05", "CA-NDJ-09"]) assert.ok(codes.has(c), `${c} visible to province`);
  assert.ok(!codes.has("NS-01") && !codes.has("CC-ABE"), "other provinces hidden");
  const officers = await api(keys["commander.central"], "/api/v1/officers?pageSize=100");
  assert.ok((officers.json.data as Officer[]).every((o) => ["DGPN", "CS-01", "PP-NDJ-01A", "PP-NDJ-02A", "BAC-NDJ", "CA-NDJ-05", "PP-NDJ-05A", "CA-NDJ-07"].includes(o.station.code)));
  const provinces = await api(keys["commander.central"], "/api/v1/provinces");
  assert.equal((provinces.json.data as unknown[]).length, 1);
});

test("departmental commander sees all structures of the administrative department, none outside", async () => {
  const { json } = await api(keys["commander.dept"], "/api/v1/stations?pageSize=100");
  const codes = (json.data as Station[]).map((s) => s.code);
  assert.ok(codes.includes("CS-01") && codes.includes("CA-NDJ-05") && codes.includes("CA-NDJ-07"));
  assert.ok(!codes.includes("NS-01"));
  const dep = await pool.query(`SELECT count(*)::int AS n FROM "Station" s JOIN "AdminDepartment" d ON d.id=s."adminDepartmentId" WHERE d.code='DEP-NDJ'`);
  assert.equal(codes.length, dep.rows[0].n);
});

test("national administrator sees all 23 provinces and every structure", async () => {
  const provinces = await api(keys.admin, "/api/v1/provinces");
  assert.equal((provinces.json.data as { code: string }[]).length, 23);
  const stations = await api(keys.admin, "/api/v1/stations?pageSize=100");
  const total = await pool.query(`SELECT count(*)::int AS n FROM "Station"`);
  assert.equal(stations.json.meta?.total, total.rows[0].n);
});

test("station commander of Moundou is isolated from N'Djamena", async () => {
  const { json } = await api(keys["chief.mdu"], "/api/v1/stations?pageSize=100");
  assert.deepEqual([...new Set((json.data as Station[]).map((s) => s.code))].sort(), ["NS-01", "PP-MDU-01"]);
});

test("hierarchy integrity: no station is its own ancestor and every POST/UNIT has a parent", async () => {
  const orphans = await pool.query(`SELECT code FROM "Station" WHERE type IN ('POST','UNIT') AND "parentId" IS NULL`);
  assert.equal(orphans.rowCount, 0, `orphan posts/units: ${orphans.rows.map((r) => r.code).join(",")}`);
  const cycles = await pool.query(`WITH RECURSIVE t AS (SELECT id, "parentId", id AS root, 1 AS depth FROM "Station" UNION ALL SELECT s.id, s."parentId", t.root, t.depth+1 FROM "Station" s JOIN t ON s.id = t."parentId" WHERE t.depth < 20) SELECT count(*)::int AS n FROM t WHERE "parentId" = root`);
  assert.equal(cycles.rows[0].n, 0);
});

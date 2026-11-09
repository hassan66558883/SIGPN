/**
 * Territorial scope sweep — live dev server + seeded database:
 *   npx tsx --test tests/integration/scope-sweep.test.ts
 * A délégué provincial sees only the records of their province; a commissariat sees only its own structure (itself and its
 * attached posts and units). Checked on every list the application offers, and on the reading of one record from outside
 * (404, no existence leak). Uses temporary API keys inserted directly in the database (removed at the end).
 */
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";

const BASE = process.env.PMS_URL ?? "http://localhost:3300";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: "-c timezone=UTC" });
const RUN = Date.now().toString(36);
const keys: Record<string, string> = {};

/** List endpoints and the table behind each (the id of an item is the id of the row). `stationIsId`: the row IS a structure. */
const LISTS: { path: string; table: string; detail?: string; stationIsId?: boolean }[] = [
  { path: "/api/v1/complaints", table: "Complaint", detail: "/api/v1/complaints" },
  { path: "/api/v1/cases", table: "Case", detail: "/api/v1/cases" },
  { path: "/api/v1/persons", table: "Person" },
  { path: "/api/v1/wanted", table: "WantedPerson", detail: "/api/v1/wanted" },
  { path: "/api/v1/incidents", table: "Incident", detail: "/api/v1/incidents" },
  { path: "/api/v1/patrols", table: "Patrol" },
  { path: "/api/v1/arrests", table: "Arrest", detail: "/api/v1/arrests" },
  { path: "/api/v1/detention", table: "Detention", detail: "/api/v1/detention" },
  { path: "/api/v1/officers", table: "Officer", detail: "/api/v1/officers" },
  { path: "/api/v1/users", table: "User", detail: "/api/v1/users" },
  { path: "/api/v1/stations", table: "Station", stationIsId: true, detail: "/api/v1/stations" },
  { path: "/api/v1/traffic/controls", table: "TrafficControl" },
];
const PROVINCES = [
  { who: "commander.central", code: "NDJ" },
  { who: "delegue.loc", code: "LOC" },
  { who: "delegue.oua", code: "OUA" },
  { who: "delegue.bat", code: "BAT" },
];
const COMMISSARIATS = [
  { who: "chief.cs1", station: "CS-01" },
  { who: "chief.arr5", station: "CA-NDJ-05" },
  { who: "chief.mdu", station: "NS-01" },
  { who: "chief.abe", station: "CC-ABE" },
];

async function keyFor(username: string): Promise<string> {
  const key = `pms_it${RUN.slice(-4)}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `${username} exists (run npm run roles:sync -- --demo-accounts)`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'integration',$3,$4)`, [`apikey_sw_${username}_${RUN}`, u.rows[0].id, `it${RUN.slice(-4)}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function call(who: string, path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { authorization: `Bearer ${keys[who]}` } });
  const json = (await res.json().catch(() => ({}))) as { data?: unknown };
  return { status: res.status, data: json.data };
}
/** Up to three pages of a list. */
async function ids(who: string, path: string): Promise<string[]> {
  const out: string[] = [];
  for (let page = 1; page <= 3; page++) {
    const r = await call(who, `${path}${path.includes("?") ? "&" : "?"}pageSize=100&page=${page}`);
    if (r.status !== 200 || !Array.isArray(r.data)) break;
    out.push(...(r.data as { id: string }[]).map((x) => x.id));
    if ((r.data as unknown[]).length < 100) break;
  }
  return out;
}
const columns = async (table: string) => new Set((await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name=$1`, [table])).rows.map((r) => r.column_name as string));
const subtree = async (code: string) => (await pool.query(`WITH RECURSIVE t AS (SELECT id FROM "Station" WHERE code=$1 UNION ALL SELECT s.id FROM "Station" s JOIN t ON s."parentId"=t.id) SELECT id FROM t`, [code])).rows.map((r) => r.id as string);

/** Rows among `idList` that lie OUTSIDE the province (by the row's province, or its structure's). */
async function outsideProvince(table: string, idList: string[], regionId: string, stationIsId: boolean) {
  const cols = await columns(table);
  const expr = stationIsId ? `t."regionId"` : cols.has("regionId") ? `COALESCE(t."regionId", (SELECT s."regionId" FROM "Station" s WHERE s.id = t."stationId"))` : `(SELECT s."regionId" FROM "Station" s WHERE s.id = t."stationId")`;
  const legacy = table === "Person" ? ` AND NOT (t."stationId" IS NULL)` : ""; // persons with no structure are visible to everybody by design
  return (await pool.query(`SELECT t.id FROM "${table}" t WHERE t.id = ANY($1) AND ${expr} IS DISTINCT FROM $2${legacy}`, [idList, regionId])).rows.map((r) => r.id as string);
}
/** Rows among `idList` that lie OUTSIDE the commissariat's structure (itself and its attached posts and units). */
async function outsideStructure(table: string, idList: string[], allowed: string[], stationIsId: boolean) {
  const col = stationIsId ? "id" : `"stationId"`;
  const legacy = table === "Person" ? ` AND NOT (t."stationId" IS NULL)` : "";
  return (await pool.query(`SELECT t.id FROM "${table}" t WHERE t.id = ANY($1) AND (t.${col} IS NULL OR NOT (t.${col} = ANY($2)))${legacy}`, [idList, allowed])).rows.map((r) => r.id as string);
}

before(async () => {
  for (const a of [...PROVINCES, ...COMMISSARIATS]) keys[a.who] = await keyFor(a.who);
});
after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='integration' AND "keyPrefix"=$1`, [`it${RUN.slice(-4)}`]);
  await pool.end();
});

for (const p of PROVINCES) {
  test(`${p.who}: every list shows the province ${p.code} only`, async () => {
    const regionId = (await pool.query(`SELECT id FROM "Region" WHERE code=$1`, [p.code])).rows[0].id;
    let seen = 0;
    for (const l of LISTS) {
      const got = await ids(p.who, l.path);
      seen += got.length;
      if (!got.length) continue;
      const bad = await outsideProvince(l.table, got, regionId, !!l.stationIsId);
      assert.deepEqual(bad, [], `${l.path}: ${bad.length} record(s) of another province shown to ${p.who}`);
    }
    if (p.code === "NDJ") assert.ok(seen > 200, `the N'Djamena authority sees its province's data (${seen} records)`);
    console.log(`  ${p.who}: ${seen} records checked, none outside ${p.code}`);
  });

  test(`${p.who}: a record of another province answers 404, not the record`, async () => {
    const regionId = (await pool.query(`SELECT id FROM "Region" WHERE code=$1`, [p.code])).rows[0].id;
    let tried = 0;
    for (const l of LISTS.filter((x) => x.detail)) {
      const cols = await columns(l.table);
      const where = l.stationIsId ? `"regionId" <> $1` : cols.has("regionId") ? `"regionId" IS NOT NULL AND "regionId" <> $1` : `"stationId" IN (SELECT id FROM "Station" WHERE "regionId" <> $1)`;
      const other = (await pool.query(`SELECT id FROM "${l.table}" WHERE ${where} LIMIT 1`, [regionId])).rows[0];
      if (!other) continue;
      const r = await call(p.who, `${l.detail}/${other.id}`);
      assert.ok(r.status === 404 || r.status === 403, `${l.detail}/{id} of another province answered ${r.status} to ${p.who}`);
      assert.equal(r.data, undefined, "no data leaks with the refusal");
      tried++;
    }
    assert.ok(tried >= 5, `at least five kinds of record were tried (${tried})`);
  });
}

for (const c of COMMISSARIATS) {
  test(`${c.who}: every list shows the structure of ${c.station} only (itself and its posts and units)`, async () => {
    const allowed = await subtree(c.station);
    assert.ok(allowed.length >= 1);
    let seen = 0;
    for (const l of LISTS) {
      const got = await ids(c.who, l.path);
      seen += got.length;
      if (!got.length) continue;
      const bad = await outsideStructure(l.table, got, allowed, !!l.stationIsId);
      assert.deepEqual(bad, [], `${l.path}: ${bad.length} record(s) of another commissariat shown to ${c.who}`);
    }
    assert.ok(seen > 0, `${c.who} sees something of its own (${seen})`);
    console.log(`  ${c.who} (${c.station}, ${allowed.length} structure(s)): ${seen} records checked, none outside`);
  });

  test(`${c.who}: a record of another commissariat answers 404, not the record`, async () => {
    const allowed = await subtree(c.station);
    let tried = 0;
    for (const l of LISTS.filter((x) => x.detail)) {
      const col = l.stationIsId ? "id" : `"stationId"`;
      const other = (await pool.query(`SELECT id FROM "${l.table}" WHERE ${col} IS NOT NULL AND NOT (${col} = ANY($1)) LIMIT 1`, [allowed])).rows[0];
      if (!other) continue;
      const r = await call(c.who, `${l.detail}/${other.id}`);
      assert.ok(r.status === 404 || r.status === 403, `${l.detail}/{id} of another commissariat answered ${r.status} to ${c.who}`);
      assert.equal(r.data, undefined);
      tried++;
    }
    assert.ok(tried >= 5, `at least five kinds of record were tried (${tried})`);
  });
}

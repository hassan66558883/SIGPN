/**
 * PDF export of lists and records — live dev server:  npx tsx --test tests/integration/pdf-export.test.ts
 * Only the heads of each level of command hold records:export_pdf. The export shows what the screen shows (same scope), and every
 * export is audited. Uses temporary API keys inserted directly in the database (removed at the end).
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
const HEADS = ["commander.national", "commander.central", "chief.cs1"];
const OTHERS = ["desk.cs1", "inv.diallo", "auditor", "police.admin", "admin", "traffic.supervisor"];
const MODULES = ["complaints", "cases", "warrants", "arrests", "detention", "incidents"];

async function keyFor(username: string) {
  const key = `pms_it${RUN.slice(-4)}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `${username} exists`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'integration',$3,$4)`, [`apikey_pdf_${username}_${RUN}`, u.rows[0].id, `it${RUN.slice(-4)}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
const get = (who: string, path: string) => fetch(`${BASE}${path}`, { headers: { authorization: `Bearer ${keys[who]}` } });

before(async () => {
  for (const u of [...HEADS, ...OTHERS]) keys[u] = await keyFor(u);
});
after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='integration' AND "keyPrefix"=$1`, [`it${RUN.slice(-4)}`]);
  await pool.end();
});

test("only the four command roles hold the export right", async () => {
  const r = await pool.query(`SELECT r.code FROM "Role" r JOIN "RolePermission" rp ON rp."roleId"=r.id JOIN "Permission" p ON p.id=rp."permissionId" WHERE p.code='records:export_pdf' AND r."isSystem" ORDER BY r.code`);
  assert.deepEqual(r.rows.map((x) => x.code), ["DEPARTMENTAL_COMMANDER", "NATIONAL_COMMANDER", "REGIONAL_COMMANDER", "STATION_COMMANDER"]);
});

for (const who of OTHERS) {
  test(`${who}: no export, in any module (403)`, async () => {
    for (const m of MODULES) assert.equal((await get(who, `/api/v1/exports/${m}`)).status, 403, `${who} ${m}`);
    assert.equal((await get(who, `/api/v1/exports/complaints/whatever`)).status, 403);
  });
}

for (const who of HEADS) {
  test(`${who}: every list exports as a real PDF and the export is audited with the same total as the screen`, async () => {
    for (const m of MODULES) {
      const before = await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='RECORDS_EXPORTED' AND "entityType"=$1 AND "actorLabel" LIKE $2`, [m, `${who} (%`]);
      const res = await get(who, `/api/v1/exports/${m}`);
      assert.equal(res.status, 200, `${who} ${m}`);
      assert.match(res.headers.get("content-type") ?? "", /application\/pdf/);
      assert.match(res.headers.get("content-disposition") ?? "", /attachment/);
      const buf = Buffer.from(await res.arrayBuffer());
      assert.equal(buf.subarray(0, 5).toString(), "%PDF-");
      assert.ok(buf.length > 1500, `${m} pdf size ${buf.length}`);
      const after = await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='RECORDS_EXPORTED' AND "entityType"=$1 AND "actorLabel" LIKE $2`, [m, `${who} (%`]);
      assert.equal(after.rows[0].n, before.rows[0].n + 1, `${m} export audited`);
      // same scope as the screen: the audited total equals the total the list API gives this user
      const last = await pool.query(`SELECT after FROM "AuditLog" WHERE action='RECORDS_EXPORTED' AND "entityType"=$1 AND "actorLabel" LIKE $2 ORDER BY "at" DESC LIMIT 1`, [m, `${who} (%`]);
      const api = await (await get(who, `/api/v1/${m}?pageSize=1`)).json();
      assert.equal(last.rows[0].after.total, api.meta.total, `${who} ${m}: exported total = screen total`);
    }
  });
}

test("a record sheet exports for a head, is refused outside the scope (404), and is audited", async () => {
  const c = await pool.query(`SELECT c.id, c.number FROM "Complaint" c JOIN "Station" s ON s.id=c."stationId" WHERE s.code='CS-01' AND c."deletedAt" IS NULL LIMIT 1`);
  assert.ok(c.rowCount, "a complaint exists at CS-01");
  const ok = await get("chief.cs1", `/api/v1/exports/complaints/${c.rows[0].id}`);
  assert.equal(ok.status, 200);
  assert.equal(Buffer.from(await ok.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
  const a = await pool.query(`SELECT 1 FROM "AuditLog" WHERE action='RECORD_EXPORTED' AND "entityId"=$1 AND "actorLabel" LIKE 'chief.cs1 (%'`, [c.rows[0].id]);
  assert.ok(a.rowCount, "record export audited");
  // a complaint of another commissariat is not exportable by this chief
  const other = await pool.query(`SELECT c.id FROM "Complaint" c JOIN "Station" s ON s.id=c."stationId" WHERE s.code NOT IN ('CS-01') AND s."parentId" IS DISTINCT FROM (SELECT id FROM "Station" WHERE code='CS-01') AND c."deletedAt" IS NULL LIMIT 1`);
  if (other.rowCount) assert.equal((await get("chief.cs1", `/api/v1/exports/complaints/${other.rows[0].id}`)).status, 404, "out of scope: 404");
  assert.equal((await get("chief.cs1", `/api/v1/exports/nope`)).status, 404, "unknown module");
});

test("sheets of the other modules export too", async () => {
  const q: Record<string, string> = { cases: `SELECT id FROM "Case" WHERE "deletedAt" IS NULL AND "isSensitive"=false LIMIT 1`, warrants: `SELECT id FROM "Warrant" LIMIT 1`, arrests: `SELECT id FROM "Arrest" LIMIT 1`, detention: `SELECT id FROM "Detention" LIMIT 1`, incidents: `SELECT id FROM "Incident" LIMIT 1` };
  for (const [m, sql] of Object.entries(q)) {
    const r = await pool.query(sql);
    if (!r.rowCount) continue;
    const res = await get("commander.national", `/api/v1/exports/${m}/${r.rows[0].id}`);
    assert.equal(res.status, 200, `${m} sheet`);
    assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
  }
});

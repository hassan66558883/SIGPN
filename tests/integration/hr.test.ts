/**
 * HR module (phase 3): dossiers, career decisions, scope and permissions.
 * Live dev server + seeded database (npm run db:seed).
 *   npx tsx --test tests/integration/hr.test.ts
 * The test officer it creates ends retired (hidden); career events are append-only and stay in the database.
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
let officerId = "";
const ids = { rankLow: "", rankMid: "", rankHigh: "", pos1: "", pos2: "", station: "" };

async function keyFor(username: string) {
  const key = `pms_hr${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing — run npm run db:seed`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'hr-test',$3,$4)`, [`apikey_hr_${username}_${RUN}`, u.rows[0].id, `hr${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function call(key: string, path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as { data?: any; error?: { code: string; message: string }; meta?: { total: number } };
  return { res, json };
}
const event = (type: string, extra: Record<string, unknown> = {}) => ({ officerId, type, effectiveDate: new Date().toISOString().slice(0, 10), reference: `ARR-${RUN}-${type}`, ...extra });

before(async () => {
  for (const u of ["police.admin", "hr.director", "hr.service", "chief.cs1", "desk.post1"]) keys[u] = await keyFor(u);
  const ranks = await pool.query(`SELECT id, code FROM "Rank" WHERE code IN ('GP','BRG','IP')`);
  const rk = Object.fromEntries(ranks.rows.map((r) => [r.code, r.id]));
  ids.rankLow = rk.GP;
  ids.rankMid = rk.BRG;
  ids.rankHigh = rk.IP;
  const pos = await pool.query(`SELECT id FROM "Position" WHERE "isActive" ORDER BY code LIMIT 2`);
  ids.pos1 = pos.rows[0].id;
  ids.pos2 = pos.rows[1].id;
  ids.station = (await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`)).rows[0].id;
  assert.ok(ids.rankLow && ids.rankMid && ids.rankHigh && ids.pos2 && ids.station, "reference data missing — run npm run db:seed");
  const created = await call(keys["police.admin"], "/api/v1/officers", "POST", { badgeNumber: `HRT${RUN}`.toUpperCase(), firstName: "Test", lastName: `RH${RUN}`, gender: "UNKNOWN", rankId: ids.rankLow, stationId: ids.station, hiredAt: "2015-01-01" });
  assert.equal(created.res.status, 201, JSON.stringify(created.json));
  officerId = created.json.data.id;
});

after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='hr-test' AND "keyPrefix"=$1`, [`hr${RUN}`]);
  await pool.end();
});

test("HR roles can list dossiers; a desk officer cannot", async () => {
  const dir = await call(keys["hr.director"], "/api/v1/hr/dossiers?pageSize=5");
  assert.equal(dir.res.status, 200);
  assert.ok((dir.json.meta?.total ?? 0) > 100, "national HR sees the whole force");
  assert.equal((await call(keys["hr.service"], "/api/v1/hr/dossiers?pageSize=5")).res.status, 200);
  assert.equal((await call(keys["desk.post1"], "/api/v1/hr/dossiers")).res.status, 403);
});

test("a station commander only sees dossiers of own structures", async () => {
  const r = await call(keys["chief.cs1"], "/api/v1/hr/dossiers?pageSize=100");
  assert.equal(r.res.status, 200);
  const codes = new Set((r.json.data as { station: { code: string } }[]).map((d) => d.station.code));
  assert.ok(codes.has("CS-01"));
  assert.ok(!codes.has("NS-01") && !codes.has("CA-NDJ-05"), "no dossier outside the scope");
  const other = await pool.query(`SELECT o.id FROM "Officer" o JOIN "Station" s ON s.id=o."stationId" WHERE s.code='NS-01' LIMIT 1`);
  assert.equal((await call(keys["chief.cs1"], `/api/v1/hr/dossiers/${other.rows[0].id}`)).res.status, 404, "out-of-scope dossier is not found");
});

test("dossier update: HR service can, commander cannot; reading is audited", async () => {
  const body = { firstName: "Test", lastName: `RH${RUN}`, gender: "MALE", dateOfBirth: "1990-05-05", birthPlace: "Moundou", maritalStatus: "MARRIED", hiredAt: "2015-01-01", serviceStartDate: "2015-02-01" };
  const upd = await call(keys["hr.service"], `/api/v1/hr/dossiers/${officerId}`, "PUT", body);
  assert.equal(upd.res.status, 200, JSON.stringify(upd.json));
  assert.equal((await call(keys["chief.cs1"], `/api/v1/hr/dossiers/${officerId}`, "PUT", body)).res.status, 403);
  const got = await call(keys["hr.director"], `/api/v1/hr/dossiers/${officerId}`);
  assert.equal(got.json.data.dossier.birthPlace, "Moundou");
  assert.equal(got.json.data.dossier.maritalStatus, "MARRIED");
  const audit = await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='HR_DOSSIER_VIEWED' AND "entityId"=$1`, [officerId]);
  assert.ok(audit.rows[0].n >= 1, "dossier read is audited");
});

test("career decisions need hr:career, a reference and coherent data", async () => {
  assert.equal((await call(keys["hr.service"], "/api/v1/hr/career-events", "POST", event("PROMOTION", { toRankId: ids.rankMid }))).res.status, 403, "HR service cannot record career decisions");
  const noRef = await call(keys["hr.director"], "/api/v1/hr/career-events", "POST", { ...event("PROMOTION", { toRankId: ids.rankMid }), reference: "" });
  assert.ok(noRef.res.status >= 400 && noRef.res.status < 500, "reference required");
  const down = await call(keys["hr.director"], "/api/v1/hr/career-events", "POST", event("PROMOTION", { toRankId: ids.rankLow }));
  assert.ok(down.res.status >= 400 && down.res.status < 500, "promotion to the same/lower rank refused");
  const noRank = await call(keys["hr.director"], "/api/v1/hr/career-events", "POST", event("PROMOTION"));
  assert.ok(noRank.res.status >= 400 && noRank.res.status < 500, "new rank required");
  const early = await call(keys["hr.director"], "/api/v1/hr/career-events", "POST", { ...event("PROMOTION", { toRankId: ids.rankMid }), effectiveDate: "2010-01-01" });
  assert.ok(early.res.status >= 400 && early.res.status < 500, "cannot precede recruitment");
});

test("promotion, function change, secondment and reinstatement update the dossier and the history", async () => {
  const promo = await call(keys["hr.director"], "/api/v1/hr/career-events", "POST", event("PROMOTION", { toRankId: ids.rankMid }));
  assert.equal(promo.res.status, 201, JSON.stringify(promo.json));
  const fc = await call(keys["hr.director"], "/api/v1/hr/career-events", "POST", event("FUNCTION_CHANGE", { toPositionId: ids.pos2 }));
  assert.equal(fc.res.status, 201, JSON.stringify(fc.json));
  assert.equal((await call(keys["hr.director"], "/api/v1/hr/career-events", "POST", event("REINSTATEMENT"))).res.status >= 400, true, "cannot reinstate someone already active");
  assert.equal((await call(keys["hr.director"], "/api/v1/hr/career-events", "POST", event("SECONDMENT"))).res.status, 201);
  assert.equal((await call(keys["hr.director"], "/api/v1/hr/career-events", "POST", event("SECONDMENT"))).res.status >= 400, true, "cannot second twice");
  assert.equal((await call(keys["hr.director"], "/api/v1/hr/career-events", "POST", event("REINSTATEMENT"))).res.status, 201);
  const d = (await call(keys["hr.director"], `/api/v1/hr/dossiers/${officerId}`)).json.data;
  assert.equal(d.dossier.rankId, ids.rankMid);
  assert.equal(d.dossier.positionId, ids.pos2);
  assert.equal(d.dossier.administrativeStatus, "ACTIVE");
  const types = d.career.map((e: { type: string }) => e.type);
  for (const t of ["PROMOTION", "FUNCTION_CHANGE", "SECONDMENT", "REINSTATEMENT"]) assert.ok(types.includes(t), `${t} in history`);
  const promoEvt = d.career.find((e: { type: string }) => e.type === "PROMOTION");
  assert.equal(promoEvt.fromRankId, ids.rankLow);
  assert.equal(promoEvt.toRankId, ids.rankMid);
});

test("career history is append-only at the database level", async () => {
  await assert.rejects(pool.query(`UPDATE "CareerEvent" SET reason='tamper' WHERE "officerId"=$1`, [officerId]), /append-only/);
  await assert.rejects(pool.query(`DELETE FROM "CareerEvent" WHERE "officerId"=$1`, [officerId]), /append-only/);
});

test("retirement closes the dossier: officer deactivated, no further decision accepted", async () => {
  const r = await call(keys["hr.director"], "/api/v1/hr/career-events", "POST", event("RETIREMENT"));
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  const o = (await pool.query(`SELECT "administrativeStatus", "dutyStatus", "isActive" FROM "Officer" WHERE id=$1`, [officerId])).rows[0];
  assert.deepEqual(o, { administrativeStatus: "RETIRED", dutyStatus: "RETIRED", isActive: false });
  const again = await call(keys["hr.director"], "/api/v1/hr/career-events", "POST", event("PROMOTION", { toRankId: ids.rankHigh }));
  assert.ok(again.res.status >= 400 && again.res.status < 500, "no decision after leaving the service");
});

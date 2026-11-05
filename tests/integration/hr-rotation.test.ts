/**
 * HR phase 5: automatic assignment after a reference duration (AFFECTATION_AUTOMATIQUE).
 * Live dev server + seeded database (npm run db:seed).
 *   npx tsx --test tests/integration/hr-rotation.test.ts
 * The global setting is restored at the end. The roll-out (pilot) setting confines the run to two dedicated test structures,
 * so the demonstration officers are never touched. Test officers end retired (hidden) and the test structures are deactivated;
 * transfers and career events stay (append-only).
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
const off: Record<"A" | "B" | "D", string> = { A: "", B: "", D: "" };
let original: Record<string, unknown> = {};
let startedAt = new Date();

async function keyFor(username: string) {
  const key = `pms_ro${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing — run npm run db:seed`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'hr-rotation-test',$3,$4)`, [`apikey_ro_${username}_${RUN}`, u.rows[0].id, `ro${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function call(who: string, path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${keys[who]}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as { data?: any; error?: { code: string; message: string } };
  return { res, json };
}
const today = () => new Date().toISOString().slice(0, 10);
const monthsAgoSql = (m: number, plusDays = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  return new Date(d.getTime() + plusDays * 86_400_000);
};
const setSince = (id: string, d: Date) => pool.query(`UPDATE "Officer" SET "currentPostSince"=$2 WHERE id=$1`, [id, d]);
const cfg = (over: Record<string, unknown> = {}) => ({ enabled: true, durationMonths: 12, warningDays: 30, categories: [], excludedPositionIds: [], sameProvinceOnly: true, effectiveDelayDays: 0, validatorRoleCodes: [], pilotStationIds: [st.T1], maxProposalsPerRun: 5, ...over });
const save = (over: Record<string, unknown> = {}) => call("admin", "/api/v1/hr/rotation/settings", "PUT", cfg(over));
const run = () => call("hr.director", "/api/v1/hr/rotation/run", "POST");
const autoTransfers = async (officerId: string) => (await pool.query(`SELECT * FROM "TransferRequest" WHERE "officerId"=$1 AND origin='AUTOMATIC' ORDER BY "createdAt"`, [officerId])).rows;
async function newOfficer(tag: string) {
  const r = await call("admin", "/api/v1/officers", "POST", { badgeNumber: `ROT${tag}${RUN}`.toUpperCase(), firstName: "Test", lastName: `ROT${tag}${RUN}`, gender: "UNKNOWN", rankId: (await pool.query(`SELECT id FROM "Rank" WHERE code='GP'`)).rows[0].id, stationId: st.T1, hiredAt: "2001-01-01" });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  return r.json.data.id as string;
}

before(async () => {
  startedAt = new Date();
  for (const u of ["admin", "hr.director", "hr.service", "desk.post1", "commander.central", "commander.national", "chief.cs1"]) keys[u] = await keyFor(u);
  const rows = await pool.query(`SELECT id, code, "regionId" FROM "Station" WHERE code IN ('CS-01','NS-01')`);
  for (const r of rows.rows) st[r.code] = r.id;
  const region = rows.rows.find((r) => r.code === "CS-01").regionId;
  for (const code of ["T1", "T2"]) {
    const ins = await pool.query(`INSERT INTO "Station"(id,"regionId",code,name,type,status,"isActive","isDemo","updatedAt") VALUES ($1,$2,$3,$4,'STATION','ACTIVE',true,true,now()) RETURNING id`, [`st_rot_${code}_${RUN}`, region, `ROT${code}${RUN}`.toUpperCase(), `Structure de test rotation ${code}`]);
    st[code] = ins.rows[0].id;
  }
  original = (await call("admin", "/api/v1/hr/rotation/settings")).json.data;
  assert.ok(original && "enabled" in original, "settings readable");
  await save({ enabled: false });
  for (const k of ["A", "B", "D"] as const) off[k] = await newOfficer(k);
  // new dossiers start their post tenure at hiring (2001): reset it so that only the officers a test dates explicitly are eligible
  await pool.query(`UPDATE "Officer" SET "currentPostSince"=now() WHERE id = ANY($1)`, [Object.values(off)]);
});

after(async () => {
  await call("admin", "/api/v1/hr/rotation/settings", "PUT", original);
  // Direct SQL (not the API): the cleanup must not depend on the rate limiter, which the test itself exercises heavily.
  const ids = Object.values(off);
  await pool.query(`UPDATE "TransferRequest" SET status='CANCELLED', "closeReason"='Test clean-up' WHERE "officerId" = ANY($1) AND status IN ('PROPOSED','HR_APPROVED','APPROVED')`, [ids]);
  await pool.query(`UPDATE "OfficerAssignment" SET "endDate"=now() WHERE "officerId" = ANY($1) AND "endDate" IS NULL`, [ids]);
  await pool.query(`UPDATE "Officer" SET "isActive"=false, "dutyStatus"='RETIRED', "administrativeStatus"='RETIRED' WHERE id = ANY($1)`, [ids]);
  await pool.query(`UPDATE "Station" SET status='INACTIVE', "isActive"=false WHERE id = ANY($1)`, [[st.T1, st.T2]]);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='hr-rotation-test' AND "keyPrefix"=$1`, [`ro${RUN}`]);
  await pool.end();
});

test("only a configuration administrator can change AFFECTATION_AUTOMATIQUE", async () => {
  assert.equal((await call("hr.director", "/api/v1/hr/rotation/settings", "PUT", cfg())).res.status, 403);
  assert.equal((await call("desk.post1", "/api/v1/hr/rotation/settings")).res.status, 403);
  const bad = await call("admin", "/api/v1/hr/rotation/settings", "PUT", cfg({ durationMonths: 0 }));
  assert.ok(bad.res.status >= 400 && bad.res.status < 500, "invalid parameter refused");
  const toggled = await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action IN ('HR_ROTATION_ENABLED','HR_ROTATION_DISABLED','HR_ROTATION_SETTINGS_UPDATED') AND at >= $1`, [startedAt.toISOString()]);
  assert.ok(toggled.rows[0].n >= 1, "settings changes are audited");
});

test("DISABLED: nothing is processed, manual transfers still work, data is kept", async () => {
  await save({ enabled: false });
  await setSince(off.A, monthsAgoSql(13));
  const r = await run();
  assert.equal(r.res.status, 200);
  assert.equal(r.json.data.enabled, false);
  assert.equal(r.json.data.proposals, 0);
  assert.equal((await autoTransfers(off.A)).length, 0);
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "RotationAlert" WHERE "officerId"=$1`, [off.A])).rows[0].n, 0);
  const manual = await call("admin", "/api/v1/hr/transfers", "POST", { officerId: off.A, toStationId: st["NS-01"], effectiveDate: today(), reason: "Mutation manuelle pendant la désactivation" });
  assert.equal(manual.res.status, 201, JSON.stringify(manual.json));
  await call("admin", `/api/v1/hr/transfers/${manual.json.data.id}/cancel`, "POST", { reason: "Nettoyage du test" });
});

test("ENABLED: soon-eligible officers are alerted once", async () => {
  await save();
  await setSince(off.A, monthsAgoSql(12, 10)); // reaches 12 months in ~10 days
  const first = await run();
  assert.equal(first.json.data.enabled, true);
  assert.equal(first.json.data.upcomingAlerts, 1, JSON.stringify(first.json.data));
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "RotationAlert" WHERE "officerId"=$1 AND kind='UPCOMING'`, [off.A])).rows[0].n, 1);
  const n = await pool.query(`SELECT count(*)::int n FROM "Notification" n JOIN "User" u ON u.id=n."userId" WHERE u.username='hr.director' AND n.title='Officers soon eligible for rotation' AND n."createdAt" >= $1`, [startedAt.toISOString()]);
  assert.ok(n.rows[0].n >= 1, "HR is notified");
  assert.equal((await run()).json.data.upcomingAlerts, 0, "idempotent");
  assert.equal((await autoTransfers(off.A)).length, 0, "no proposal before the duration is reached");
});

test("ENABLED: an officer who reached the duration gets exactly one automatic proposal; nobody moves", async () => {
  await setSince(off.A, monthsAgoSql(13));
  const r = await run();
  assert.equal(r.json.data.proposals, 1, JSON.stringify(r.json.data));
  const [t, ...rest] = await autoTransfers(off.A);
  assert.equal(rest.length, 0);
  assert.equal(t.status, "PROPOSED");
  assert.equal(t.proposedById, null, "proposed by the system");
  assert.equal(t.toStationId, st.T2, "least staffed structure of the same type and province");
  const dest = await pool.query(`SELECT s.type, s."regionId", o.type AS otype, o."regionId" AS oregion FROM "Station" s, "Station" o WHERE s.id=$1 AND o.id=$2`, [t.toStationId, st.T1]);
  assert.equal(dest.rows[0].type, dest.rows[0].otype, "same type of structure");
  assert.equal(dest.rows[0].regionId, dest.rows[0].oregion, "same province (rule)");
  assert.equal((await pool.query(`SELECT "stationId" FROM "Officer" WHERE id=$1`, [off.A])).rows[0].stationId, st.T1, "the proposal moved nobody");
  const again = await run();
  assert.equal(again.json.data.proposals, 0, "idempotent");
  // a rejected automatic proposal is not re-proposed during the same tenure
  const rej = await call("hr.director", `/api/v1/hr/transfers/${t.id}/review`, "POST", { decision: "REJECT", note: "Agent indispensable au poste" });
  assert.equal(rej.json.data.status, "REJECTED");
  assert.equal((await run()).json.data.proposals, 0);
  assert.equal((await autoTransfers(off.A)).length, 1);
});

test("exceptions and category filters exclude officers; ending the exception re-enables them", async () => {
  await setSince(off.B, monthsAgoSql(13));
  const ex = await call("hr.service", "/api/v1/hr/rotation/exceptions", "POST", { officerId: off.B, reason: "Congé de maternité en cours" });
  assert.equal(ex.res.status, 201, JSON.stringify(ex.json));
  assert.equal((await call("desk.post1", "/api/v1/hr/rotation/exceptions", "POST", { officerId: off.B, reason: "Tentative sans droit" })).res.status, 403);
  const r1 = await run();
  assert.equal(r1.json.data.proposals, 0);
  assert.ok(r1.json.data.skippedException >= 1);
  assert.equal((await autoTransfers(off.B)).length, 0);
  await call("hr.service", `/api/v1/hr/rotation/exceptions/${ex.json.data.id}/end`, "POST");
  await save({ categories: ["COMMISSIONER"] }); // B is a constable
  assert.equal((await run()).json.data.proposals, 0, "category not concerned");
  await save({ categories: ["CONSTABLE"] });
  assert.equal((await run()).json.data.proposals, 1, "exception ended + category concerned");
  assert.equal((await autoTransfers(off.B)).length, 1);
});

test("validation authorities are restricted by the settings; validation executes and starts a new tenure", async () => {
  await save({ validatorRoleCodes: ["NATIONAL_COMMANDER"], categories: [] });
  const t = (await autoTransfers(off.B))[0];
  assert.equal((await call("hr.director", `/api/v1/hr/transfers/${t.id}/review`, "POST", { decision: "APPROVE" })).res.status, 200);
  const regional = await call("commander.central", `/api/v1/hr/transfers/${t.id}/validate`, "POST", { decision: "APPROVE" });
  assert.ok(regional.res.status >= 400 && regional.res.status < 500, "regional authority not in the configured list");
  const nat = await call("commander.national", `/api/v1/hr/transfers/${t.id}/validate`, "POST", { decision: "APPROVE" });
  assert.equal(nat.res.status, 200, JSON.stringify(nat.json));
  assert.equal(nat.json.data.status, "EXECUTED");
  const o = (await pool.query(`SELECT "stationId", "currentPostSince" FROM "Officer" WHERE id=$1`, [off.B])).rows[0];
  assert.equal(o.stationId, t.toStationId);
  assert.ok(Date.now() - new Date(o.currentPostSince).getTime() < 3 * 86_400_000, "new tenure starts at the transfer date");
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "RotationAlert" WHERE "officerId"=$1`, [off.B])).rows[0].n, 0, "alerts of the previous tenure are cleared");
});

test("the scheduler step executes validated transfers whose date has come (only when enabled)", async () => {
  const p = await call("admin", "/api/v1/hr/transfers", "POST", { officerId: off.D, toStationId: st["NS-01"], effectiveDate: new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10), reason: "Mutation datée dans le futur" });
  assert.equal(p.res.status, 201, JSON.stringify(p.json));
  const id = p.json.data.id;
  await call("hr.director", `/api/v1/hr/transfers/${id}/review`, "POST", { decision: "APPROVE" });
  assert.equal((await call("commander.national", `/api/v1/hr/transfers/${id}/validate`, "POST", { decision: "APPROVE" })).json.data.status, "APPROVED");
  await pool.query(`UPDATE "TransferRequest" SET "effectiveDate"=now() - interval '1 day' WHERE id=$1`, [id]);
  await save({ enabled: false });
  assert.equal((await run()).json.data.executedDue, 0);
  assert.equal((await pool.query(`SELECT status FROM "TransferRequest" WHERE id=$1`, [id])).rows[0].status, "APPROVED", "disabled: not executed automatically");
  await save({ validatorRoleCodes: [] });
  const r = await run();
  assert.equal(r.json.data.executedDue, 1, JSON.stringify(r.json.data));
  assert.equal((await pool.query(`SELECT "stationId" FROM "Officer" WHERE id=$1`, [off.D])).rows[0].stationId, st["NS-01"]);
  assert.equal((await pool.query(`SELECT status FROM "TransferRequest" WHERE id=$1`, [id])).rows[0].status, "EXECUTED");
});

test("only automatic proposals created by this test exist (no pollution of the demonstration data)", async () => {
  const n = await pool.query(`SELECT count(*)::int n FROM "TransferRequest" WHERE origin='AUTOMATIC' AND "createdAt" >= $1`, [startedAt.toISOString()]);
  assert.equal(n.rows[0].n, 2);
});

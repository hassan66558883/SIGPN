/**
 * HR phase 4: transfers (mutations) and their validation circuit.
 * Live dev server + seeded database (npm run db:seed).
 *   npx tsx --test tests/integration/hr-transfers.test.ts
 * The test officer ends retired (hidden); transfers and career events are never deleted.
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
let officerId = "";
let rankId = "";

async function keyFor(username: string) {
  const key = `pms_tr${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing — run npm run db:seed`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'hr-transfer-test',$3,$4)`, [`apikey_tr_${username}_${RUN}`, u.rows[0].id, `tr${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function call(who: string, path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${keys[who]}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const ct = res.headers.get("content-type") ?? "";
  const json = ct.includes("json") ? ((await res.json()) as { data?: any; error?: { code: string; message: string } }) : {};
  return { res, json, ct };
}
const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const where = async () => (await pool.query(`SELECT "stationId", "currentPostSince" FROM "Officer" WHERE id=$1`, [officerId])).rows[0];
const propose = (who: string, to: string, effectiveDate = today(), extra: Record<string, unknown> = {}) => call(who, "/api/v1/hr/transfers", "POST", { officerId, toStationId: st[to], effectiveDate, reason: "Besoin de service (test)", ...extra });
const is4xx = (r: { res: Response }) => r.res.status >= 400 && r.res.status < 500;

before(async () => {
  for (const u of ["police.admin", "hr.director", "hr.service", "chief.cs1", "desk.post1", "commander.central", "commander.national"]) keys[u] = await keyFor(u);
  const rows = await pool.query(`SELECT id, code FROM "Station" WHERE code IN ('CS-01','CA-NDJ-05','NS-01')`);
  for (const r of rows.rows) st[r.code] = r.id;
  assert.ok(st["CS-01"] && st["CA-NDJ-05"] && st["NS-01"], "demo structures missing — run npm run db:seed");
  rankId = (await pool.query(`SELECT id FROM "Rank" WHERE code='GP'`)).rows[0].id;
  const created = await call("police.admin", "/api/v1/officers", "POST", { badgeNumber: `TRF${RUN}`.toUpperCase(), firstName: "Test", lastName: `MUT${RUN}`, gender: "UNKNOWN", rankId, stationId: st["CS-01"], hiredAt: "2015-01-01" });
  assert.equal(created.res.status, 201, JSON.stringify(created.json));
  officerId = created.json.data.id;
});

after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='hr-transfer-test' AND "keyPrefix"=$1`, [`tr${RUN}`]);
  await pool.end();
});

test("only holders of hr:transfer_propose can propose; a proposal moves nobody", async () => {
  assert.equal((await propose("desk.post1", "CA-NDJ-05")).res.status, 403);
  const r = await propose("chief.cs1", "CA-NDJ-05");
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  assert.equal(r.json.data.status, "PROPOSED");
  assert.match(r.json.data.number, /^MUT-\d{4}-\d{5}$/);
  assert.equal((await where()).stationId, st["CS-01"], "officer has not moved");
  assert.ok(is4xx(await propose("chief.cs1", "NS-01")), "one open transfer per officer");
});

test("the circuit cannot be short-circuited", async () => {
  const id = (await pool.query(`SELECT id FROM "TransferRequest" WHERE "officerId"=$1 AND status='PROPOSED'`, [officerId])).rows[0].id;
  assert.equal((await call("chief.cs1", `/api/v1/hr/transfers/${id}/review`, "POST", { decision: "APPROVE" })).res.status, 403, "proposer has no review permission");
  const early = await call("commander.national", `/api/v1/hr/transfers/${id}/validate`, "POST", { decision: "APPROVE" });
  assert.ok(is4xx(early), "authority cannot validate before the HR examination");
  assert.equal((await call("chief.cs1", `/api/v1/hr/transfers/${id}/execute`, "POST")).res.status, 403);
  assert.equal((await call("commander.national", `/api/v1/hr/transfers/${id}/execute`, "POST")).res.status, 403, "execution needs the HR permission");
  assert.equal((await call("chief.cs1", `/api/v1/hr/transfers/${id}/decision`)).res.status, 409, "no decision before validation");
  assert.equal((await where()).stationId, st["CS-01"]);
  const hr = await call("hr.director", `/api/v1/hr/transfers/${id}/review`, "POST", { decision: "APPROVE", note: "Conforme" });
  assert.equal(hr.res.status, 200, JSON.stringify(hr.json));
  assert.equal(hr.json.data.status, "HR_APPROVED");
  assert.equal((await where()).stationId, st["CS-01"], "HR approval alone moves nobody");
  assert.equal((await call("hr.director", `/api/v1/hr/transfers/${id}/validate`, "POST", { decision: "APPROVE" })).res.status, 403, "HR cannot validate");
});

test("validation: authority must cover both structures; then decision + execution update everything", async () => {
  const id = (await pool.query(`SELECT id FROM "TransferRequest" WHERE "officerId"=$1 AND status='HR_APPROVED'`, [officerId])).rows[0].id;
  const v = await call("commander.central", `/api/v1/hr/transfers/${id}/validate`, "POST", { decision: "APPROVE", note: "Validé" });
  assert.equal(v.res.status, 200, JSON.stringify(v.json));
  assert.equal(v.json.data.status, "EXECUTED", "effective today: executed with the validation");
  assert.match(v.json.data.decisionNumber, /^DAF-\d{4}-\d{5}$/);
  const o = await where();
  assert.equal(o.stationId, st["CA-NDJ-05"], "officer moved");
  assert.ok(o.currentPostSince, "date of taking up the post set");
  const asg = await pool.query(`SELECT "stationId", "endDate" FROM "OfficerAssignment" WHERE "officerId"=$1 ORDER BY "startDate" DESC, "createdAt" DESC`, [officerId]);
  assert.equal(asg.rows[0].stationId, st["CA-NDJ-05"]);
  assert.equal(asg.rows[0].endDate, null, "new assignment is open");
  assert.ok(asg.rows.slice(1).every((r) => r.endDate), "previous assignments closed");
  const ev = await pool.query(`SELECT reference, "fromStationId", "toStationId" FROM "CareerEvent" WHERE "officerId"=$1 AND type='TRANSFER'`, [officerId]);
  assert.equal(ev.rowCount, 1);
  assert.equal(ev.rows[0].reference, v.json.data.decisionNumber);
  assert.equal(ev.rows[0].fromStationId, st["CS-01"]);
  const pdf = await call("chief.cs1", `/api/v1/hr/transfers/${id}/decision`);
  assert.equal(pdf.res.status, 200);
  assert.match(pdf.ct, /application\/pdf/);
  const notif = await pool.query(`SELECT count(*)::int n FROM "Notification" n JOIN "User" u ON u.id=n."userId" WHERE u.username='chief.cs1' AND n.title='Transfer executed' AND n.body LIKE $1`, [`%${v.json.data.decisionNumber}%`]);
  assert.ok(notif.rows[0].n >= 1, "proposer notified");
  assert.equal((await call("chief.cs1", `/api/v1/hr/dossiers/${officerId}`)).res.status, 404, "officer left the commander's scope");
});

test("a regional authority cannot validate a transfer leaving its province; the national one can", async () => {
  const p = await propose("police.admin", "NS-01");
  assert.equal(p.res.status, 201, JSON.stringify(p.json));
  const id = p.json.data.id;
  assert.equal((await call("hr.service", `/api/v1/hr/transfers/${id}/review`, "POST", { decision: "APPROVE" })).res.status, 200);
  const regional = await call("commander.central", `/api/v1/hr/transfers/${id}/validate`, "POST", { decision: "APPROVE" });
  assert.ok(is4xx(regional), `regional authority refused: ${regional.res.status}`);
  assert.equal((await where()).stationId, st["CA-NDJ-05"], "nothing moved");
  const nat = await call("commander.national", `/api/v1/hr/transfers/${id}/validate`, "POST", { decision: "APPROVE" });
  assert.equal(nat.res.status, 200, JSON.stringify(nat.json));
  assert.equal(nat.json.data.status, "EXECUTED");
  assert.equal((await where()).stationId, st["NS-01"]);
});

test("a future effective date stays APPROVED (no movement, decision available) until its date; it can be cancelled", async () => {
  const p = await propose("police.admin", "CS-01", inDays(10));
  assert.equal(p.res.status, 201, JSON.stringify(p.json));
  const id = p.json.data.id;
  await call("hr.director", `/api/v1/hr/transfers/${id}/review`, "POST", { decision: "APPROVE" });
  const v = await call("commander.national", `/api/v1/hr/transfers/${id}/validate`, "POST", { decision: "APPROVE" });
  assert.equal(v.res.status, 200, JSON.stringify(v.json));
  assert.equal(v.json.data.status, "APPROVED");
  assert.equal((await where()).stationId, st["NS-01"], "not moved before the effective date");
  assert.equal((await call("hr.director", `/api/v1/hr/transfers/${id}/decision`)).res.status, 200, "decision issued at validation");
  assert.ok(is4xx(await call("hr.director", `/api/v1/hr/transfers/${id}/execute`, "POST")), "too early to execute");
  const c = await call("police.admin", `/api/v1/hr/transfers/${id}/cancel`, "POST", { reason: "Annulée par le test" });
  assert.equal(c.json.data.status, "CANCELLED");
  assert.equal((await where()).stationId, st["NS-01"]);
});

test("rejections need a reason; the reviewer cannot be the proposer", async () => {
  const p = await propose("police.admin", "CS-01");
  const id = p.json.data.id;
  assert.ok(is4xx(await call("police.admin", `/api/v1/hr/transfers/${id}/review`, "POST", { decision: "APPROVE" })), "four-eyes: proposer cannot examine own proposal");
  assert.ok(is4xx(await call("hr.director", `/api/v1/hr/transfers/${id}/review`, "POST", { decision: "REJECT" })), "reason required");
  const r = await call("hr.director", `/api/v1/hr/transfers/${id}/review`, "POST", { decision: "REJECT", note: "Effectif insuffisant à destination" });
  assert.equal(r.json.data.status, "REJECTED");
  assert.equal((await where()).stationId, st["NS-01"]);
  // the same person cannot both examine and validate
  const p2 = await propose("police.admin", "CS-01");
  await call("hr.director", `/api/v1/hr/transfers/${p2.json.data.id}/review`, "POST", { decision: "APPROVE" });
  const rej = await call("commander.national", `/api/v1/hr/transfers/${p2.json.data.id}/validate`, "POST", { decision: "REJECT", note: "Pas opportun" });
  assert.equal(rej.json.data.status, "REJECTED");
});

test("database guarantees: one open transfer per officer, decision required, no deletion", async () => {
  const p = await propose("police.admin", "CS-01");
  assert.equal(p.res.status, 201);
  const id = p.json.data.id;
  await assert.rejects(pool.query(`UPDATE "TransferRequest" SET status='EXECUTED' WHERE id=$1`, [id]), /executed_has_decision|check constraint/i);
  await assert.rejects(pool.query(`DELETE FROM "TransferRequest" WHERE id=$1`, [id]), /append-only/);
  await assert.rejects(
    pool.query(`INSERT INTO "TransferRequest"(id,number,"officerId","fromStationId","toStationId","effectiveDate",reason,status,"updatedAt") VALUES ($1,$2,$3,$4,$5,now(),'x','PROPOSED',now())`, [`dup_${RUN}`, `DUP-${RUN}`, officerId, st["NS-01"], st["CS-01"]]),
    /one_open_per_officer|unique/i,
  );
  await call("police.admin", `/api/v1/hr/transfers/${id}/cancel`, "POST", { reason: "Nettoyage du test" });
});

test("scope: a commander sees transfers touching own structures only", async () => {
  const mine = await call("chief.cs1", "/api/v1/hr/transfers?pageSize=100");
  assert.equal(mine.res.status, 200);
  const own = new Set((await pool.query(`SELECT id FROM "Station" WHERE code='CS-01' OR "parentId"=$1`, [st["CS-01"]])).rows.map((r) => r.id));
  const list = mine.json.data as { fromStationId: string; toStationId: string }[];
  assert.ok(list.length > 0);
  for (const t of list) assert.ok(own.has(t.fromStationId) || own.has(t.toStationId), "every listed transfer touches the commander's structures");
  const all = await call("hr.director", "/api/v1/hr/transfers?pageSize=100");
  assert.ok((all.json.data as unknown[]).length >= (mine.json.data as unknown[]).length);
  const nsTransfer = await pool.query(`SELECT id FROM "TransferRequest" WHERE "officerId"=$1 AND "toStationId"=$2 AND status='EXECUTED'`, [officerId, st["NS-01"]]);
  assert.equal((await call("chief.cs1", `/api/v1/hr/transfers/${nsTransfer.rows[0].id}`)).res.status, 404, "transfer outside the commander's scope is not found");
});

test("cleanup: retire the test officer", async () => {
  const r = await call("hr.director", "/api/v1/hr/career-events", "POST", { officerId, type: "RETIREMENT", effectiveDate: today(), reference: `ARR-${RUN}-FIN` });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
});

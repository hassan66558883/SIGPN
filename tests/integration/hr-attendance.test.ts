/**
 * HR phase 6: roll-call, leave and absences, statistics, training evaluation, competences and certificates.
 * Live dev server + seeded database (npm run db:seed).
 *   npx tsx --test tests/integration/hr-attendance.test.ts
 * Everything happens in a dedicated test structure and with dedicated test officers (deactivated at the end).
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
const off: Record<"O1" | "O2" | "O3" | "OTHER", string> = { O1: "", O2: "", O3: "", OTHER: "" };
let station = "";
let deskUserId = "";

async function keyFor(username: string) {
  const key = `pms_at${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing — run npm run db:seed`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'hr-attendance-test',$3,$4)`, [`apikey_at_${username}_${RUN}`, u.rows[0].id, `at${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function call(who: string, path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${keys[who]}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const ct = res.headers.get("content-type") ?? "";
  const json = ct.includes("json") ? ((await res.json()) as { data?: any; error?: { code: string; message: string } }) : {};
  return { res, json, ct };
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const inDays = (n: number) => iso(new Date(Date.now() + n * 86_400_000));
const today = () => iso(new Date());
const is4xx = (r: { res: Response }) => r.res.status >= 400 && r.res.status < 500;
async function newOfficer(tag: string, stationId: string) {
  const r = await call("police.admin", "/api/v1/officers", "POST", { badgeNumber: `ATT${tag}${RUN}`.toUpperCase(), firstName: "Test", lastName: `ATT${tag}${RUN}`, gender: "UNKNOWN", rankId: (await pool.query(`SELECT id FROM "Rank" WHERE code='GP'`)).rows[0].id, stationId, hiredAt: "2015-01-01" });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  return r.json.data.id as string;
}

before(async () => {
  for (const u of ["police.admin", "hr.director", "hr.service", "chief.cs1", "desk.post1", "commander.central"]) keys[u] = await keyFor(u);
  const region = (await pool.query(`SELECT "regionId" FROM "Station" WHERE code='CS-01'`)).rows[0].regionId;
  station = (await pool.query(`INSERT INTO "Station"(id,"regionId",code,name,type,status,"isActive","isDemo","updatedAt") VALUES ($1,$2,$3,'Structure de test présences','STATION','ACTIVE',true,true,now()) RETURNING id`, [`st_att_${RUN}`, region, `ATT${RUN}`.toUpperCase()])).rows[0].id;
  const other = (await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`)).rows[0].id;
  off.O1 = await newOfficer("1", station);
  off.O2 = await newOfficer("2", station);
  off.O3 = await newOfficer("3", station);
  off.OTHER = await newOfficer("X", other);
  deskUserId = (await pool.query(`SELECT id FROM "User" WHERE username='desk.post1'`)).rows[0].id;
  await pool.query(`UPDATE "Officer" SET "userId"=$1 WHERE id=$2`, [deskUserId, off.O3]); // O3 is "desk.post1" for the self-service test
});

after(async () => {
  const ids = Object.values(off);
  await pool.query(`UPDATE "Officer" SET "userId"=NULL WHERE id=$1`, [off.O3]);
  await pool.query(`UPDATE "OfficerAssignment" SET "endDate"=now() WHERE "officerId" = ANY($1) AND "endDate" IS NULL`, [ids]);
  await pool.query(`UPDATE "Officer" SET "isActive"=false, "dutyStatus"='RETIRED', "administrativeStatus"='RETIRED' WHERE id = ANY($1)`, [ids]);
  await pool.query(`UPDATE "Station" SET status='INACTIVE', "isActive"=false WHERE id=$1`, [station]);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='hr-attendance-test' AND "keyPrefix"=$1`, [`at${RUN}`]);
  await pool.end();
});

test("roll-call: permission, scope and consistency", async () => {
  const entries = [
    { officerId: off.O1, status: "PRESENT" },
    { officerId: off.O2, status: "LATE", lateMinutes: 15, note: "Embouteillage" },
  ];
  assert.equal((await call("desk.post1", "/api/v1/hr/attendance", "PUT", { stationId: station, date: today(), entries })).res.status, 403);
  assert.equal((await call("chief.cs1", "/api/v1/hr/attendance", "PUT", { stationId: station, date: today(), entries })).res.status, 404, "a commander cannot record another structure's roll-call");
  assert.ok(is4xx(await call("hr.service", "/api/v1/hr/attendance", "PUT", { stationId: station, date: today(), entries: [{ officerId: off.O2, status: "LATE" }] })), "lateness needs minutes");
  assert.ok(is4xx(await call("hr.service", "/api/v1/hr/attendance", "PUT", { stationId: station, date: inDays(1), entries })), "no roll-call for a future day");
  assert.ok(is4xx(await call("hr.service", "/api/v1/hr/attendance", "PUT", { stationId: station, date: today(), entries: [{ officerId: off.OTHER, status: "PRESENT" }] })), "officer of another structure refused");
  const ok = await call("hr.service", "/api/v1/hr/attendance", "PUT", { stationId: station, date: today(), entries });
  assert.equal(ok.res.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.data.recorded, 2);
  // a second roll-call the same day replaces the first one
  await call("hr.service", "/api/v1/hr/attendance", "PUT", { stationId: station, date: today(), entries: [{ officerId: off.O2, status: "ABSENT" }] });
  const sheet = await call("hr.director", `/api/v1/hr/attendance?stationId=${station}&date=${today()}`);
  const rec = Object.fromEntries((sheet.json.data.officers as any[]).map((o) => [o.id, o.record?.status]));
  assert.equal(rec[off.O1], "PRESENT");
  assert.equal(rec[off.O2], "ABSENT");
  assert.equal(rec[off.O3], undefined);
  assert.equal((await call("chief.cs1", `/api/v1/hr/attendance?stationId=${station}&date=${today()}`)).res.status, 404, "structure outside the scope");
});

test("leave: validation rules, balance and overlap", async () => {
  const mk = (over: Record<string, unknown>) => call("hr.service", "/api/v1/hr/leaves", "POST", { officerId: off.O1, type: "ANNUAL", startDate: inDays(10), endDate: inDays(14), ...over });
  assert.ok(is4xx(await mk({ endDate: inDays(5) })), "end before start");
  assert.ok(is4xx(await mk({ type: "PERMISSION", reason: "Affaire familiale" })), "a permission is limited to 3 days");
  assert.ok(is4xx(await mk({ type: "EXCEPTIONAL" })), "reason required for an exceptional leave");
  assert.equal((await call("desk.post1", "/api/v1/hr/leaves", "POST", { officerId: off.O1, type: "ANNUAL", startDate: inDays(10), endDate: inDays(14) })).res.status, 403, "no filing for others without hr:leave_request");
  const first = await mk({});
  assert.equal(first.res.status, 201, JSON.stringify(first.json));
  assert.match(first.json.data.number, /^CNG-\d{4}-\d{5}$/);
  assert.equal(first.json.data.days, 5);
  assert.equal((await mk({ startDate: inDays(12), endDate: inDays(20) })).res.status, 409, "overlap");
  const big = await mk({ startDate: inDays(30), endDate: inDays(58) }); // 29 days + 5 > 30
  assert.ok(is4xx(big), "annual balance exceeded");
  const bal = await call("hr.service", `/api/v1/hr/leaves/balance?officerId=${off.O1}`);
  assert.equal(bal.json.data.entitlement, 30);
  assert.ok(bal.json.data.used >= 5);
});

test("leave approval: authority, four-eyes, attendance generation, lock and cancellation", async () => {
  const id = (await pool.query(`SELECT id FROM "LeaveRequest" WHERE "officerId"=$1 AND status='REQUESTED' AND type='ANNUAL'`, [off.O1])).rows[0].id;
  assert.equal((await call("hr.service", `/api/v1/hr/leaves/${id}/decide`, "POST", { decision: "APPROVE" })).res.status, 403, "HR service cannot approve");
  assert.ok(is4xx(await call("hr.director", `/api/v1/hr/leaves/${id}/decide`, "POST", { decision: "REJECT" })), "reason required to reject");
  const ok = await call("hr.director", `/api/v1/hr/leaves/${id}/decide`, "POST", { decision: "APPROVE", note: "Accordé" });
  assert.equal(ok.res.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.data.status, "APPROVED");
  const gen = await pool.query(`SELECT status FROM "AttendanceRecord" WHERE "leaveId"=$1`, [id]);
  assert.equal(gen.rowCount, 5);
  assert.ok(gen.rows.every((r) => r.status === "ON_LEAVE"));
  assert.ok(is4xx(await call("hr.director", `/api/v1/hr/leaves/${id}/decide`, "POST", { decision: "APPROVE" })), "already decided");

  // a leave covering today locks the roll-call of that officer
  const p = await call("hr.service", "/api/v1/hr/leaves", "POST", { officerId: off.O1, type: "PERMISSION", startDate: today(), endDate: today(), reason: "Cérémonie familiale" });
  assert.equal(p.res.status, 201, JSON.stringify(p.json));
  await call("hr.director", `/api/v1/hr/leaves/${p.json.data.id}/decide`, "POST", { decision: "APPROVE" });
  const rc = await call("hr.service", "/api/v1/hr/attendance", "PUT", { stationId: station, date: today(), entries: [{ officerId: off.O1, status: "PRESENT" }] });
  assert.deepEqual(rc.json.data.locked, [off.O1]);
  assert.equal((await pool.query(`SELECT status FROM "AttendanceRecord" WHERE "officerId"=$1 AND date=current_date`, [off.O1])).rows[0].status, "PERMISSION", "leave status kept");

  // four-eyes: the person who filed a request cannot decide it
  const own = await call("hr.director", "/api/v1/hr/leaves", "POST", { officerId: off.O2, type: "UNAVAILABILITY", startDate: inDays(3), endDate: inDays(4) });
  assert.equal(own.res.status, 201);
  assert.ok(is4xx(await call("hr.director", `/api/v1/hr/leaves/${own.json.data.id}/decide`, "POST", { decision: "APPROVE" })), "cannot decide own filing");
  assert.equal((await call("commander.central", `/api/v1/hr/leaves/${own.json.data.id}/decide`, "POST", { decision: "APPROVE" })).json.data.status, "APPROVED", "regional authority approves inside its province");

  // cancellation of an approved future leave removes its generated days and restores the balance
  const before = (await call("hr.service", `/api/v1/hr/leaves/balance?officerId=${off.O1}`)).json.data.used;
  const c = await call("hr.service", `/api/v1/hr/leaves/${id}/cancel`, "POST", { reason: "Changement de planning" });
  assert.equal(c.res.status, 200, JSON.stringify(c.json));
  assert.equal(c.json.data.status, "CANCELLED");
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "AttendanceRecord" WHERE "leaveId"=$1`, [id])).rows[0].n, 0);
  assert.equal((await call("hr.service", `/api/v1/hr/leaves/balance?officerId=${off.O1}`)).json.data.used, before - 5);
});

test("self-service: an officer files and cancels own request, cannot file for others, cannot decide", async () => {
  const mine = await call("desk.post1", "/api/v1/hr/leaves", "POST", { type: "ANNUAL", startDate: inDays(40), endDate: inDays(42) });
  assert.equal(mine.res.status, 201, JSON.stringify(mine.json));
  assert.equal(mine.json.data.officerId, off.O3);
  assert.equal((await call("desk.post1", "/api/v1/hr/leaves", "POST", { officerId: off.O1, type: "ANNUAL", startDate: inDays(60), endDate: inDays(61) })).res.status, 403);
  assert.equal((await call("desk.post1", `/api/v1/hr/leaves/${mine.json.data.id}/decide`, "POST", { decision: "APPROVE" })).res.status, 403);
  const c = await call("desk.post1", `/api/v1/hr/leaves/${mine.json.data.id}/cancel`, "POST", { reason: "Plus nécessaire" });
  assert.equal(c.json.data.status, "CANCELLED");
});

test("statistics: counts and rates inside the scope", async () => {
  const s = await call("hr.director", `/api/v1/hr/attendance/stats?from=${inDays(-1)}&to=${today()}&stationId=${station}`);
  assert.equal(s.res.status, 200, JSON.stringify(s.json));
  const d = s.json.data;
  assert.ok(d.counts.ABSENT >= 1 && d.counts.PERMISSION >= 1);
  assert.ok(d.lateMinutes === 0 || d.lateMinutes >= 15);
  assert.ok(d.presenceRate >= 0 && d.presenceRate <= 1);
  assert.ok(d.stations.some((x: any) => x.id === station));
  const mine = await call("chief.cs1", `/api/v1/hr/attendance/stats?from=${inDays(-1)}&to=${today()}`);
  assert.equal(mine.res.status, 200);
  assert.ok(!mine.json.data.stations.some((x: any) => x.id === station), "a commander never sees another structure's statistics");
  assert.ok(is4xx(await call("hr.director", `/api/v1/hr/attendance/stats?from=${today()}&to=${inDays(-5)}`)), "inverted period refused");
});

test("training: evaluation is final, grants competences only on success; certificate only after success", async () => {
  const mkTraining = async (title: string, kind = "SPECIALIZED") => (await pool.query(`INSERT INTO "Training"(id,"officerId",title,kind,"startDate",status,"updatedAt") VALUES ($1,$2,$3,$4::"TrainingKind",now() - interval '10 days','IN_PROGRESS',now()) RETURNING id`, [`tr_${RUN}_${title.length}_${Math.random().toString(36).slice(2, 6)}`, off.O1, title, kind])).rows[0].id as string;
  const ok = await mkTraining("Police judiciaire — module test");
  const ko = await mkTraining("Maintien de l'ordre — module test", "CONTINUING");
  const skill = (await pool.query(`SELECT id FROM "Skill" WHERE code='PJ'`)).rows[0].id;
  assert.equal((await call("desk.post1", `/api/v1/hr/trainings/${ok}/evaluate`, "POST", { passed: true })).res.status, 403);
  assert.ok(is4xx(await call("hr.service", `/api/v1/hr/trainings/${ok}/evaluate`, "POST", { passed: true, score: 25 })), "score out of 0..20");
  assert.equal((await call("hr.service", `/api/v1/hr/trainings/${ok}/certificate`)).res.status, 409, "no certificate before evaluation");
  const ev = await call("hr.service", `/api/v1/hr/trainings/${ok}/evaluate`, "POST", { passed: true, score: 15.5, result: "Admis", skills: [{ skillId: skill, level: 3, validMonths: 36 }] });
  assert.equal(ev.res.status, 200, JSON.stringify(ev.json));
  assert.equal(ev.json.data.status, "COMPLETED");
  assert.ok(is4xx(await call("hr.service", `/api/v1/hr/trainings/${ok}/evaluate`, "POST", { passed: false })), "evaluation is final");
  const held = await call("hr.service", `/api/v1/hr/dossiers/${off.O1}/competences`);
  const sk = (held.json.data.skills as any[]).find((s) => s.skill.code === "PJ");
  assert.equal(sk.level, 3);
  assert.ok(sk.expiresAt);
  // failure: no competence, no certificate
  const bad = await call("hr.service", `/api/v1/hr/trainings/${ko}/evaluate`, "POST", { passed: false, score: 7, skills: [{ skillId: skill, level: 5 }] });
  assert.equal(bad.json.data.status, "FAILED");
  assert.equal((await call("hr.service", `/api/v1/hr/dossiers/${off.O1}/competences`)).json.data.skills.find((s: any) => s.skill.code === "PJ").level, 3, "failed training grants nothing");
  assert.ok(is4xx(await call("hr.service", `/api/v1/hr/trainings/${ko}/certificate`, "POST")), "no certificate for a failed training");
  // certificate
  const iss = await call("hr.service", `/api/v1/hr/trainings/${ok}/certificate`, "POST");
  assert.equal(iss.res.status, 201, JSON.stringify(iss.json));
  assert.match(iss.json.data.certificateNo, /^ATT-\d{4}-\d{5}$/);
  assert.ok(is4xx(await call("hr.service", `/api/v1/hr/trainings/${ok}/certificate`, "POST")), "issued once");
  const pdf = await call("hr.director", `/api/v1/hr/trainings/${ok}/certificate`);
  assert.equal(pdf.res.status, 200);
  assert.match(pdf.ct, /application\/pdf/);
  assert.equal((await call("chief.cs1", `/api/v1/hr/trainings/${ok}/certificate`)).res.status, 404, "out of scope");
  const list = await call("hr.director", `/api/v1/hr/trainings?kind=SPECIALIZED&q=ATT`);
  assert.ok((list.json.data as any[]).some((t) => t.id === ok));
});

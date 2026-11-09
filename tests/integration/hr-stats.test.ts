/**
 * HR phase 8: statistics and dashboard figures (scope, filters, period, forecasts, export).
 * Live dev server + seeded database (npm run db:seed).
 *   npx tsx --test tests/integration/hr-stats.test.ts
 * The controlled figures use a dedicated test structure, so the filter isolates them from the demonstration data.
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
let station = "";
let region = "";
let rankGP = "";
const off: Record<"A" | "B", string> = { A: "", B: "" };
let originalSettings: Record<string, unknown> = {};

async function keyFor(username: string) {
  const key = `pms_st${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing — run npm run db:seed`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'hr-stats-test',$3,$4)`, [`apikey_st_${username}_${RUN}`, u.rows[0].id, `st${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function raw(who: string, path: string, method = "GET", body?: unknown) {
  return fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${keys[who]}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
}
async function call(who: string, path: string, method = "GET", body?: unknown) {
  const res = await raw(who, path, method, body);
  const json = (await res.json().catch(() => ({}))) as { data?: any; error?: { code: string; message: string } };
  return { res, json };
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const inDays = (n: number) => iso(new Date(Date.now() + n * 86_400_000));
const is4xx = (r: { res: Response }) => r.res.status >= 400 && r.res.status < 500;
const sum = (rows: { n: number }[]) => rows.reduce((a, r) => a + r.n, 0);
const stats = async (who: string, q = "") => (await call(who, `/api/v1/hr/stats${q ? `?${q}` : ""}`)).json.data;
async function newOfficer(tag: string) {
  const r = await call("police.admin", "/api/v1/officers", "POST", { badgeNumber: `STA${tag}${RUN}`.toUpperCase(), firstName: "Test", lastName: `STA${tag}${RUN}`, gender: tag === "A" ? "MALE" : "FEMALE", rankId: rankGP, stationId: station, hiredAt: tag === "A" ? "2012-01-01" : inDays(-90) });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  return r.json.data.id as string;
}

before(async () => {
  for (const u of ["police.admin", "admin", "hr.director", "chief.cs1", "desk.post1"]) keys[u] = await keyFor(u);
  region = (await pool.query(`SELECT "regionId" FROM "Station" WHERE code='CS-01'`)).rows[0].regionId;
  rankGP = (await pool.query(`SELECT id FROM "Rank" WHERE code='GP'`)).rows[0].id;
  station = (await pool.query(`INSERT INTO "Station"(id,"regionId",code,name,type,status,"isActive","isDemo","updatedAt") VALUES ($1,$2,$3,'Structure de test statistiques','STATION','ACTIVE',true,true,now()) RETURNING id`, [`st_stat_${RUN}`, region, `STA${RUN}`.toUpperCase()])).rows[0].id;
  off.A = await newOfficer("A");
  off.B = await newOfficer("B");
  originalSettings = (await call("police.admin", "/api/v1/hr/stats/settings")).json.data;
  // controlled data (SQL: the API would otherwise date everything "now")
  const dob = new Date();
  dob.setUTCFullYear(dob.getUTCFullYear() - 60);
  dob.setUTCMonth(dob.getUTCMonth() + 6); // turns 60 in about six months
  await pool.query(`UPDATE "Officer" SET "dateOfBirth"=$2, "currentPostSince"=now() - interval '3 months' WHERE id=$1`, [off.A, iso(dob)]);
  await pool.query(`UPDATE "Officer" SET "currentPostSince"=now() - interval '14 months' WHERE id=$1`, [off.B]);
  await pool.query(`INSERT INTO "AttendanceRecord"(id,"officerId","stationId",date,status,"updatedAt") VALUES ($1,$2,$3,current_date,'ABSENT',now()),($4,$5,$3,current_date,'PRESENT',now())`, [`att_a_${RUN}`, off.A, station, `att_b_${RUN}`, off.B]);
  await pool.query(`INSERT INTO "AttendanceRecord"(id,"officerId","stationId",date,status,"lateMinutes","updatedAt") VALUES ($1,$2,$3,current_date - 1,'LATE',10,now())`, [`att_c_${RUN}`, off.B, station]);
  await pool.query(`INSERT INTO "CareerEvent"(id,"officerId",type,"effectiveDate",reference,"createdAt") VALUES ($1,$2,'PROMOTION',now(),'TEST-STATS',now())`, [`ce_st_${RUN}`, off.B]);
  await pool.query(`INSERT INTO "Training"(id,"officerId",title,kind,"startDate",status,passed,"evaluatedAt","updatedAt") VALUES ($1,$2,'Formation test stats','SPECIALIZED'::"TrainingKind",now() - interval '5 days','COMPLETED',true,now(),now())`, [`tr_st_${RUN}`, off.A]);
});

after(async () => {
  await call("admin", "/api/v1/hr/stats/settings", "PUT", originalSettings);
  const ids = Object.values(off);
  await pool.query(`UPDATE "OfficerAssignment" SET "endDate"=now() WHERE "officerId" = ANY($1) AND "endDate" IS NULL`, [ids]);
  await pool.query(`UPDATE "Officer" SET "isActive"=false, "dutyStatus"='RETIRED', "administrativeStatus"='RETIRED' WHERE id = ANY($1)`, [ids]);
  await pool.query(`UPDATE "Station" SET status='INACTIVE', "isActive"=false WHERE id=$1`, [station]);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='hr-stats-test' AND "keyPrefix"=$1`, [`st${RUN}`]);
  await pool.end();
});

test("permission and period validation", async () => {
  assert.equal((await call("desk.post1", "/api/v1/hr/stats")).res.status, 403);
  assert.ok(is4xx(await call("hr.director", `/api/v1/hr/stats?from=${inDays(-1)}&to=${inDays(-30)}`)), "inverted period");
  assert.ok(is4xx(await call("hr.director", `/api/v1/hr/stats?from=${inDays(-900)}&to=${inDays(0)}`)), "more than two years");
});

test("figures are consistent with the database and every breakdown adds up", async () => {
  const s = await stats("hr.director");
  const live = (await pool.query(`SELECT count(*)::int n FROM "Officer" WHERE "isActive" AND "deletedAt" IS NULL`)).rows[0].n;
  assert.equal(s.workforce.total, live, "total = active records");
  assert.equal(sum(s.workforce.byStatus), live);
  assert.equal(sum(s.workforce.byRank), live);
  assert.equal(sum(s.workforce.byRegion), live);
  assert.equal(sum(s.workforce.byGender), live);
  const activeNow = (await pool.query(`SELECT count(*)::int n FROM "Officer" WHERE "isActive" AND "deletedAt" IS NULL AND "administrativeStatus"='ACTIVE'`)).rows[0].n;
  assert.equal(sum(s.assignments.tenure) + s.assignments.noTenure, activeNow, "tenure buckets cover every active officer");
  assert.equal(s.retirement.byYear.length, 6);
  assert.equal(s.period.from < s.period.to, true);
});

test("a commander only gets figures from own structures", async () => {
  const nat = await stats("hr.director");
  const mine = await stats("chief.cs1");
  assert.ok(mine.workforce.total > 0 && mine.workforce.total < nat.workforce.total);
  const own = (await pool.query(`SELECT count(*)::int n FROM "Officer" o JOIN "Station" s ON s.id=o."stationId" WHERE o."isActive" AND o."deletedAt" IS NULL AND (s.code='CS-01' OR s."parentId"=(SELECT id FROM "Station" WHERE code='CS-01'))`)).rows[0].n;
  assert.equal(mine.workforce.total, own);
  assert.ok(!mine.workforce.byStation.some((x: any) => x.id === station), "never another structure");
});

test("filters (délégation, structure, grade) narrow stock and flow figures; the structure filter isolates the controlled data", async () => {
  const nat = await stats("hr.director");
  const byRegion = await stats("hr.director", `regionId=${region}`);
  assert.ok(byRegion.workforce.total < nat.workforce.total && byRegion.workforce.total > 0);
  assert.equal(sum(byRegion.workforce.byRegion), byRegion.workforce.total);
  const t = await stats("hr.director", `stationId=${station}&from=${inDays(-60)}&to=${inDays(0)}`);
  assert.equal(t.workforce.total, 2);
  assert.deepEqual(Object.fromEntries(t.workforce.byGender.map((g: any) => [g.key, g.n])), { MALE: 1, FEMALE: 1 });
  assert.equal(t.movements.promotions, 1, "promotion in the period");
  assert.equal(sum(t.movements.promotionsMonthly.map((m: any) => ({ n: m.value }))), 1);
  const abs = Object.fromEntries(t.attendance.byStatus.map((g: any) => [g.key, g.n]));
  assert.deepEqual(abs, { ABSENT: 1, PRESENT: 1, LATE: 1 });
  assert.equal(t.attendance.presenceRate, 2 / 3);
  assert.equal(t.attendance.absenceRate, 1 / 3);
  assert.equal(sum(t.attendance.monthly.map((m: any) => ({ n: m.absent }))), 1);
  assert.equal(sum(t.attendance.monthly.map((m: any) => ({ n: m.late }))), 1);
  assert.equal(t.training.passed, 1);
  assert.equal(t.training.passRate, 1);
  assert.deepEqual(t.training.byKind, [{ key: "SPECIALIZED", n: 1 }]);
  const tenure = Object.fromEntries(t.assignments.tenure.map((g: any) => [g.key, g.n]));
  assert.deepEqual(tenure, { lt6: 1, "6to12": 0, "12to24": 1, gt24: 0 });
  const none = await stats("hr.director", `stationId=${station}&rankId=${(await pool.query(`SELECT id FROM "Rank" WHERE code='CDIV'`)).rows[0].id}`);
  assert.equal(none.workforce.total, 0, "grade filter");
});

test("forecasts: retirement by age setting and promotion eligibility by seniority", async () => {
  const q = `stationId=${station}`;
  const s60 = await stats("hr.director", q);
  assert.equal(s60.retirement.age, 60);
  assert.equal(s60.retirement.next12Months, 1, "officer A turns 60 within a year");
  assert.equal(s60.promotionsPending.eligible, 1, "only A has the seniority (B was hired recently)");
  assert.equal(s60.promotionsPending.byRank[0].n, 1);
  // a manual promotion resets A's seniority; and the age setting moves the forecast
  assert.equal((await call("hr.director", "/api/v1/hr/stats/settings", "PUT", { retirementAge: 55, promotionMinYears: 3 })).res.status, 403, "settings need system:settings");
  assert.equal((await call("admin", "/api/v1/hr/stats/settings", "PUT", { retirementAge: 55, promotionMinYears: 15 })).res.status, 200);
  const s55 = await stats("hr.director", q);
  assert.equal(s55.retirement.age, 55);
  assert.equal(s55.retirement.next12Months, 0, "age 60 officer is past a 55 threshold");
  assert.equal(s55.retirement.overdue, 1);
  assert.equal(s55.promotionsPending.eligible, 0, "15 years of seniority required (A has about 14)");
  assert.ok(is4xx(await call("admin", "/api/v1/hr/stats/settings", "PUT", { retirementAge: 30, promotionMinYears: 3 })), "implausible retirement age refused");
  await call("admin", "/api/v1/hr/stats/settings", "PUT", originalSettings);
});

test("CSV export: same figures, audited, safe for spreadsheets", async () => {
  const res = await raw("hr.director", `/api/v1/hr/stats/export?stationId=${station}`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/csv/);
  const text = await res.text();
  assert.ok(text.includes("section,item,value"));
  assert.ok(text.includes("workforce,total,2"));
  assert.ok(text.includes("promotions_pending,eligible,"));
  assert.equal((await raw("desk.post1", "/api/v1/hr/stats/export")).status, 403);
  assert.ok((await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='HR_STATS_EXPORTED'`)).rows[0].n >= 1, "export is audited");
});

/**
 * HR phase 9: security and integrity of the whole HR surface.
 *   npx tsx --test tests/integration/hr-security.test.ts
 * - unauthenticated and unprivileged callers get nothing from any HR route;
 * - a station commander cannot reach any privileged write;
 * - sensitive fields never leave the API; uploaded names cannot escape the storage directory;
 * - the write rate limit holds; integrity checks detect and report anomalies;
 * - an officer who leaves the service has their open transfers cancelled.
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
let station = "";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

async function keyFor(username: string) {
  const key = `pms_sc${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing — run npm run db:seed`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'hr-security-test',$3,$4)`, [`apikey_sc_${username}_${RUN}`, u.rows[0].id, `sc${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function raw(who: string | null, path: string, method = "GET", body?: unknown) {
  const isForm = body instanceof FormData;
  return fetch(`${BASE}${path}`, { method, headers: { ...(who ? { authorization: `Bearer ${keys[who]}` } : {}), ...(body && !isForm ? { "content-type": "application/json" } : {}) }, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
}
async function call(who: string | null, path: string, method = "GET", body?: unknown) {
  const res = await raw(who, path, method, body);
  const json = ((await res.json().catch(() => ({}))) as { data?: any; error?: { code: string; message: string } });
  return { res, json };
}
const today = () => new Date().toISOString().slice(0, 10);
const ID = "cmdoesnotexist000000000000";

/** Every HR route with a plausible request. `selfService` routes validate/scope inside the service (4xx as well). */
const ROUTES: { method: string; path: string; body?: () => unknown }[] = [
  { method: "GET", path: "/api/v1/hr/dossiers" },
  { method: "GET", path: `/api/v1/hr/dossiers/${ID}` },
  { method: "PUT", path: `/api/v1/hr/dossiers/${ID}`, body: () => ({ firstName: "A", lastName: "B" }) },
  { method: "GET", path: `/api/v1/hr/dossiers/${ID}/competences` },
  { method: "GET", path: `/api/v1/hr/dossiers/${ID}/photo` },
  { method: "POST", path: "/api/v1/hr/career-events", body: () => ({ officerId: ID, type: "PROMOTION", effectiveDate: today(), reference: "X-1" }) },
  { method: "GET", path: "/api/v1/hr/transfers" },
  { method: "GET", path: `/api/v1/hr/transfers/${ID}` },
  { method: "POST", path: "/api/v1/hr/transfers", body: () => ({ officerId: ID, toStationId: ID, effectiveDate: today(), reason: "reason" }) },
  { method: "POST", path: `/api/v1/hr/transfers/${ID}/review`, body: () => ({ decision: "APPROVE" }) },
  { method: "POST", path: `/api/v1/hr/transfers/${ID}/validate`, body: () => ({ decision: "APPROVE" }) },
  { method: "POST", path: `/api/v1/hr/transfers/${ID}/execute` },
  { method: "POST", path: `/api/v1/hr/transfers/${ID}/cancel`, body: () => ({ reason: "no longer needed" }) },
  { method: "GET", path: `/api/v1/hr/transfers/${ID}/decision` },
  { method: "GET", path: "/api/v1/hr/rotation" },
  { method: "GET", path: "/api/v1/hr/rotation/settings" },
  { method: "PUT", path: "/api/v1/hr/rotation/settings", body: () => ({ enabled: true }) },
  { method: "POST", path: "/api/v1/hr/rotation/run" },
  { method: "POST", path: "/api/v1/hr/rotation/exceptions", body: () => ({ officerId: ID, reason: "reason text" }) },
  { method: "POST", path: `/api/v1/hr/rotation/exceptions/${ID}/end` },
  { method: "GET", path: `/api/v1/hr/attendance?stationId=${ID}` },
  { method: "PUT", path: "/api/v1/hr/attendance", body: () => ({ stationId: ID, date: today(), entries: [{ officerId: ID, status: "PRESENT" }] }) },
  { method: "GET", path: "/api/v1/hr/attendance/stats" },
  { method: "GET", path: "/api/v1/hr/leaves" },
  { method: "POST", path: "/api/v1/hr/leaves", body: () => ({ officerId: ID, type: "ANNUAL", startDate: today(), endDate: today() }) },
  { method: "GET", path: `/api/v1/hr/leaves/balance?officerId=${ID}` },
  { method: "GET", path: "/api/v1/hr/leaves/settings" },
  { method: "PUT", path: "/api/v1/hr/leaves/settings", body: () => ({ annualDays: 30 }) },
  { method: "POST", path: `/api/v1/hr/leaves/${ID}/decide`, body: () => ({ decision: "APPROVE" }) },
  { method: "POST", path: `/api/v1/hr/leaves/${ID}/cancel`, body: () => ({ reason: "no longer needed" }) },
  { method: "GET", path: "/api/v1/hr/trainings" },
  { method: "POST", path: `/api/v1/hr/trainings/${ID}/evaluate`, body: () => ({ passed: true }) },
  { method: "GET", path: `/api/v1/hr/trainings/${ID}/certificate` },
  { method: "POST", path: `/api/v1/hr/trainings/${ID}/certificate` },
  { method: "GET", path: "/api/v1/hr/skills" },
  { method: "POST", path: "/api/v1/hr/skills", body: () => ({ code: "ZZ", name: "Test" }) },
  { method: "GET", path: "/api/v1/hr/discipline" },
  { method: "GET", path: `/api/v1/hr/discipline/${ID}` },
  { method: "POST", path: "/api/v1/hr/discipline", body: () => ({ officerId: ID, facts: "Faits reprochés détaillés.", factsDate: today() }) },
  { method: "POST", path: `/api/v1/hr/discipline/${ID}/step`, body: () => ({ kind: "NOTE", date: today(), note: "note" }) },
  { method: "POST", path: `/api/v1/hr/discipline/${ID}/decide`, body: () => ({ sanction: "WARNING", reason: "A reasoned decision." }) },
  { method: "GET", path: `/api/v1/hr/distinctions?officerId=${ID}` },
  { method: "POST", path: "/api/v1/hr/distinctions", body: () => ({ officerId: ID, kind: "MEDAL", title: "Medal", awardedAt: today() }) },
  { method: "GET", path: "/api/v1/hr/documents" },
  { method: "POST", path: "/api/v1/hr/documents", body: () => ({ kind: "WORK_CERTIFICATE", officerId: ID }) },
  { method: "GET", path: `/api/v1/hr/documents/${ID}` },
  { method: "GET", path: `/api/v1/hr/documents/${ID}/file` },
  { method: "GET", path: "/api/v1/hr/stats" },
  { method: "GET", path: "/api/v1/hr/stats/export" },
  { method: "GET", path: "/api/v1/hr/stats/settings" },
  { method: "PUT", path: "/api/v1/hr/stats/settings", body: () => ({ retirementAge: 60, promotionMinYears: 3 }) },
  { method: "GET", path: "/api/v1/hr/integrity" },
  // payroll (strictly separated: the dedicated payroll roles only)
  { method: "GET", path: "/api/v1/hr/pay" },
  { method: "GET", path: "/api/v1/hr/pay/settings" },
  { method: "PUT", path: "/api/v1/hr/pay/settings", body: () => ({ suspendedPayPercent: 50 }) },
  { method: "GET", path: "/api/v1/hr/pay/scale" },
  { method: "POST", path: "/api/v1/hr/pay/scale", body: () => ({ rankId: ID, amount: 100000, effectiveFrom: "2026-01-01" }) },
  { method: "POST", path: `/api/v1/hr/pay/scale/${ID}/decide`, body: () => ({ decision: "APPROVE" }) },
  { method: "GET", path: "/api/v1/hr/pay/components" },
  { method: "POST", path: "/api/v1/hr/pay/components", body: () => ({ code: "ZZ_TEST", name: "Test", kind: "BONUS", calculation: "FIXED", defaultValue: 1 }) },
  { method: "PUT", path: `/api/v1/hr/pay/components/${ID}`, body: () => ({ code: "ZZ_TEST", name: "Test", kind: "BONUS", calculation: "FIXED", defaultValue: 1 }) },
  { method: "GET", path: "/api/v1/hr/pay/elements" },
  { method: "POST", path: "/api/v1/hr/pay/elements", body: () => ({ officerId: ID, componentId: ID, startDate: "2026-01-01", reason: "Test reason" }) },
  { method: "POST", path: `/api/v1/hr/pay/elements/${ID}/decide`, body: () => ({ decision: "APPROVE" }) },
  { method: "POST", path: `/api/v1/hr/pay/elements/${ID}/end`, body: () => ({ reason: "Test reason" }) },
  { method: "GET", path: "/api/v1/hr/pay/runs" },
  { method: "POST", path: "/api/v1/hr/pay/runs", body: () => ({ period: "2026-01" }) },
  { method: "GET", path: `/api/v1/hr/pay/runs/${ID}` },
  { method: "GET", path: `/api/v1/hr/pay/runs/${ID}/lines` },
  { method: "POST", path: `/api/v1/hr/pay/runs/${ID}/validate` },
  { method: "GET", path: `/api/v1/hr/pay/runs/${ID}/export` },
  { method: "GET", path: `/api/v1/hr/pay/officers/${ID}` },
];

before(async () => {
  for (const u of ["admin", "hr.director", "hr.service", "chief.cs1", "desk.post1", "analyst"]) keys[u] = await keyFor(u);
  const region = (await pool.query(`SELECT "regionId" FROM "Station" WHERE code='CS-01'`)).rows[0].regionId;
  station = (await pool.query(`INSERT INTO "Station"(id,"regionId",code,name,type,status,"isActive","isDemo","updatedAt") VALUES ($1,$2,$3,'Structure de test sécurité','STATION','ACTIVE',true,true,now()) RETURNING id`, [`st_sc_${RUN}`, region, `SEC${RUN}`.toUpperCase()])).rows[0].id;
  const r = await call("admin", "/api/v1/officers", "POST", { badgeNumber: `SEC${RUN}`.toUpperCase(), firstName: "Test", lastName: `SEC${RUN}`, gender: "UNKNOWN", rankId: (await pool.query(`SELECT id FROM "Rank" WHERE code='GP'`)).rows[0].id, stationId: station, hiredAt: "2013-01-01" });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  officerId = r.json.data.id;
});

after(async () => {
  await pool.query(`UPDATE "OfficerAssignment" SET "endDate"=now() WHERE "officerId"=$1 AND "endDate" IS NULL`, [officerId]);
  await pool.query(`UPDATE "Officer" SET "isActive"=false, "dutyStatus"='RETIRED', "administrativeStatus"='RETIRED' WHERE id=$1`, [officerId]);
  await pool.query(`UPDATE "Station" SET status='INACTIVE', "isActive"=false WHERE id=$1`, [station]);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='hr-security-test' AND "keyPrefix"=$1`, [`sc${RUN}`]);
  await pool.end();
});

test(`no HR route answers without credentials (${ROUTES.length} routes)`, async () => {
  for (const r of ROUTES) {
    const res = await raw(null, r.path, r.method, r.body?.());
    assert.equal(res.status, 401, `${r.method} ${r.path} → ${res.status}`);
  }
});

test("an account without any HR permission gets nothing from any HR route", async () => {
  // desk.post1 holds no hr:* permission; self-service routes still validate/scope inside the service
  for (const r of ROUTES) {
    const res = await raw("desk.post1", r.path, r.method, r.body?.());
    assert.ok(res.status >= 400 && res.status < 500, `${r.method} ${r.path} → ${res.status}`);
    assert.ok(![200, 201, 204].includes(res.status));
  }
});

test("self-service pay: unauthenticated 401; an account without officer record sees an empty list, never anybody else's pay", async () => {
  assert.equal((await raw(null, "/api/v1/hr/pay/me")).status, 401);
  const r = await call("desk.post1", "/api/v1/hr/pay/me");
  assert.equal(r.res.status, 200);
  assert.deepEqual(r.json.data, []);
});

test("a station commander cannot reach any privileged HR write", async () => {
  const forbidden: [string, string, unknown?][] = [
    ["PUT", `/api/v1/hr/dossiers/${officerId}`, { firstName: "X", lastName: "Y" }],
    ["POST", "/api/v1/hr/career-events", { officerId, type: "PROMOTION", effectiveDate: today(), reference: "X-1" }],
    ["PUT", "/api/v1/hr/rotation/settings", { enabled: true }],
    ["POST", "/api/v1/hr/rotation/run"],
    ["POST", "/api/v1/hr/rotation/exceptions", { officerId, reason: "reason text" }],
    ["PUT", "/api/v1/hr/leaves/settings", { annualDays: 99 }],
    ["PUT", "/api/v1/hr/stats/settings", { retirementAge: 70, promotionMinYears: 1 }],
    ["POST", "/api/v1/hr/skills", { code: "ZZ", name: "Test" }],
    ["POST", "/api/v1/hr/documents", { kind: "WORK_CERTIFICATE", officerId }],
    ["POST", "/api/v1/hr/distinctions", { officerId, kind: "MEDAL", title: "Medal", awardedAt: today() }],
    ["GET", "/api/v1/hr/discipline"],
    ["GET", "/api/v1/hr/integrity"],
    ["GET", "/api/v1/hr/pay"],
    ["POST", "/api/v1/hr/pay/runs", { period: "2026-01" }],
    ["POST", "/api/v1/hr/pay/scale", { rankId: officerId, amount: 100000, effectiveFrom: "2026-01-01" }],
    ["GET", "/api/v1/hr/pay/runs/x/export"],
  ];
  for (const [m, p, b] of forbidden) assert.equal((await call("chief.cs1", p, m, b)).res.status, 403, `${m} ${p}`);
  // and the settings were not changed behind the 403
  assert.notEqual((await call("hr.director", "/api/v1/hr/leaves/settings")).json.data.annualDays, 99);
});

test("sensitive fields never leave the API", async () => {
  const forbiddenKey = /password|secret|token|keyhash|mfa|recovery/i;
  const scan = (v: unknown, path: string[] = []): string[] => {
    if (Array.isArray(v)) return v.flatMap((x, i) => scan(x, [...path, String(i)]));
    if (v && typeof v === "object") return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => (forbiddenKey.test(k) ? [[...path, k].join(".")] : scan(x, [...path, k])));
    return [];
  };
  for (const p of [`/api/v1/hr/dossiers/${officerId}`, "/api/v1/hr/dossiers?pageSize=5", "/api/v1/hr/transfers?pageSize=5", "/api/v1/hr/leaves?pageSize=5", "/api/v1/hr/documents?pageSize=5", "/api/v1/hr/trainings?pageSize=5", "/api/v1/hr/stats"]) {
    const r = await call("hr.director", p);
    assert.equal(r.res.status, 200, p);
    assert.deepEqual(scan(r.json), [], `${p} leaks sensitive keys`);
  }
  const docs = await call("hr.director", "/api/v1/hr/documents?pageSize=5");
  assert.ok(!(docs.json.data as any[]).some((d) => "snapshot" in d), "the frozen content is not listed");
});

test("uploads: a hostile file name cannot escape the storage directory; the type comes from the content", async () => {
  const f = new FormData();
  f.set("file", new Blob([PNG]), "../../../../etc/passwd.png");
  f.set("kind", "ADMIN_FILE");
  f.set("title", "Fichier au nom hostile");
  f.set("officerId", officerId);
  const r = await call("hr.service", "/api/v1/hr/documents/upload", "POST", f);
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  const row = (await pool.query(`SELECT "storagePath", "mimeType" FROM "HrDocument" WHERE id=$1`, [r.json.data.id])).rows[0];
  assert.ok(!row.storagePath.includes("..") && !row.storagePath.startsWith("/"), `stored at ${row.storagePath}`);
  assert.equal(row.mimeType, "image/png");
  const html = new FormData();
  html.set("file", new Blob(["<script>alert(1)</script>"], { type: "image/png" }), "x.png");
  html.set("kind", "ADMIN_FILE");
  html.set("title", "HTML déguisé en image");
  html.set("officerId", officerId);
  const bad = await call("hr.service", "/api/v1/hr/documents/upload", "POST", html);
  assert.ok(bad.res.status >= 400 && bad.res.status < 500, "HTML declared as PNG is refused");
  const dl = await raw("hr.director", `/api/v1/hr/documents/${r.json.data.id}/file`);
  assert.equal(dl.headers.get("x-content-type-options"), "nosniff");
  assert.equal(dl.headers.get("cache-control"), "private, no-store");
});

test("the write rate limit holds for an account hammering an HR write route", async () => {
  let limited = 0;
  for (let i = 0; i < 90; i++) {
    const res = await raw("analyst", "/api/v1/hr/career-events", "POST", { officerId, type: "PROMOTION", effectiveDate: today(), reference: "X-1" });
    if (res.status === 429) {
      limited++;
      assert.ok(res.headers.get("retry-after"), "Retry-After header");
    }
  }
  assert.ok(limited > 0, "429 expected after the quota (60 writes / minute)");
});

test("a new dossier gets the HR defaults (post tenure, corps, recruitment event): it is never invisible to the rotation or the statistics", async () => {
  const o = (await pool.query(`SELECT "currentPostSince", "corpsId", "serviceStartDate" FROM "Officer" WHERE id=$1`, [officerId])).rows[0];
  assert.ok(o.currentPostSince, "currentPostSince");
  assert.ok(o.corpsId, "corps");
  assert.ok(o.serviceStartDate, "serviceStartDate");
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "CareerEvent" WHERE "officerId"=$1 AND type='RECRUITMENT'`, [officerId])).rows[0].n, 1);
});

test("an officer who leaves the service has their open transfers cancelled", async () => {
  const p = await call("admin", "/api/v1/hr/transfers", "POST", { officerId, toStationId: (await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`)).rows[0].id, effectiveDate: today(), reason: "Mutation avant départ" });
  assert.equal(p.res.status, 201, JSON.stringify(p.json));
  const ret = await call("hr.director", "/api/v1/hr/career-events", "POST", { officerId, type: "RETIREMENT", effectiveDate: today(), reference: `ARR-${RUN}-R` });
  assert.equal(ret.res.status, 201, JSON.stringify(ret.json));
  const t = (await pool.query(`SELECT status, "closeReason" FROM "TransferRequest" WHERE id=$1`, [p.json.data.id])).rows[0];
  assert.equal(t.status, "CANCELLED");
  assert.match(t.closeReason, /left the service/);
});

test("integrity checks: access is national-audit only, anomalies are detected and the sample never carries personal data", async () => {
  assert.equal((await call("chief.cs1", "/api/v1/hr/integrity")).res.status, 403);
  const base = await call("hr.director", "/api/v1/hr/integrity");
  assert.equal(base.res.status, 200, JSON.stringify(base.json));
  const count = (r: any, code: string) => r.json.data.issues.find((i: any) => i.code === code)?.count ?? 0;
  const before = count(base, "STATUS_LEFT_BUT_ACTIVE");
  const o2 = (await call("admin", "/api/v1/officers", "POST", { badgeNumber: `SCX${RUN}`.toUpperCase(), firstName: "Test", lastName: `SCX${RUN}`, gender: "UNKNOWN", rankId: (await pool.query(`SELECT id FROM "Rank" WHERE code='GP'`)).rows[0].id, stationId: station })).json.data.id;
  await pool.query(`UPDATE "Officer" SET "administrativeStatus"='RETIRED' WHERE id=$1`, [o2]); // contradictory on purpose: left the service but still flagged active
  const after = await call("hr.director", "/api/v1/hr/integrity");
  assert.equal(count(after, "STATUS_LEFT_BUT_ACTIVE"), before + 1, "the contradiction is detected");
  for (const i of after.json.data.issues) for (const s of i.sample) assert.match(s, /^[A-Za-z0-9_-]+$/, "samples are bare ids");
  await pool.query(`UPDATE "Officer" SET "isActive"=false, "dutyStatus"='RETIRED' WHERE id=$1`, [o2]);
  await pool.query(`UPDATE "OfficerAssignment" SET "endDate"=now() WHERE "officerId"=$1 AND "endDate" IS NULL`, [o2]);
  assert.equal(count(await call("hr.director", "/api/v1/hr/integrity"), "STATUS_LEFT_BUT_ACTIVE"), before, "repaired data is no longer reported");
});

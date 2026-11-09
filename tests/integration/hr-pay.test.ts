/**
 * Payroll and benefits (section 8): scale, pay elements, monthly statements, separation of duties, frozen statements,
 * export, self-service and confidentiality.
 *   npx tsx --test tests/integration/hr-pay.test.ts
 * Isolation: a dedicated test rank carries the only pay scale, so a statement contains the test officers only
 * (everybody else is reported as "without pay scale"). Statements use historical periods (>= 1990-01), the first free one.
 * Money never moves: the system only produces statements.
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
const off: Record<"P1" | "P2" | "P3", string> = { P1: "", P2: "", P3: "" };
const comp: Record<"BONUS" | "ALLOW" | "DED" | "BEN", string> = { BONUS: "", ALLOW: "", DED: "", BEN: "" };
let rankId = "";
let station = "";
let period = "";
let runId = "";
let originalSuspended = 50;

async function keyFor(username: string) {
  const key = `pms_py${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing — run npm run db:seed`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'hr-pay-test',$3,$4)`, [`apikey_py_${username}_${RUN}`, u.rows[0].id, `py${RUN}`, createHash("sha256").update(key).digest("hex")]);
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
const is4xx = (r: { res: Response }) => r.res.status >= 400 && r.res.status < 500;
const FROM = "1990-01-01";

async function newOfficer(tag: string) {
  const r = await call("police.admin", "/api/v1/officers", "POST", { badgeNumber: `PAY${tag}${RUN}`.toUpperCase(), firstName: "Test", lastName: `PAY${tag}${RUN}`, gender: "UNKNOWN", rankId, stationId: station, hiredAt: "2012-01-01" });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  return r.json.data.id as string;
}
/** A person who holds BOTH rights (not a shipped configuration) must still be unable to validate their own work: grant manage to the controller for the duration of `fn`. */
async function withManageRight<T>(fn: () => Promise<T>): Promise<T> {
  const p = await pool.query(`INSERT INTO "RolePermission"("roleId","permissionId") SELECT r.id, p.id FROM "Role" r, "Permission" p WHERE r.code='HR_PAYROLL_CONTROL' AND p.code='hr:pay_manage' ON CONFLICT DO NOTHING RETURNING "permissionId"`);
  try {
    return await fn();
  } finally {
    if (p.rowCount) await pool.query(`DELETE FROM "RolePermission" WHERE "roleId"=(SELECT id FROM "Role" WHERE code='HR_PAYROLL_CONTROL') AND "permissionId"=$1`, [p.rows[0].permissionId]);
  }
}
async function freePeriod() {
  const used = new Set((await pool.query(`SELECT period FROM "PayRun"`)).rows.map((r) => r.period));
  for (let y = 1990; y < 2020; y++) for (let m = 1; m <= 12; m++) {
    const p = `${y}-${String(m).padStart(2, "0")}`;
    if (!used.has(p)) return p;
  }
  throw new Error("no free test period");
}

before(async () => {
  for (const u of ["police.admin", "hr.director", "chief.cs1", "desk.post1", "payroll.officer", "payroll.control"]) keys[u] = await keyFor(u);
  const region = (await pool.query(`SELECT "regionId" FROM "Station" WHERE code='CS-01'`)).rows[0].regionId;
  station = (await pool.query(`INSERT INTO "Station"(id,"regionId",code,name,type,status,"isActive","isDemo","updatedAt") VALUES ($1,$2,$3,'Structure de test solde','STATION','ACTIVE',true,true,now()) RETURNING id`, [`st_py_${RUN}`, region, `PAY${RUN}`.toUpperCase()])).rows[0].id;
  rankId = (await pool.query(`INSERT INTO "Rank"(id,code,name,level,category,"isActive") VALUES ($1,$2,'Grade de test solde',1,'CIVILIAN',true) RETURNING id`, [`rk_py_${RUN}`, `TP${RUN}`.toUpperCase()])).rows[0].id;
  for (const k of ["P1", "P2", "P3"] as const) off[k] = await newOfficer(k);
  await pool.query(`UPDATE "Officer" SET "administrativeStatus"='SUSPENDED', "dutyStatus"='SUSPENDED' WHERE id=$1`, [off.P2]);
  await pool.query(`UPDATE "Officer" SET "administrativeStatus"='SECONDED' WHERE id=$1`, [off.P3]);
  await pool.query(`UPDATE "Officer" SET "lastName"='=SUM(A1)' WHERE id=$1`, [off.P1]); // spreadsheet-formula injection attempt in a name
  originalSuspended = (await call("payroll.officer", "/api/v1/hr/pay/settings")).json.data.suspendedPayPercent;
  period = await freePeriod();
});

after(async () => {
  await call("payroll.officer", "/api/v1/hr/pay/settings", "PUT", { suspendedPayPercent: originalSuspended });
  await pool.query(`UPDATE "PayComponent" SET "isActive"=false WHERE code LIKE $1`, [`TST${RUN.toUpperCase()}%`]);
  await pool.query(`UPDATE "Officer" SET "userId"=NULL WHERE id=$1`, [off.P1]);
  const ids = Object.values(off);
  await pool.query(`UPDATE "OfficerAssignment" SET "endDate"=now() WHERE "officerId" = ANY($1) AND "endDate" IS NULL`, [ids]);
  await pool.query(`UPDATE "Officer" SET "isActive"=false, "dutyStatus"='RETIRED', "administrativeStatus"='RETIRED' WHERE id = ANY($1)`, [ids]);
  await pool.query(`UPDATE "Rank" SET "isActive"=false WHERE id=$1`, [rankId]);
  await pool.query(`UPDATE "Station" SET status='INACTIVE', "isActive"=false WHERE id=$1`, [station]);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='hr-pay-test' AND "keyPrefix"=$1`, [`py${RUN}`]);
  await pool.end();
});

test("access: only the dedicated payroll roles, and each only for its own duties", async () => {
  for (const who of ["police.admin", "hr.director", "chief.cs1", "desk.post1"]) {
    for (const path of ["/api/v1/hr/pay", "/api/v1/hr/pay/scale", "/api/v1/hr/pay/components", "/api/v1/hr/pay/elements", "/api/v1/hr/pay/runs", `/api/v1/hr/pay/officers/${off.P1}`]) assert.equal((await call(who, path)).res.status, 403, `${who} ${path}`);
  }
  assert.equal((await call("payroll.officer", "/api/v1/hr/pay")).res.status, 200);
  assert.equal((await call("payroll.control", "/api/v1/hr/pay")).res.status, 200);
  // each role only for its own duties
  assert.equal((await call("payroll.control", "/api/v1/hr/pay/scale", "POST", { rankId, amount: 1000, effectiveFrom: FROM })).res.status, 403);
  assert.equal((await call("payroll.control", "/api/v1/hr/pay/runs", "POST", { period: "1990-01" })).res.status, 403);
  assert.equal((await call("payroll.control", "/api/v1/hr/pay/settings", "PUT", { suspendedPayPercent: 60 })).res.status, 403);
  assert.equal((await call("payroll.officer", "/api/v1/hr/pay/runs/x/validate", "POST")).res.status, 403);
  assert.equal((await call("payroll.officer", "/api/v1/hr/pay/runs/x/export")).res.status, 403);
});

test("pay elements referential: validation and uniqueness", async () => {
  const code = (s: string) => `TST${RUN.toUpperCase()}_${s}`;
  const mk = (over: Record<string, unknown>) => call("payroll.officer", "/api/v1/hr/pay/components", "POST", { code: code("X"), name: "Test", kind: "BONUS", calculation: "FIXED", defaultValue: 1000, ...over });
  assert.ok(is4xx(await mk({ calculation: "PERCENT_OF_BASE", defaultValue: 150 })), "a percentage cannot exceed 100");
  assert.ok(is4xx(await mk({ code: "bad code!" })), "invalid code");
  assert.equal((await call("payroll.control", "/api/v1/hr/pay/components", "POST", { code: code("Y"), name: "T", kind: "BONUS", calculation: "FIXED", defaultValue: 1 })).res.status, 403);
  const defs: [keyof typeof comp, Record<string, unknown>][] = [
    ["BONUS", { code: code("BONUS"), name: "Prime de test", kind: "BONUS", calculation: "PERCENT_OF_BASE", defaultValue: 10 }],
    ["ALLOW", { code: code("ALLOW"), name: "Indemnité de test", kind: "ALLOWANCE", calculation: "FIXED", defaultValue: 25000 }],
    ["DED", { code: code("DED"), name: "Retenue de test", kind: "DEDUCTION", calculation: "PERCENT_OF_BASE", defaultValue: 5 }],
    ["BEN", { code: code("BEN"), name: "Avantage de test", kind: "BENEFIT", calculation: "FIXED", defaultValue: 40000 }],
  ];
  for (const [k, d] of defs) {
    const r = await call("payroll.officer", "/api/v1/hr/pay/components", "POST", d);
    assert.equal(r.res.status, 201, JSON.stringify(r.json));
    comp[k] = r.json.data.id;
  }
  assert.equal((await call("payroll.officer", "/api/v1/hr/pay/components", "POST", defs[0][1])).res.status, 409, "duplicate code");
  const upd = await call("payroll.officer", `/api/v1/hr/pay/components/${comp.BONUS}`, "PUT", { ...defs[0][1], defaultValue: 10, name: "Prime de test (modifiée)" });
  assert.equal(upd.res.status, 200);
  assert.ok(is4xx(await call("payroll.officer", `/api/v1/hr/pay/components/${comp.BONUS}`, "PUT", { ...defs[0][1], code: code("CHANGED") })), "the code is immutable");
});

test("pay scale: requested by the officer, validated by someone else, never by the requester", async () => {
  assert.ok(is4xx(await call("payroll.officer", "/api/v1/hr/pay/scale", "POST", { rankId, amount: 0, effectiveFrom: FROM })), "amount must be positive");
  assert.ok(is4xx(await call("payroll.officer", "/api/v1/hr/pay/scale", "POST", { rankId: "nope", amount: 1000, effectiveFrom: FROM })), "unknown rank");
  const r = await call("payroll.officer", "/api/v1/hr/pay/scale", "POST", { rankId, amount: 100_000, effectiveFrom: FROM });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  assert.equal(r.json.data.status, "PENDING");
  assert.equal((await call("payroll.officer", "/api/v1/hr/pay/scale", "POST", { rankId, amount: 100_000, effectiveFrom: FROM })).res.status, 409, "one entry per rank and date");
  assert.equal((await call("payroll.officer", `/api/v1/hr/pay/scale/${r.json.data.id}/decide`, "POST", { decision: "APPROVE" })).res.status, 403, "the requester has no validation right");
  assert.ok(is4xx(await call("payroll.control", `/api/v1/hr/pay/scale/${r.json.data.id}/decide`, "POST", { decision: "REJECT" })), "a rejection needs a reason");
  assert.equal((await call("payroll.control", `/api/v1/hr/pay/scale/${r.json.data.id}/decide`, "POST", { decision: "APPROVE" })).res.status, 200);
  assert.ok(is4xx(await call("payroll.control", `/api/v1/hr/pay/scale/${r.json.data.id}/decide`, "POST", { decision: "APPROVE" })), "decided once");
  await assert.rejects(pool.query(`UPDATE "PayScaleEntry" SET amount=999 WHERE id=$1`, [r.json.data.id]), /decided pay scale|cannot be modified/);
  await assert.rejects(pool.query(`DELETE FROM "PayScaleEntry" WHERE id=$1`, [r.json.data.id]), /append-only/);
  // four-eyes at the service level: a person holding both rights still cannot validate their own request
  await withManageRight(async () => {
    const own = await call("payroll.control", "/api/v1/hr/pay/scale", "POST", { rankId, amount: 120_000, effectiveFrom: "1995-01-01" });
    assert.equal(own.res.status, 201, JSON.stringify(own.json));
    assert.ok(is4xx(await call("payroll.control", `/api/v1/hr/pay/scale/${own.json.data.id}/decide`, "POST", { decision: "APPROVE" })), "cannot validate one's own request");
    assert.equal((await call("payroll.control", `/api/v1/hr/pay/scale/${own.json.data.id}/decide`, "POST", { decision: "APPROVE" })).res.status, 409, "still pending, still refused");
  });
});

test("pay elements: request, overlap, validation, end", async () => {
  const req = (who: string, c: string, extra: Record<string, unknown> = {}) => call(who, "/api/v1/hr/pay/elements", "POST", { officerId: off.P1, componentId: c, startDate: FROM, reason: "Décision de la Direction (test)", ...extra });
  assert.equal((await call("payroll.control", "/api/v1/hr/pay/elements", "POST", { officerId: off.P1, componentId: comp.BONUS, startDate: FROM, reason: "Tentative sans droit" })).res.status, 403);
  const ids: string[] = [];
  for (const c of [comp.BONUS, comp.ALLOW, comp.DED, comp.BEN]) {
    const r = await req("payroll.officer", c);
    assert.equal(r.res.status, 201, JSON.stringify(r.json));
    assert.equal(r.json.data.status, "PENDING");
    ids.push(r.json.data.id);
  }
  assert.equal((await req("payroll.officer", comp.BONUS)).res.status, 409, "overlapping grant");
  assert.ok(is4xx(await req("payroll.officer", comp.BONUS, { officerId: off.P2, value: 500 })), "a percentage override above 100 is refused");
  assert.ok(is4xx(await req("payroll.officer", comp.ALLOW, { officerId: off.P2, startDate: "1980-01-01" })), "nothing before 1990");
  // P2 (suspended officer) receives the same elements, P3 none
  for (const c of [comp.BONUS, comp.ALLOW, comp.DED]) {
    const r = await req("payroll.officer", c, { officerId: off.P2 });
    assert.equal(r.res.status, 201, JSON.stringify(r.json));
    ids.push(r.json.data.id);
  }
  assert.equal((await call("payroll.officer", `/api/v1/hr/pay/elements/${ids[0]}/decide`, "POST", { decision: "APPROVE" })).res.status, 403);
  for (const id of ids) assert.equal((await call("payroll.control", `/api/v1/hr/pay/elements/${id}/decide`, "POST", { decision: "APPROVE" })).res.status, 200);
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "OfficerPayElement" WHERE "officerId" = ANY($1) AND status='ACTIVE'`, [[off.P1, off.P2]])).rows[0].n, 7);
  assert.equal((await call("payroll.control", `/api/v1/hr/pay/elements/${ids[0]}/end`, "POST", { reason: "Fin de la prime (test)" })).res.status, 403, "ending needs hr:pay_manage");
  assert.ok(is4xx(await call("payroll.officer", `/api/v1/hr/pay/elements/${ids[0]}/end`, "POST", { reason: "x" })), "reason too short");
  // an element that was requested but not validated does not count; a rejected one never does
  const rej = await req("payroll.officer", comp.BEN, { officerId: off.P3 });
  assert.equal(rej.res.status, 201);
  assert.ok(is4xx(await call("payroll.control", `/api/v1/hr/pay/elements/${rej.json.data.id}/decide`, "POST", { decision: "REJECT" })), "reason required");
  assert.equal((await call("payroll.control", `/api/v1/hr/pay/elements/${rej.json.data.id}/decide`, "POST", { decision: "REJECT", note: "Non conforme à la décision" })).res.status, 200);
  assert.equal((await pool.query(`SELECT status FROM "OfficerPayElement" WHERE id=$1`, [rej.json.data.id])).rows[0].status, "REJECTED");
});

test("monthly statement: exact amounts, exclusions, draft replacement, separation of duties, freeze", async () => {
  assert.ok(is4xx(await call("payroll.officer", "/api/v1/hr/pay/runs", "POST", { period: "2999-01" })), "no future month");
  assert.ok(is4xx(await call("payroll.officer", "/api/v1/hr/pay/runs", "POST", { period: "2026-13" })), "invalid period");
  const gen = await call("payroll.officer", "/api/v1/hr/pay/runs", "POST", { period });
  assert.equal(gen.res.status, 201, JSON.stringify(gen.json));
  runId = gen.json.data.id;
  const run = gen.json.data;
  assert.equal(run.status, "DRAFT");
  assert.equal(run.officers, 2, "P1 (active) and P2 (suspended); P3 (seconded) is excluded");
  assert.ok(run.excludedNoScale >= 1, "officers of other ranks have no scale yet");
  assert.ok(run.excludedStatus >= 1, "the seconded officer is excluded by status");
  assert.equal(run.suspendedCount, 1);
  const lines = (await call("payroll.control", `/api/v1/hr/pay/runs/${runId}/lines?pageSize=50`)).json.data as any[];
  const l1 = lines.find((l) => l.officerId === off.P1);
  const l2 = lines.find((l) => l.officerId === off.P2);
  assert.deepEqual([l1.base, l1.gross, l1.deductions, l1.net], [100_000, 135_000, 5_000, 130_000]);
  assert.equal(l1.detail.benefits, 40_000, "benefit in kind valued, not paid");
  assert.deepEqual([l2.base, l2.gross, l2.deductions, l2.net], [50_000, 67_500, 2_500, 65_000], "suspended: 50 % of base and bonuses");
  assert.equal(lines.find((l) => l.officerId === off.P3), undefined);
  // totals = sum of the lines (database truth)
  const sums = (await pool.query(`SELECT sum(base)::bigint b, sum(gross)::bigint g, sum(deductions)::bigint d, sum(net)::bigint n FROM "PayRunLine" WHERE "runId"=$1`, [runId])).rows[0];
  assert.deepEqual([run.totalBase, run.totalGross, run.totalDeductions, run.totalNet], [Number(sums.b), Number(sums.g), Number(sums.d), Number(sums.n)]);
  assert.equal(run.totalNet, 195_000);
  // a draft is replaced by a new generation
  const again = await call("payroll.officer", "/api/v1/hr/pay/runs", "POST", { period });
  assert.equal(again.res.status, 201);
  assert.notEqual(again.json.data.id, runId);
  runId = again.json.data.id;
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "PayRun" WHERE period=$1`, [period])).rows[0].n, 1);
  // separation of duties
  assert.equal((await call("payroll.officer", `/api/v1/hr/pay/runs/${runId}/validate`, "POST")).res.status, 403, "the generator cannot validate");
  await withManageRight(async () => {
    const byControl = await call("payroll.control", "/api/v1/hr/pay/runs", "POST", { period: await freePeriodAfter(period) });
    assert.equal(byControl.res.status, 201, JSON.stringify(byControl.json));
    assert.ok(is4xx(await call("payroll.control", `/api/v1/hr/pay/runs/${byControl.json.data.id}/validate`, "POST")), "nor can a person validate what they generated");
    assert.ok(is4xx(await call("payroll.control", `/api/v1/hr/pay/runs/${byControl.json.data.id}/export`)), "a draft cannot be exported");
  });
  assert.equal((await call("payroll.control", `/api/v1/hr/pay/runs/${runId}/validate`, "POST")).res.status, 200);
  // frozen
  assert.equal((await call("payroll.officer", "/api/v1/hr/pay/runs", "POST", { period })).res.status, 409, "validated statements are not regenerated");
  await assert.rejects(pool.query(`UPDATE "PayRunLine" SET net=1, gross=1 WHERE "runId"=$1`, [runId]), /frozen/);
  await assert.rejects(pool.query(`DELETE FROM "PayRunLine" WHERE "runId"=$1`, [runId]), /frozen/);
  await assert.rejects(pool.query(`DELETE FROM "PayRun" WHERE id=$1`, [runId]), /cannot be deleted/);
  await assert.rejects(pool.query(`UPDATE "PayRun" SET "totalNet"=1 WHERE id=$1`, [runId]), /frozen/);
});

async function freePeriodAfter(p: string) {
  const used = new Set((await pool.query(`SELECT period FROM "PayRun"`)).rows.map((r) => r.period));
  let [y, m] = p.split("-").map(Number);
  for (let i = 0; i < 400; i++) {
    m++;
    if (m > 12) (m = 1), y++;
    const c = `${y}-${String(m).padStart(2, "0")}`;
    if (!used.has(c) && c <= "2020-12") return c;
  }
  throw new Error("no free period");
}

test("export: only the controller, validated statements only, counted, audited, safe for spreadsheets", async () => {
  assert.equal((await raw("payroll.officer", `/api/v1/hr/pay/runs/${runId}/export`)).status, 403);
  assert.equal((await raw("hr.director", `/api/v1/hr/pay/runs/${runId}/export`)).status, 403);
  const res = await raw("payroll.control", `/api/v1/hr/pay/runs/${runId}/export`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/csv/);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  const text = await res.text();
  const rows = text.replace("﻿", "").trim().split("\n");
  assert.equal(rows[0], "period,badgeNumber,lastName,firstName,rank,structure,status,base,bonuses,allowances,gross,deductions,net,benefitsValue");
  assert.equal(rows.length, 3, "header + 2 officers");
  const p1 = rows.find((r) => r.includes(`PAYP1${RUN}`.toUpperCase()))!;
  assert.ok(p1.includes("'=SUM(A1)"), "a name starting with = is neutralised");
  assert.ok(p1.endsWith(",100000,10000,25000,135000,5000,130000,40000"), p1);
  const row = (await pool.query(`SELECT "exportCount", "exportedAt" FROM "PayRun" WHERE id=$1`, [runId])).rows[0];
  assert.equal(row.exportCount, 1);
  assert.ok(row.exportedAt);
  assert.ok((await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='HR_PAY_RUN_EXPORTED' AND "entityId"=$1`, [runId])).rows[0].n >= 1);
});

test("confidentiality: reads are audited, the HR dossier never carries pay, officers see only their own pay", async () => {
  const view = await call("payroll.control", `/api/v1/hr/pay/officers/${off.P1}`);
  assert.equal(view.res.status, 200);
  assert.equal(view.json.data.baseSalary, 100_000);
  assert.equal(view.json.data.lines[0].net, 130_000);
  assert.equal((await call("hr.director", `/api/v1/hr/pay/officers/${off.P1}`)).res.status, 403);
  for (const a of ["HR_PAY_OFFICER_VIEWED", "HR_PAY_LINES_VIEWED", "HR_PAY_RUN_VIEWED"]) {
    await call("payroll.control", a === "HR_PAY_RUN_VIEWED" ? `/api/v1/hr/pay/runs/${runId}` : `/api/v1/hr/pay/runs/${runId}/lines`);
    assert.ok((await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action=$1`, [a])).rows[0].n >= 1, a);
  }
  const keysOf = (v: unknown): string[] => (Array.isArray(v) ? v.flatMap(keysOf) : v && typeof v === "object" ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => [k, ...keysOf(x)]) : []);
  const dossierKeys = keysOf((await call("hr.director", `/api/v1/hr/dossiers/${off.P1}`)).json);
  assert.deepEqual(dossierKeys.filter((k) => /salary|gross|^net$|deduction|baseAmount|^pay|^amount$/i.test(k)), [], "no pay data in the HR dossier");
  // self-service: link P1 to a user, who then sees own validated lines and nothing else
  await pool.query(`UPDATE "Officer" SET "userId"=(SELECT id FROM "User" WHERE username='desk.post1') WHERE id=$1`, [off.P1]);
  const me = await call("desk.post1", "/api/v1/hr/pay/me");
  assert.equal(me.res.status, 200);
  assert.equal(me.json.data.length, 1);
  assert.equal(me.json.data[0].net, 130_000);
  assert.equal(me.json.data[0].officerId, off.P1);
  assert.equal((await call("desk.post1", "/api/v1/hr/pay/runs")).res.status, 403);
  assert.equal((await call("desk.post1", `/api/v1/hr/pay/runs/${runId}/lines`)).res.status, 403);
  await pool.query(`UPDATE "Officer" SET "userId"=NULL WHERE id=$1`, [off.P1]);
  assert.deepEqual((await call("desk.post1", "/api/v1/hr/pay/me")).json.data, [], "an account without officer record sees nothing");
});

test("settings: the share of pay during a suspension is configurable and audited", async () => {
  assert.equal((await call("payroll.control", "/api/v1/hr/pay/settings", "PUT", { suspendedPayPercent: 60 })).res.status, 403);
  assert.ok(is4xx(await call("payroll.officer", "/api/v1/hr/pay/settings", "PUT", { suspendedPayPercent: 150 })));
  assert.equal((await call("payroll.officer", "/api/v1/hr/pay/settings", "PUT", { suspendedPayPercent: 70 })).res.status, 200);
  assert.equal((await call("payroll.officer", "/api/v1/hr/pay/settings")).json.data.suspendedPayPercent, 70);
  assert.ok((await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='HR_PAY_SETTINGS_UPDATED'`)).rows[0].n >= 1);
});

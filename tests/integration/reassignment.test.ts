/**
 * Security audit, lot 5 — effects of a reassignment. Live dev server + seeded database:
 *   npx tsx --test tests/integration/reassignment.test.ts
 * Uses temporary API keys, two temporary accounts and one temporary officer. The accounts are left DISABLED (an approval request
 * points at them and approval records are append-only), the case lead and the officer are restored.
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
const st: Record<string, string> = {};
let officerId = "";
let userId = "";
let user2Id = "";
let caseRestore: { id: string; leadId: string | null } | null = null;
const started = new Date().toISOString();

async function keyFor(username: string): Promise<string> {
  const key = `pms_it${RUN.slice(-4)}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'integration',$3,$4)`, [`apikey_mut_${username}_${RUN}`, u.rows[0].id, `it${RUN.slice(-4)}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function call(who: string, path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${keys[who]}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as { data?: any; error?: { code: string; message: string } };
  return { res, json };
}
const userState = async (id: string) => (await pool.query(`SELECT "stationId", clearance, status FROM "User" WHERE id=$1`, [id])).rows[0];
const session = async (sid: string) => (await pool.query(`SELECT "revokedAt", "revokedReason" FROM "Session" WHERE id=$1`, [sid])).rows[0];
async function makeUser(tag: string, clearance: string) {
  const chief = (await pool.query(`SELECT "roleId", "stationId", "regionId", "adminDepartmentId", "organizationId" FROM "User" WHERE username='chief.cs1'`)).rows[0];
  const id = `usr_mut_${tag}_${RUN}`;
  await pool.query(`INSERT INTO "User"(id, username, email, "firstName", "lastName", "passwordHash", "roleId", "stationId", "regionId", "adminDepartmentId", "organizationId", clearance, "updatedAt") VALUES ($1,$2,$3,'Mutation','Test','x',$4,$5,$6,$7,$8,$9::"ClearanceLevel", now())`, [id, `it.mut.${tag}.${RUN}`, `it.mut.${tag}.${RUN}@pms.example`, chief.roleId, chief.stationId, chief.regionId, chief.adminDepartmentId, chief.organizationId, clearance]);
  return id;
}

before(async () => {
  for (const u of ["police.admin", "hr.director", "chief.cs1", "chief.arr5", "commander.central", "security.admin"]) keys[u] = await keyFor(u);
  for (const r of (await pool.query(`SELECT id, code FROM "Station" WHERE code IN ('CS-01','CA-NDJ-05')`)).rows) st[r.code] = r.id;
  userId = await makeUser("a", "SENSITIVE");
  user2Id = await makeUser("b", "CONFIDENTIAL");
  const rank = (await pool.query(`SELECT id FROM "Rank" WHERE code='GP'`)).rows[0].id;
  const created = await call("police.admin", "/api/v1/officers", "POST", { badgeNumber: `MUT${RUN}`.toUpperCase(), firstName: "Test", lastName: `REAFF${RUN}`, gender: "UNKNOWN", rankId: rank, stationId: st["CS-01"], hiredAt: "2015-01-01" });
  assert.equal(created.res.status, 201, JSON.stringify(created.json));
  officerId = created.json.data.id;
  await pool.query(`UPDATE "Officer" SET "userId"=$1 WHERE id=$2`, [userId, officerId]);
  // one open case led by the person: it must stay with the old unit
  const c = (await pool.query(`SELECT id, "leadId" FROM "Case" WHERE status NOT IN ('CLOSED','ARCHIVED') AND "deletedAt" IS NULL AND "stationId"=$1 LIMIT 1`, [st["CS-01"]])).rows[0];
  assert.ok(c, "the dev data holds an open case at CS-01");
  caseRestore = c;
  await pool.query(`UPDATE "Case" SET "leadId"=$1 WHERE id=$2`, [userId, c.id]);
});
after(async () => {
  if (caseRestore) await pool.query(`UPDATE "Case" SET "leadId"=$1 WHERE id=$2`, [caseRestore.leadId, caseRestore.id]);
  await pool.query(`UPDATE "Officer" SET "userId"=NULL, "isActive"=false WHERE id=$1`, [officerId]);
  await pool.query(`UPDATE "User" SET status='DISABLED' WHERE id = ANY($1)`, [[userId, user2Id]]);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='integration' AND "keyPrefix"=$1`, [`it${RUN.slice(-4)}`]);
  await pool.end();
});

test("a transfer switches the scope, ends the sessions, suspends the clearance and asks the new unit's supervisor to re-approve it", async () => {
  await pool.query(`INSERT INTO "Session"(id,"userId","tokenHash","expiresAt") VALUES ($1,$2,$3,$4)`, [`sess_mut_${RUN}`, userId, createHash("sha256").update(`tok${RUN}`).digest("hex"), new Date(Date.now() + 3_600_000).toISOString()]);
  assert.equal((await userState(userId)).clearance, "SENSITIVE");

  const prop = await call("chief.cs1", "/api/v1/hr/transfers", "POST", { officerId, toStationId: st["CA-NDJ-05"], effectiveDate: new Date().toISOString().slice(0, 10), reason: "Besoin de service (test)" });
  assert.equal(prop.res.status, 201, JSON.stringify(prop.json));
  const id = prop.json.data.id;
  assert.equal((await call("hr.director", `/api/v1/hr/transfers/${id}/review`, "POST", { decision: "APPROVE", note: "Conforme" })).res.status, 200);
  const done = await call("commander.central", `/api/v1/hr/transfers/${id}/validate`, "POST", { decision: "APPROVE", note: "Validé" });
  assert.equal(done.json.data.status, "EXECUTED", JSON.stringify(done.json));

  const u = await userState(userId);
  assert.equal(u.stationId, st["CA-NDJ-05"], "scope switched to the new unit");
  assert.equal(u.clearance, "STANDARD", "the sensitive permissions are suspended");
  const s = await session(`sess_mut_${RUN}`);
  assert.ok(s.revokedAt, "sessions ended");
  assert.equal(s.revokedReason, "reassigned");
  const susp = (await pool.query(`SELECT before FROM "AuditLog" WHERE action='USER_CLEARANCE_SUSPENDED' AND "entityId"=$1`, [userId])).rows;
  assert.equal(susp.length, 1);
  assert.equal(susp[0].before.clearance, "SENSITIVE");

  const req = (await pool.query(`SELECT id, status, kind, "requiredApprovals", "requestedById", "stationId", payload FROM "ApprovalRequest" WHERE "targetUserId"=$1 AND kind='USER_CLEARANCE_RESTORE'`, [userId])).rows;
  assert.equal(req.length, 1);
  assert.equal(req[0].status, "PENDING");
  assert.equal(req[0].requiredApprovals, 1);
  assert.equal(req[0].requestedById, userId);
  assert.equal(req[0].stationId, st["CA-NDJ-05"], "the request is for the supervisors of the NEW unit");
  assert.equal(req[0].payload.clearance, "SENSITIVE");

  // the supervisor of the OLD unit cannot give the permissions back; the supervisor of the new unit can
  const old = await call("chief.cs1", `/api/v1/approvals/${req[0].id}`, "POST", { action: "approve" });
  assert.ok(old.res.status >= 400 && old.res.status < 500, `the old unit has no authority (${old.res.status})`);
  assert.equal((await userState(userId)).clearance, "STANDARD");
  const ok = await call("chief.arr5", `/api/v1/approvals/${req[0].id}`, "POST", { action: "approve" });
  assert.equal(ok.json.data.status, "EXECUTED", JSON.stringify(ok.json));
  assert.equal((await userState(userId)).clearance, "SENSITIVE", "restored by the supervisor of the new unit");
  assert.equal((await session(`sess_mut_${RUN}`)).revokedReason, "reassigned");
});

test("the open cases stay with the old unit, whose supervisors are told to reassign them", async () => {
  const c = (await pool.query(`SELECT "stationId", "leadId" FROM "Case" WHERE id=$1`, [caseRestore!.id])).rows[0];
  assert.equal(c.stationId, st["CS-01"], "the case did not follow the person");
  assert.equal(c.leadId, userId, "and nothing was reassigned silently");
  const chief = (await pool.query(`SELECT id FROM "User" WHERE username='chief.cs1'`)).rows[0].id;
  const n = (await pool.query(`SELECT body FROM "Notification" WHERE "userId"=$1 AND title='Work to reassign' AND "createdAt" > $2`, [chief, started])).rows;
  assert.ok(n.length >= 1, "the supervisor of the old unit was notified");
  assert.match(n[0].body, /1 open case\(s\)/);
});

test("the same effects apply when an administrator moves an account to another unit", async () => {
  assert.equal((await userState(user2Id)).clearance, "CONFIDENTIAL");
  const row = (await pool.query(`SELECT "roleId", email, "firstName", "lastName" FROM "User" WHERE id=$1`, [user2Id])).rows[0];
  const r = await call("security.admin", `/api/v1/users/${user2Id}`, "PATCH", { email: row.email, firstName: row.firstName, lastName: row.lastName, roleId: row.roleId, stationId: st["CA-NDJ-05"] });
  assert.equal(r.res.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.data.clearance, "STANDARD", "suspended by the move");
  assert.equal(r.json.data.stationId, st["CA-NDJ-05"]);
  const restore = r.json.data.pendingApprovals.find((a: { kind: string }) => a.kind === "USER_CLEARANCE_RESTORE");
  assert.ok(restore, "a re-approval request was created");
  assert.equal(restore.requiredApprovals, 1);
  assert.equal((await call("chief.arr5", `/api/v1/approvals/${restore.id}`, "POST", { action: "approve" })).json.data.status, "EXECUTED");
  assert.equal((await userState(user2Id)).clearance, "CONFIDENTIAL");
});

test("a change that is not a change of unit leaves the clearance and the sessions alone", async () => {
  const row = (await pool.query(`SELECT "roleId", email, "firstName", "lastName", "stationId" FROM "User" WHERE id=$1`, [user2Id])).rows[0];
  const r = await call("security.admin", `/api/v1/users/${user2Id}`, "PATCH", { email: row.email, firstName: "Renommé", lastName: row.lastName, roleId: row.roleId, stationId: row.stationId });
  assert.equal(r.res.status, 200);
  assert.equal(r.json.data.clearance, "CONFIDENTIAL");
  assert.deepEqual(r.json.data.pendingApprovals, []);
});

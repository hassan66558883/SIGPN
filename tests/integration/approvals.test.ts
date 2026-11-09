/**
 * Security audit, lot 4 — approval workflow. Live dev server + seeded database:
 *   npx tsx --test tests/integration/approvals.test.ts
 * Uses temporary API keys and temporary accounts / roles (removed at the end, except the approval requests and votes, which are append-only evidence).
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
const createdUsers: string[] = [];
const PW = "Temp-Password-2026!x";
let roles: Record<string, string> = {};
let cs1 = "";

async function keyFor(name: string): Promise<string> {
  const key = `pms_it${RUN.slice(-4)}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [name]);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'integration',$3,$4)`, [`apikey_apr_${name}_${RUN}`, u.rows[0].id, `it${RUN.slice(-4)}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function api(key: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as { data?: any; error?: { code: string; message: string } };
  return { res, json };
}
const decide = (who: string, id: string, action: "approve" | "reject" | "cancel", comment?: string) => api(keys[who], "POST", `/api/v1/approvals/${id}`, { action, comment });
const newUser = (username: string, role: string, extra: Record<string, unknown> = {}) => ({ username, email: `${username}@pms.example`, firstName: "Test", lastName: "Approbation", roleId: roles[role], stationId: cs1, temporaryPassword: PW, ...extra });
const userRow = async (username: string) => (await pool.query(`SELECT id, "roleId", clearance, "createdById" FROM "User" WHERE username=$1`, [username])).rows[0];
const status = async (id: string) => (await pool.query(`SELECT status, "failureReason" FROM "ApprovalRequest" WHERE id=$1`, [id])).rows[0];
const uname = (s: string) => `it.apr.${s}.${RUN}`;

before(async () => {
  for (const u of ["security.admin", "chief.cs1", "commander.central", "commander.dept", "commander.national", "police.admin", "desk.cs1", "admin"]) keys[u] = await keyFor(u);
  const list = (await api(keys["security.admin"], "GET", "/api/v1/roles")).json.data as { id: string; code: string }[];
  roles = Object.fromEntries(list.map((r) => [r.code, r.id]));
  cs1 = (await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`)).rows[0].id;
});
after(async () => {
  for (const id of createdUsers) await pool.query(`DELETE FROM "User" WHERE id=$1 AND username LIKE 'it.%'`, [id]);
  await pool.query(`DELETE FROM "RolePermission" WHERE "roleId" IN (SELECT id FROM "Role" WHERE code LIKE $1)`, [`IT_TMP_${RUN}%`]);
  await pool.query(`DELETE FROM "Role" WHERE code LIKE $1`, [`IT_TMP_${RUN}%`]);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='integration' AND "keyPrefix"=$1`, [`it${RUN.slice(-4)}`]);
  await pool.end();
});

test("an ordinary account is requested, not created; one authorised approval by the commander of the station creates it", async () => {
  const username = uname("ord");
  const r = await api(keys["security.admin"], "POST", "/api/v1/users", newUser(username, "INVESTIGATOR"));
  assert.equal(r.res.status, 202, JSON.stringify(r.json));
  assert.equal(r.json.data.status, "PENDING");
  assert.equal(r.json.data.requiredApprovals, 1);
  assert.equal(r.json.data.kind, "USER_CREATE");
  assert.equal(await userRow(username), undefined, "nothing is created before the approval");
  // nothing secret leaves the service
  assert.ok(!("payload" in r.json.data) && !JSON.stringify(r.json).includes(PW) && !JSON.stringify(r.json).includes("passwordHash"));
  const stored = (await pool.query(`SELECT payload::text p FROM "ApprovalRequest" WHERE id=$1`, [r.json.data.id])).rows[0].p;
  assert.ok(!stored.includes(PW), "the temporary password is never stored in clear");
  assert.match(stored, /passwordHash/);

  // the requester (security administrator) cannot decide; a station commander of ANOTHER commissariat cannot either
  assert.ok((await decide("security.admin", r.json.data.id, "approve")).res.status >= 400);
  assert.ok((await decide("desk.cs1", r.json.data.id, "approve")).res.status >= 400);

  const ok = await decide("chief.cs1", r.json.data.id, "approve");
  assert.equal(ok.res.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.data.status, "EXECUTED");
  const u = await userRow(username);
  assert.ok(u, "the account exists after the approval");
  createdUsers.push(u.id);
  assert.equal(u.roleId, roles.INVESTIGATOR);
  assert.equal((await pool.query(`SELECT username FROM "User" WHERE id=$1`, [u.createdById])).rows[0].username, "security.admin", "created as the requester");
  const actions = (await pool.query(`SELECT action FROM "AuditLog" WHERE "entityId"=$1 ORDER BY "chainSeq"`, [r.json.data.id])).rows.map((x) => x.action);
  assert.deepEqual(actions, ["APPROVAL_REQUESTED", "APPROVAL_APPROVED", "APPROVAL_EXECUTED"]);
});

test("four-eyes: a commander who requests an account cannot approve it; a commander above can", async () => {
  const username = uname("eyes");
  const r = await api(keys["chief.cs1"], "POST", "/api/v1/users", newUser(username, "DESK_OFFICER"));
  assert.equal(r.res.status, 202, JSON.stringify(r.json));
  assert.ok((await decide("chief.cs1", r.json.data.id, "approve")).res.status >= 400, "own request");
  assert.equal((await status(r.json.data.id)).status, "PENDING");
  assert.equal((await decide("commander.central", r.json.data.id, "approve")).json.data.status, "EXECUTED");
  const u = await userRow(username);
  createdUsers.push(u.id);
});

test("a sensitive account needs two approvers from two different levels of the chain", async () => {
  const username = uname("sens");
  const r = await api(keys["security.admin"], "POST", "/api/v1/users", newUser(username, "STATION_COMMANDER"));
  assert.equal(r.json.data.requiredApprovals, 2, "a commander role is sensitive");
  const first = await decide("chief.cs1", r.json.data.id, "approve");
  assert.equal(first.json.data.status, "PENDING");
  assert.equal(first.json.data.approvalsSoFar, 1);
  assert.equal(await userRow(username), undefined, "one approval is not enough");
  assert.ok((await decide("chief.cs1", r.json.data.id, "approve")).res.status >= 400, "a person votes once");
  const second = await decide("commander.dept", r.json.data.id, "approve");
  assert.equal(second.res.status, 200, JSON.stringify(second.json));
  assert.equal(second.json.data.status, "EXECUTED");
  const u = await userRow(username);
  createdUsers.push(u.id);
  assert.equal(u.clearance, "STANDARD");
  const votes = (await pool.query(`SELECT "approverScope" s FROM "ApprovalDecision" WHERE "requestId"=$1 ORDER BY "createdAt"`, [r.json.data.id])).rows.map((x) => x.s);
  assert.deepEqual(votes, ["STATION", "DEPARTMENTAL"]);
});

test("a rejection needs a comment and ends the request; the requester can cancel; nobody else can", async () => {
  const a = await api(keys["security.admin"], "POST", "/api/v1/users", newUser(uname("rej"), "DESK_OFFICER"));
  assert.equal((await decide("chief.cs1", a.json.data.id, "reject")).res.status, 422, "a rejection must be motivated");
  const rej = await decide("chief.cs1", a.json.data.id, "reject", "Poste non prévu au tableau des effectifs.");
  assert.equal(rej.json.data.status, "REJECTED");
  assert.equal(await userRow(uname("rej")), undefined);
  assert.ok((await decide("commander.central", a.json.data.id, "approve")).res.status >= 400, "a closed request cannot be decided");

  const b = await api(keys["security.admin"], "POST", "/api/v1/users", newUser(uname("can"), "DESK_OFFICER"));
  assert.ok((await decide("chief.cs1", b.json.data.id, "cancel")).res.status >= 400, "only the requester cancels");
  assert.equal((await decide("security.admin", b.json.data.id, "cancel")).json.data.status, "CANCELLED");
  assert.equal(await userRow(uname("can")), undefined);
});

test("raising a clearance needs two approvals; lowering one is immediate; a role change is a request", async () => {
  const username = uname("clr");
  const created = await api(keys["security.admin"], "POST", "/api/v1/users", newUser(username, "DESK_OFFICER"));
  await decide("chief.cs1", created.json.data.id, "approve");
  const u = await userRow(username);
  createdUsers.push(u.id);
  const body = (over: Record<string, unknown>) => ({ email: `${username}@pms.example`, firstName: "Test", lastName: "Approbation", roleId: roles.DESK_OFFICER, stationId: cs1, ...over });

  const raise = await api(keys["security.admin"], "PATCH", `/api/v1/users/${u.id}`, body({ clearance: "SENSITIVE" }));
  assert.equal(raise.res.status, 200, JSON.stringify(raise.json));
  assert.equal(raise.json.data.clearance, "STANDARD", "not applied yet");
  assert.equal(raise.json.data.pendingApprovals[0].kind, "USER_CLEARANCE_RAISE");
  assert.equal(raise.json.data.pendingApprovals[0].requiredApprovals, 2);
  const id = raise.json.data.pendingApprovals[0].id;
  await decide("chief.cs1", id, "approve");
  assert.equal((await userRow(username)).clearance, "STANDARD");
  assert.equal((await decide("commander.dept", id, "approve")).json.data.status, "EXECUTED");
  assert.equal((await userRow(username)).clearance, "SENSITIVE", "applied after the second approval");

  const lower = await api(keys["security.admin"], "PATCH", `/api/v1/users/${u.id}`, body({ clearance: "STANDARD" }));
  assert.equal(lower.json.data.clearance, "STANDARD", "lowering is immediate");
  assert.deepEqual(lower.json.data.pendingApprovals, []);

  const role = await api(keys["security.admin"], "PATCH", `/api/v1/users/${u.id}`, body({ roleId: roles.PATROL_OFFICER }));
  assert.equal(role.json.data.roleId, roles.DESK_OFFICER, "the role did not change yet");
  assert.equal(role.json.data.pendingApprovals[0].kind, "USER_ROLE_CHANGE");
  assert.equal(role.json.data.pendingApprovals[0].requiredApprovals, 1, "an ordinary role: one approval");
  assert.equal((await decide("chief.cs1", role.json.data.pendingApprovals[0].id, "approve")).json.data.status, "EXECUTED");
  assert.equal((await userRow(username)).roleId, roles.PATROL_OFFICER);
});

test("approvals that cannot be executed fail visibly instead of half-applying", async () => {
  const username = uname("fail");
  const r = await api(keys["security.admin"], "POST", "/api/v1/users", newUser(username, "DESK_OFFICER"));
  // someone else takes the username between the request and the approval
  const taker = await pool.query(`INSERT INTO "User"(id, username, email, "firstName", "lastName", "passwordHash", "roleId", "updatedAt") SELECT $1, $2, $3, 'X', 'Y', 'x', "roleId", now() FROM "User" WHERE username='desk.cs1'`, [`usr_it_${RUN}`, username, `${username}.other@pms.example`]);
  assert.equal(taker.rowCount, 1);
  createdUsers.push(`usr_it_${RUN}`);
  const out = await decide("chief.cs1", r.json.data.id, "approve");
  assert.equal(out.json.data.status, "FAILED");
  assert.match(out.json.data.failureReason, /already taken/);
});

test("who sees what: to decide, mine, and everything for the security administrator only", async () => {
  const pending = await api(keys["security.admin"], "POST", "/api/v1/users", newUser(uname("vis"), "DESK_OFFICER"));
  const todo = await api(keys["chief.cs1"], "GET", "/api/v1/approvals?view=todo");
  assert.equal(todo.res.status, 200);
  assert.ok((todo.json.data as { id: string }[]).some((x) => x.id === pending.json.data.id), "the commander of the station sees it");
  const other = await api(keys["commander.national"], "GET", "/api/v1/approvals?view=todo");
  assert.ok((other.json.data as { id: string }[]).some((x) => x.id === pending.json.data.id), "a commander above sees it");
  assert.ok(!(todo.json.data as { id: string }[]).some((x) => "payload" in x), "no payload in any listing");
  assert.equal((await api(keys["security.admin"], "GET", "/api/v1/approvals?view=mine")).json.data.some((x: { id: string }) => x.id === pending.json.data.id), true);
  assert.equal((await api(keys["security.admin"], "GET", "/api/v1/approvals?view=all")).res.status, 200);
  assert.ok((await api(keys["chief.cs1"], "GET", "/api/v1/approvals?view=all")).res.status >= 400, "everything is for the security administrator");
  assert.equal((await api(keys["desk.cs1"], "GET", "/api/v1/approvals")).res.status, 403, "no approval permission");
  await decide("security.admin", pending.json.data.id, "cancel");
});

test("the database refuses a self-approval and any change to a vote", async () => {
  const r = await api(keys["security.admin"], "POST", "/api/v1/users", newUser(uname("db"), "DESK_OFFICER"));
  const requester = (await pool.query(`SELECT "requestedById" id FROM "ApprovalRequest" WHERE id=$1`, [r.json.data.id])).rows[0].id;
  await assert.rejects(() => pool.query(`INSERT INTO "ApprovalDecision"(id, "requestId", "approverId", vote, "approverScope") VALUES ($1, $2, $3, 'APPROVE', 'NATIONAL')`, [`dec_it_${RUN}`, r.json.data.id, requester]), /cannot decide/);
  await decide("chief.cs1", r.json.data.id, "approve");
  const u = await userRow(uname("db"));
  createdUsers.push(u.id);
  await assert.rejects(() => pool.query(`UPDATE "ApprovalDecision" SET vote='REJECT' WHERE "requestId"=$1`, [r.json.data.id]), /append-only/);
  await assert.rejects(() => pool.query(`DELETE FROM "ApprovalDecision" WHERE "requestId"=$1`, [r.json.data.id]), /append-only/);
});

test("adding a sensitive permission to a role needs two national approvers; ordinary changes apply at once", async () => {
  // The role editor is a server action: call the service (guard neutralised) as the technical administrator.
  const Module = (await import("node:module")).default as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
  const orig = Module._resolveFilename;
  Module._resolveFilename = function (request: string, ...rest: unknown[]) {
    return request === "server-only" ? require.resolve("../../scripts/empty.cjs") : orig.call(this, request, ...rest);
  };
  const { submitRolePermissions } = await import("../../src/server/approvals/service");
  const { loadUserRow, buildActor } = await import("../../src/server/auth/dal");
  const { prisma } = await import("../../src/server/db");
  const row = await loadUserRow((await pool.query(`SELECT id FROM "User" WHERE username='admin'`)).rows[0].id);
  const tech = (await buildActor(row!, { id: null, mfaVerified: true }, "api_key"))!;
  assert.ok(tech.permissions.has("roles:manage") && tech.permissions.has("system:backup"));

  const code = `IT_TMP_${RUN}`;
  const role = await prisma.role.create({ data: { code, name: "Role temporaire (test)", scopeLevel: "STATION", isSystem: false } });
  const ctx = { ip: null, userAgent: null };
  const out = await submitRolePermissions(tech, role.id, ["dashboard:view", "system:backup"], ctx);
  assert.equal(out.applied, false);
  const held = async () => (await pool.query(`SELECT p.code FROM "RolePermission" rp JOIN "Permission" p ON p.id=rp."permissionId" WHERE rp."roleId"=$1`, [role.id])).rows.map((x) => x.code as string).sort();
  assert.deepEqual(await held(), ["dashboard:view"], "the ordinary permission applied at once, the sensitive one waits");
  const id = out.request!.id;
  assert.equal(out.request!.requiredApprovals, 2);

  assert.ok((await decide("chief.cs1", id, "approve")).res.status >= 400, "a station commander has no national authority");
  assert.equal((await decide("commander.national", id, "approve")).json.data.status, "PENDING");
  assert.equal((await decide("police.admin", id, "approve")).json.data.status, "EXECUTED", "two distinct national approvers");
  assert.deepEqual(await held(), ["dashboard:view", "system:backup"]);

  // removing, or adding an ordinary permission, needs nothing
  const plain = await submitRolePermissions(tech, role.id, ["dashboard:view"], ctx);
  assert.equal(plain.applied, true);
  assert.deepEqual(await held(), ["dashboard:view"]);
  await prisma.$disconnect();
});

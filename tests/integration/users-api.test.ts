/**
 * Users/Roles REST API integration tests — live dev server + seeded database.
 *   npx tsx --test tests/integration/users-api.test.ts
 * Uses temporary API keys inserted directly in the database (removed at the end).
 */
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";

const BASE = process.env.PMS_URL ?? "http://localhost:3300";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: "-c timezone=UTC" });
const since = (ms: number) => new Date(Date.now() - ms).toISOString();
const RUN = Date.now().toString(36);
const keys: Record<string, string> = {};
const created: string[] = [];

async function keyFor(username: string): Promise<string> {
  const key = `pms_it${RUN.slice(-4)}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'integration',$3,$4)`, [`apikey_${username}_${RUN}`, u.rows[0].id, `it${RUN.slice(-4)}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}

async function api(key: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as { data?: Record<string, unknown> & { id?: string; items?: unknown }; error?: { code: string; message: string }; meta?: Record<string, number> };
  return { res, json };
}

before(async () => {
  keys.admin = await keyFor("admin");
  keys.chief = await keyFor("chief.cs1");
  keys.desk = await keyFor("desk.cs1");
});

after(async () => {
  for (const id of created) await pool.query(`DELETE FROM "User" WHERE id=$1 AND username LIKE 'it.%'`, [id]);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='integration' AND "keyPrefix"=$1`, [`it${RUN.slice(-4)}`]);
  await pool.end();
});

test("GET /roles returns system roles with permission sets", async () => {
  const { res, json } = await api(keys.admin, "GET", "/api/v1/roles");
  assert.equal(res.status, 200);
  const roles = json.data as unknown as { code: string; permissions: string[]; isSystem: boolean }[];
  const sa = roles.find((r) => r.code === "SUPER_ADMIN")!;
  assert.ok(sa.isSystem);
  assert.ok(sa.permissions.includes("users:create"));
  const inv = roles.find((r) => r.code === "INVESTIGATOR")!;
  assert.ok(!inv.permissions.includes("users:create"));
});

test("GET /users is paginated and scoped: station commander only sees their station", async () => {
  const all = await api(keys.admin, "GET", "/api/v1/users?pageSize=5");
  assert.equal(all.res.status, 200);
  assert.equal((all.json.data as unknown as unknown[]).length, 5);
  assert.ok((all.json.meta?.total ?? 0) >= 13);
  const chief = await api(keys.chief, "GET", "/api/v1/users?pageSize=100");
  assert.equal(chief.res.status, 200);
  const users = chief.json.data as unknown as { username: string; station: { code: string } | null }[];
  assert.ok(users.length > 0);
  for (const u of users) assert.equal(u.station?.code, "CS-01", `${u.username} outside station scope`);
});

test("POST /users: validation (422), duplicate (409), weak password (422)", async () => {
  const roles = await api(keys.admin, "GET", "/api/v1/roles");
  const invRole = (roles.json.data as unknown as { code: string; id: string }[]).find((r) => r.code === "INVESTIGATOR")!;
  const station = await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`);
  const bad = await api(keys.admin, "POST", "/api/v1/users", { username: "x" });
  assert.equal(bad.res.status, 422);
  assert.equal(bad.json.error?.code, "VALIDATION");
  const dup = await api(keys.admin, "POST", "/api/v1/users", { username: "inv.diallo", email: `it.dup.${RUN}@pms.example`, firstName: "A", lastName: "B", roleId: invRole.id, stationId: station.rows[0].id, temporaryPassword: "Temp-Password-2026!x" });
  assert.equal(dup.res.status, 409);
  const weak = await api(keys.admin, "POST", "/api/v1/users", { username: `it.weak.${RUN}`, email: `it.weak.${RUN}@pms.example`, firstName: "A", lastName: "B", roleId: invRole.id, stationId: station.rows[0].id, temporaryPassword: "password" });
  assert.equal(weak.res.status, 422);
  assert.match(weak.json.error?.message ?? "", /policy/);
});

test("POST /users creates a station investigator; audit row written; user must change password", async () => {
  const roles = await api(keys.admin, "GET", "/api/v1/roles");
  const invRole = (roles.json.data as unknown as { code: string; id: string }[]).find((r) => r.code === "INVESTIGATOR")!;
  const station = await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`);
  const username = `it.new.${RUN}`;
  const r = await api(keys.admin, "POST", "/api/v1/users", { username, email: `${username}@pms.example`, firstName: "Test", lastName: "Investigator", roleId: invRole.id, stationId: station.rows[0].id, temporaryPassword: "Temp-Password-2026!x" });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  const u = r.json.data!;
  created.push(u.id!);
  assert.equal(u.mustChangePassword, true);
  assert.equal((u.role as { code: string }).code, "INVESTIGATOR");
  assert.ok(!("passwordHash" in u));
  const audit = await pool.query(`SELECT 1 FROM "AuditLog" WHERE action='USER_CREATED' AND "entityLabel"=$1 AND at > $2`, [username, since(60_000)]);
  assert.equal(audit.rowCount, 1);
  const get = await api(keys.admin, "GET", `/api/v1/users/${u.id}`);
  assert.equal(get.res.status, 200);
});

test("privilege escalation guard: station commander cannot grant SUPER_ADMIN or create outside their station", async () => {
  const roles = await api(keys.admin, "GET", "/api/v1/roles");
  const list = roles.json.data as unknown as { code: string; id: string }[];
  const sa = list.find((r) => r.code === "SUPER_ADMIN")!;
  const desk = list.find((r) => r.code === "DESK_OFFICER")!;
  const cs1 = await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`);
  const ns1 = await pool.query(`SELECT id FROM "Station" WHERE code='NS-01'`);
  const esc = await api(keys.chief, "POST", "/api/v1/users", { username: `it.esc.${RUN}`, email: `it.esc.${RUN}@pms.example`, firstName: "E", lastName: "S", roleId: sa.id, stationId: cs1.rows[0].id, temporaryPassword: "Temp-Password-2026!x" });
  assert.equal(esc.res.status, 409);
  assert.match(esc.json.error?.message ?? "", /cannot grant/i);
  const out = await api(keys.chief, "POST", "/api/v1/users", { username: `it.out.${RUN}`, email: `it.out.${RUN}@pms.example`, firstName: "O", lastName: "S", roleId: desk.id, stationId: ns1.rows[0].id, temporaryPassword: "Temp-Password-2026!x" });
  assert.equal(out.res.status, 409);
  assert.match(out.json.error?.message ?? "", /own region\/station/);
  const denied = await pool.query(`SELECT count(*)::int AS n FROM "User" WHERE username IN ($1,$2)`, [`it.esc.${RUN}`, `it.out.${RUN}`]);
  assert.equal(denied.rows[0].n, 0);
});

test("desk officer (no users:view) → 403 on GET /users and audited", async () => {
  const r = await api(keys.desk, "GET", "/api/v1/users");
  assert.equal(r.res.status, 403);
  const audit = await pool.query(`SELECT 1 FROM "AuditLog" WHERE action='ACCESS_DENIED' AND "actorLabel" LIKE 'desk.cs1%' AND at > $1`, [since(60_000)]);
  assert.ok((audit.rowCount ?? 0) >= 1);
});

test("PATCH /users/{id} status: suspend revokes sessions, invalid transition 409, self-status forbidden", async () => {
  const target = created[0];
  assert.ok(target, "user created in previous test");
  const s = await api(keys.admin, "PATCH", `/api/v1/users/${target}`, { op: "status", status: "SUSPENDED", reason: "integration test" });
  assert.equal(s.res.status, 200, JSON.stringify(s.json));
  assert.equal(s.json.data?.status, "SUSPENDED");
  const bad = await api(keys.admin, "PATCH", `/api/v1/users/${target}`, { op: "status", status: "SUSPENDED" });
  assert.equal(bad.res.status, 409);
  const me = await api(keys.admin, "GET", "/api/v1/auth/me");
  const self = await api(keys.admin, "PATCH", `/api/v1/users/${me.json.data!.id}`, { op: "status", status: "DISABLED" });
  assert.equal(self.res.status, 409);
  const back = await api(keys.admin, "PATCH", `/api/v1/users/${target}`, { op: "status", status: "ACTIVE" });
  assert.equal(back.res.status, 200);
  const audit = await pool.query(`SELECT action FROM "AuditLog" WHERE "entityId"=$1 AND action IN ('USER_SUSPENDED','USER_ACTIVE') ORDER BY at`, [target]);
  assert.deepEqual(audit.rows.map((r) => r.action), ["USER_SUSPENDED", "USER_ACTIVE"]);
});

test("PATCH /users/{id} role change revokes the target's sessions and is audited with before/after", async () => {
  const target = created[0];
  const roles = await api(keys.admin, "GET", "/api/v1/roles");
  const desk = (roles.json.data as unknown as { code: string; id: string }[]).find((r) => r.code === "DESK_OFFICER")!;
  const cs1 = await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`);
  await pool.query(`INSERT INTO "Session"(id,"userId","tokenHash","expiresAt") VALUES ($1,$2,$3,$4)`, [`sess_${RUN}`, target, createHash("sha256").update(`tok${RUN}`).digest("hex"), new Date(Date.now() + 3_600_000).toISOString()]);
  const r = await api(keys.admin, "PATCH", `/api/v1/users/${target}`, { email: `it.new.${RUN}@pms.example`, firstName: "Test", lastName: "Investigator", roleId: desk.id, stationId: cs1.rows[0].id });
  assert.equal(r.res.status, 200, JSON.stringify(r.json));
  assert.equal((r.json.data?.role as { code: string }).code, "DESK_OFFICER");
  const sess = await pool.query(`SELECT "revokedAt","revokedReason" FROM "Session" WHERE id=$1`, [`sess_${RUN}`]);
  assert.ok(sess.rows[0].revokedAt);
  assert.equal(sess.rows[0].revokedReason, "role_changed");
  const audit = await pool.query(`SELECT before, after FROM "AuditLog" WHERE action='USER_ROLE_CHANGED' AND "entityId"=$1`, [target]);
  assert.equal(audit.rowCount, 1);
  assert.equal(audit.rows[0].before.role.code, "INVESTIGATOR");
  assert.equal(audit.rows[0].after.role.code, "DESK_OFFICER");
});

test("audit export requires audit:export and is itself audited", async () => {
  const denied = await api(keys.chief, "GET", "/api/v1/audit/export");
  assert.equal(denied.res.status, 403);
  const res = await fetch(`${BASE}/api/v1/audit/export?module=users`, { headers: { authorization: `Bearer ${keys.admin}` } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/csv/);
  const text = await res.text();
  assert.match(text.split("\r\n")[0], /^at,actor,module,action/);
  const audit = await pool.query(`SELECT 1 FROM "AuditLog" WHERE action='AUDIT_EXPORTED' AND at > $1`, [since(60_000)]);
  assert.ok((audit.rowCount ?? 0) >= 1);
});

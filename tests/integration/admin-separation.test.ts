/**
 * Security audit, lot 1 — separation of technical administration, security administration and police command.
 * Live dev server + seeded database:  npx tsx --test tests/integration/admin-separation.test.ts
 * Uses temporary API keys inserted directly in the database (removed at the end).
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

async function keyFor(username: string): Promise<string> {
  const key = `pms_it${RUN.slice(-4)}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'integration',$3,$4)`, [`apikey_sep_${username}_${RUN}`, u.rows[0].id, `it${RUN.slice(-4)}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function api(key: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as { data?: any; error?: { code: string; message: string } };
  return { res, json };
}

before(async () => {
  for (const u of ["admin", "security.admin", "commander.national"]) keys[u] = await keyFor(u);
});
after(async () => {
  for (const id of createdUsers) await pool.query(`DELETE FROM "User" WHERE id=$1 AND username LIKE 'it.%'`, [id]);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='integration' AND "keyPrefix"=$1`, [`it${RUN.slice(-4)}`]);
  await pool.end();
});

const OPERATIONAL_ROUTES = ["/api/v1/warrants", "/api/v1/wanted", "/api/v1/persons", "/api/v1/cases", "/api/v1/arrests", "/api/v1/detention", "/api/v1/complaints"];

test("the database holds the separated role sets, and the separation was applied once", async () => {
  const perms = async (code: string) => (await pool.query(`SELECT p.code FROM "RolePermission" rp JOIN "Role" r ON r.id=rp."roleId" JOIN "Permission" p ON p.id=rp."permissionId" WHERE r.code=$1`, [code])).rows.map((r) => r.code as string);
  const tech = await perms("SUPER_ADMIN");
  const sec = await perms("SECURITY_ADMIN");
  for (const set of [tech, sec]) {
    const operational = set.filter((c) => !/^(dashboard|org|roles|permissions|security|system|apikeys|users|audit):/.test(c));
    assert.deepEqual(operational, [], "no police permission in an administrator role");
  }
  assert.ok(tech.includes("system:backup") && !tech.includes("audit:view") && !tech.includes("users:create"));
  assert.ok(sec.includes("audit:view") && sec.includes("users:create") && !sec.includes("system:backup"));
  const flag = await pool.query(`SELECT 1 FROM "SystemSetting" WHERE key='rbac.admin_separation_applied'`);
  assert.equal(flag.rowCount, 1);
});

test("neither administrator can read or act on any police record", async () => {
  for (const who of ["admin", "security.admin"]) {
    for (const path of OPERATIONAL_ROUTES) {
      const r = await api(keys[who], "GET", path);
      assert.equal(r.res.status, 403, `${who} must not read ${path} (got ${r.res.status})`);
    }
    const approve = await api(keys[who], "POST", "/api/v1/warrants", { personId: "x", type: "ARREST", issuingAuthority: "x", grounds: "x".repeat(40) });
    assert.equal(approve.res.status, 403, `${who} must not request or approve warrants`);
  }
});

test("the police command keeps its operational reach (the platform cannot be locked out of command)", async () => {
  for (const path of ["/api/v1/warrants", "/api/v1/persons"]) assert.equal((await api(keys["commander.national"], "GET", path)).res.status, 200, path);
});

test("duties are split: the audit log and accounts belong to the security administrator, platform settings to the technical one", async () => {
  assert.equal((await fetch(`${BASE}/api/v1/audit/export?module=users`, { headers: { authorization: `Bearer ${keys["security.admin"]}` } })).status, 200);
  assert.equal((await fetch(`${BASE}/api/v1/audit/export?module=users`, { headers: { authorization: `Bearer ${keys["admin"]}` } })).status, 403);
  assert.equal((await api(keys["security.admin"], "GET", "/api/v1/users?pageSize=1")).res.status, 200);
  assert.equal((await api(keys["admin"], "GET", "/api/v1/users?pageSize=1")).res.status, 403);
  assert.equal((await api(keys["security.admin"], "PUT", "/api/v1/hr/stats/settings", { retirementAge: 60, promotionMinYears: 5 })).res.status, 403, "platform settings are not security administration");
});

test("the security administrator provisions an operational account without holding its permissions; administrator roles stay out of reach", async () => {
  const roles = (await api(keys["security.admin"], "GET", "/api/v1/roles")).json.data as { id: string; code: string }[];
  const inv = roles.find((r) => r.code === "INVESTIGATOR")!;
  const station = await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`);
  const body = (username: string, roleId: string) => ({ username, email: `${username}@pms.example`, firstName: "Test", lastName: "Separation", roleId, stationId: station.rows[0].id, temporaryPassword: "Temp-Password-2026!x" });
  const ok = await api(keys["security.admin"], "POST", "/api/v1/users", body(`it.sep.${RUN}`, inv.id));
  assert.equal(ok.res.status, 201, JSON.stringify(ok.json));
  createdUsers.push(ok.json.data.id);
  const tech = roles.find((r) => r.code === "SUPER_ADMIN")!;
  const refused = await api(keys["security.admin"], "POST", "/api/v1/users", body(`it.sep2.${RUN}`, tech.id));
  assert.ok(refused.res.status >= 400 && refused.res.status < 500, "the technical administrator role cannot be granted by the security administrator");
  const none = await pool.query(`SELECT 1 FROM "User" WHERE username=$1`, [`it.sep2.${RUN}`]);
  assert.equal(none.rowCount, 0, "nothing persisted");
});

test("both administrator roles are locked against edition (service layer, same code path as the role screen)", async () => {
  // The role editor is a server action, not an API route: call the service itself, neutralising the `server-only` guard.
  const Module = (await import("node:module")).default as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
  const orig = Module._resolveFilename;
  Module._resolveFilename = function (request: string, ...rest: unknown[]) {
    return request === "server-only" ? require.resolve("../../scripts/empty.cjs") : orig.call(this, request, ...rest);
  };
  const { setRolePermissions, updateRole } = await import("../../src/server/admin/roles");
  const fakeActor = { id: "x", username: "x", permissions: new Set<string>(["roles:manage", "warrants:approve"]), scopeLevel: "NATIONAL" } as never;
  const ctx = { ip: null, userAgent: null } as never;
  for (const code of ["SUPER_ADMIN", "SECURITY_ADMIN"]) {
    const role = (await pool.query(`SELECT id, name, "scopeLevel" FROM "Role" WHERE code=$1`, [code])).rows[0];
    await assert.rejects(() => setRolePermissions(fakeActor, role.id, ["dashboard:view", "warrants:approve"], ctx), /fixed by the system/);
    await assert.rejects(() => updateRole(fakeActor, role.id, { name: role.name, description: "", scopeLevel: role.scopeLevel, requiresMfa: false } as never, ctx), /fixed by the system/);
  }
  const after = await pool.query(`SELECT count(*)::int n FROM "RolePermission" rp JOIN "Role" r ON r.id=rp."roleId" JOIN "Permission" p ON p.id=rp."permissionId" WHERE r.code IN ('SUPER_ADMIN','SECURITY_ADMIN') AND p.code='warrants:approve'`);
  assert.equal(after.rows[0].n, 0);
});

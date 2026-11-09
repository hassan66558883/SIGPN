/**
 * Security audit, lot 3 — security clearance. Live dev server + seeded database:
 *   npx tsx --test tests/integration/clearance.test.ts
 * Uses temporary API keys and a temporary account (removed at the end).
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
let newUserId = "";
const username = `it.clr.${RUN}`;

async function keyFor(name: string): Promise<string> {
  const key = `pms_it${RUN.slice(-4)}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [name]);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'integration',$3,$4)`, [`apikey_clr_${name}_${RUN}`, u.rows[0].id, `it${RUN.slice(-4)}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function api(key: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as { data?: any; error?: { code: string; message: string } };
  return { res, json };
}
const me = async (k: string) => (await api(k, "GET", "/api/v1/auth/me")).json.data.permissions as string[];

before(async () => {
  for (const u of ["security.admin", "chief.cs1", "analyst", "commander.dept"]) keys[u] = await keyFor(u);
});
after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='integration' AND "keyPrefix"=$1`, [`it${RUN.slice(-4)}`]);
  await pool.query(`UPDATE "Session" SET "revokedAt"=now() WHERE "revokedAt" IS NULL AND "userId"=(SELECT id FROM "User" WHERE username='analyst')`);
  if (newUserId) await pool.query(`DELETE FROM "User" WHERE id=$1 AND username LIKE 'it.%'`, [newUserId]);
  await pool.end();
});

test("the migration kept everybody's access: users whose role holds sensitive permissions were cleared accordingly", async () => {
  const rows = (await pool.query(`SELECT r.code, u.clearance FROM "User" u JOIN "Role" r ON r.id=u."roleId" WHERE u.username IN ('commander.national','chief.cs1','hr.director','inv.diallo','desk.cs1','security.admin','admin')`)).rows;
  const by = Object.fromEntries(rows.map((r) => [r.code, r.clearance]));
  assert.equal(by.NATIONAL_COMMANDER, "CONFIDENTIAL");
  assert.equal(by.STATION_COMMANDER, "CONFIDENTIAL");
  assert.equal(by.HR_DIRECTOR, "SENSITIVE");
  assert.equal(by.SECURITY_ADMIN, "SENSITIVE");
  assert.equal(by.INVESTIGATOR, "STANDARD");
  assert.equal(by.DESK_OFFICER, "STANDARD");
});

test("a new commander starts without clearance: the sensitive permissions are held by the role but unusable, then enabled tier by tier", async () => {
  const roles = (await api(keys["security.admin"], "GET", "/api/v1/roles")).json.data as { id: string; code: string }[];
  const station = (await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`)).rows[0].id;
  const created = await api(keys["security.admin"], "POST", "/api/v1/users", { username, email: `${username}@pms.example`, firstName: "Test", lastName: "Habilitation", roleId: roles.find((r) => r.code === "STATION_COMMANDER")!.id, stationId: station, temporaryPassword: "Temp-Password-2026!x" });
  assert.equal(created.res.status, 202, JSON.stringify(created.json));
  assert.equal(created.json.data.requiredApprovals, 2, "a commander account is sensitive");
  // two approvers from two levels of the chain: the commissaire, then the departmental commander (lot 4)
  await api(keys["chief.cs1"], "POST", `/api/v1/approvals/${created.json.data.id}`, { action: "approve" });
  const executed = await api(keys["commander.dept"], "POST", `/api/v1/approvals/${created.json.data.id}`, { action: "approve" });
  assert.equal(executed.json.data.status, "EXECUTED", JSON.stringify(executed.json));
  newUserId = executed.json.data.resultEntityId;
  assert.equal((await pool.query(`SELECT clearance FROM "User" WHERE id=$1`, [newUserId])).rows[0].clearance, "STANDARD");
  keys.fresh = await keyFor(username);

  const standard = await me(keys.fresh);
  assert.ok(standard.includes("complaints:review") && standard.includes("cases:view"), "ordinary command permissions work");
  for (const p of ["warrants:approve", "detention:extend", "cases:view_sensitive", "documents:view_confidential"]) assert.ok(!standard.includes(p), `${p} is unusable without clearance`);

  const patch = async (clearance: string) => {
    const r = await api(keys["security.admin"], "PATCH", `/api/v1/users/${newUserId}`, { email: `${username}@pms.example`, firstName: "Test", lastName: "Habilitation", roleId: roles.find((r) => r.code === "STATION_COMMANDER")!.id, stationId: station, clearance });
    // raising a clearance is a request that needs two approvals (lot 4); lowering one is immediate
    for (const req of r.json.data?.pendingApprovals ?? []) {
      await api(keys["chief.cs1"], "POST", `/api/v1/approvals/${req.id}`, { action: "approve" });
      await api(keys["commander.dept"], "POST", `/api/v1/approvals/${req.id}`, { action: "approve" });
    }
    return r;
  };
  assert.equal((await patch("SENSITIVE")).res.status, 200);
  const sensitive = await me(keys.fresh);
  assert.ok(sensitive.includes("warrants:approve") && sensitive.includes("cases:view_sensitive"));
  assert.ok(!sensitive.includes("documents:view_confidential"), "confidential documents need the top tier");

  assert.equal((await patch("CONFIDENTIAL")).res.status, 200);
  assert.ok((await me(keys.fresh)).includes("documents:view_confidential"));
  assert.equal((await patch("STANDARD")).res.status, 200);
  assert.ok(!(await me(keys.fresh)).includes("warrants:approve"), "withdrawing the clearance withdraws the permissions at once");
});

test("the clearance gates real records: a sensitive case is invisible to a commander without clearance", async () => {
  const sensitive = (await pool.query(`SELECT c.id FROM "Case" c JOIN "Station" s ON s.id=c."stationId" WHERE c."isSensitive" AND c."deletedAt" IS NULL AND s.code='CS-01' LIMIT 1`)).rows[0];
  assert.ok(sensitive, "the dev data holds a sensitive case at CS-01");
  assert.equal((await api(keys.fresh, "GET", `/api/v1/cases/${sensitive.id}`)).res.status, 404, "no clearance: not found");
  assert.equal((await api(keys["chief.cs1"], "GET", `/api/v1/cases/${sensitive.id}`)).res.status, 200, "a cleared commander reads it");
});

test("only the security administrator grants or changes a clearance, and never one's own; each change is audited", async () => {
  const roles = (await api(keys["security.admin"], "GET", "/api/v1/roles")).json.data as { id: string; code: string }[];
  const station = (await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`)).rows[0].id;
  // a station commander (users:create) cannot hand out a clearance
  const denied = await api(keys["chief.cs1"], "POST", "/api/v1/users", { username: `it.clr2.${RUN}`, email: `it.clr2.${RUN}@pms.example`, firstName: "A", lastName: "B", roleId: roles.find((r) => r.code === "DESK_OFFICER")!.id, stationId: station, temporaryPassword: "Temp-Password-2026!x", clearance: "SENSITIVE" });
  assert.ok(denied.res.status >= 400 && denied.res.status < 500, `refused (${denied.res.status})`);
  assert.equal((await pool.query(`SELECT 1 FROM "User" WHERE username=$1`, [`it.clr2.${RUN}`])).rowCount, 0, "nothing persisted");
  // nor change it on an existing account
  const tryChange = await api(keys["chief.cs1"], "PATCH", `/api/v1/users/${newUserId}`, { email: `${username}@pms.example`, firstName: "Test", lastName: "Habilitation", roleId: roles.find((r) => r.code === "STATION_COMMANDER")!.id, stationId: station, clearance: "CONFIDENTIAL" });
  assert.ok(tryChange.res.status >= 400 && tryChange.res.status < 500);
  assert.equal((await pool.query(`SELECT clearance FROM "User" WHERE id=$1`, [newUserId])).rows[0].clearance, "STANDARD");
  // the security administrator cannot change their own
  const own = (await pool.query(`SELECT u.id, u."roleId", u."stationId", u.email, u."firstName", u."lastName" FROM "User" u WHERE username='security.admin'`)).rows[0];
  const self = await api(keys["security.admin"], "PATCH", `/api/v1/users/${own.id}`, { email: own.email, firstName: own.firstName, lastName: own.lastName, roleId: own.roleId, clearance: "CONFIDENTIAL" });
  assert.ok(self.res.status >= 400 && self.res.status < 500, `own clearance refused (${self.res.status})`);
  // every change was audited
  const audited = (await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='USER_CLEARANCE_CHANGED' AND "entityId"=$1`, [newUserId])).rows[0].n;
  assert.equal(audited, 3);
});

test("multi-factor authentication follows the permissions: the analyst (read-everything role, flag off) must now enrol", async () => {
  const flag = (await pool.query(`SELECT r."requiresMfa" f FROM "Role" r WHERE r.code='ANALYST'`)).rows[0].f;
  assert.equal(flag, false, "the ANALYST role flag is off");
  const res = await fetch(`${BASE}/api/v1/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: "analyst", password: process.env.DEMO_PASSWORD ?? "ChangeMe-Demo-2026!" }) });
  assert.equal(res.status, 200);
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith("pms_session="))!.split(";")[0];
  // The password is right, but the session cannot be used before the second factor is enrolled.
  const next = await fetch(`${BASE}/api/v1/auth/me`, { headers: { cookie } });
  const json = (await next.json()) as { error?: { code: string; message: string } };
  assert.equal(next.status, 403);
  assert.equal(json.error?.code, "SECURITY_STEP_REQUIRED");
  assert.match(json.error?.message ?? "", /Multi-factor/);
});

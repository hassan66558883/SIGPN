/**
 * Phase 1 security tests — run against a live dev server (npm run dev) with the foundation seed loaded.
 *   npx tsx --test tests/security/auth.test.ts
 * Env: PMS_URL (default http://localhost:3300), DEMO_PASSWORD (from .env)
 */
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";

const BASE = process.env.PMS_URL ?? "http://localhost:3300";
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo-Pms-2026!";
const MFA_OFF = ["off", "0", "false", "no"].includes((process.env.MFA_ENFORCEMENT ?? "on").trim().toLowerCase()); // temporary switch: these tests need the second factor enforced
// Pin the session to UTC so raw-SQL time comparisons match the UTC-naive timestamps Prisma writes
// (the embedded dev database otherwise runs in the machine's local timezone).
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: "-c timezone=UTC" });

function cookieOf(res: Response, name: string): string | null {
  const all = res.headers.getSetCookie?.() ?? [];
  for (const c of all) if (c.startsWith(`${name}=`)) return c.split(";")[0];
  return null;
}

async function apiLogin(identifier: string, password = PASSWORD) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });
  return { res, body: (await res.json()) as { data?: Record<string, unknown>; error?: { code: string } }, cookie: cookieOf(res, "pms_session") };
}

async function resetUser(username: string) {
  await pool.query(`UPDATE "User" SET status='ACTIVE', "failedLoginCount"=0, "lockedUntil"=NULL WHERE username=$1`, [username]);
}

// Prisma stores UTC-naive `timestamp` values. node-pg serializes a JS Date with the machine's local
// offset, which PostgreSQL silently drops for timestamp-without-time-zone columns — shifting the
// comparison by the local offset. Passing an ISO string (UTC, "Z") avoids that.
const since = (ms: number) => new Date(Date.now() - ms).toISOString();

test.after(async () => pool.end());

test("health endpoint answers without authentication", async () => {
  const res = await fetch(`${BASE}/api/health`);
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.status, "ok");
});

test("security headers are present", async () => {
  const res = await fetch(`${BASE}/login`, { redirect: "manual" });
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.ok(res.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"));
  assert.ok(res.headers.get("referrer-policy"));
  assert.equal(res.headers.get("x-powered-by"), null);
});

test("unauthenticated page request is redirected to /login", async () => {
  const res = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
  assert.equal(res.status, 307);
  assert.ok(res.headers.get("location")?.includes("/login"));
});

test("unauthenticated API request → 401", async () => {
  const res = await fetch(`${BASE}/api/v1/auth/me`);
  assert.equal(res.status, 401);
  const j = await res.json();
  assert.equal(j.error.code, "UNAUTHENTICATED");
});

test("valid login (no-MFA account) sets httpOnly session cookie and /me works", async () => {
  await resetUser("inv.diallo");
  const { res, body, cookie } = await apiLogin("inv.diallo");
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.equal(body.data?.authenticated, true);
  assert.ok(cookie, "session cookie set");
  const raw = res.headers.getSetCookie().find((c) => c.startsWith("pms_session="))!;
  assert.match(raw, /HttpOnly/i);
  assert.match(raw, /SameSite=lax/i);
  const me = await fetch(`${BASE}/api/v1/auth/me`, { headers: { cookie: cookie! } });
  assert.equal(me.status, 200);
  const j = await me.json();
  assert.equal(j.data.username, "inv.diallo");
  assert.equal(j.data.role.code, "INVESTIGATOR");
  assert.ok(Array.isArray(j.data.permissions));
});

test("invalid password → generic 422 error, no account existence leak", async () => {
  await resetUser("inv.diallo");
  const a = await apiLogin("inv.diallo", "wrong-password-123!");
  const b = await apiLogin("no.such.user", "wrong-password-123!");
  assert.equal(a.res.status, 422);
  assert.equal(b.res.status, 422);
  assert.deepEqual(a.body.error, b.body.error);
  assert.equal(a.cookie, null);
});

test("insufficient permissions → 403 and audited", async () => {
  await resetUser("inv.diallo");
  const { cookie } = await apiLogin("inv.diallo");
  const res = await fetch(`${BASE}/api/v1/users`, { headers: { cookie: cookie! } });
  assert.equal(res.status, 403);
  const j = await res.json();
  assert.equal(j.error.code, "FORBIDDEN");
  const { rows } = await pool.query(`SELECT 1 FROM "AuditLog" WHERE action='ACCESS_DENIED' AND outcome='DENIED' AND "actorLabel" LIKE 'inv.diallo%' AND at > $1`, [since(120_000)]);
  assert.ok(rows.length >= 1, "denied access is audited");
});

test("privilege escalation: investigator cannot change own role via API", async () => {
  await resetUser("inv.diallo");
  const { cookie } = await apiLogin("inv.diallo");
  const me = await (await fetch(`${BASE}/api/v1/auth/me`, { headers: { cookie: cookie! } })).json();
  const adminRole = await pool.query(`SELECT id FROM "Role" WHERE code='SUPER_ADMIN'`);
  const res = await fetch(`${BASE}/api/v1/users/${me.data.id}`, {
    method: "PATCH",
    headers: { cookie: cookie!, "content-type": "application/json", "x-requested-with": "PMS" },
    body: JSON.stringify({ email: "inv.diallo@pms.example", firstName: "Fatou", lastName: "Diallo", roleId: adminRole.rows[0].id }),
  });
  assert.equal(res.status, 403);
  const check = await pool.query(`SELECT r.code FROM "User" u JOIN "Role" r ON r.id=u."roleId" WHERE u.username='inv.diallo'`);
  assert.equal(check.rows[0].code, "INVESTIGATOR");
});

test("CSRF: cookie-authenticated mutation without X-Requested-With header → 403", async () => {
  await resetUser("inv.diallo");
  const { cookie } = await apiLogin("inv.diallo");
  const res = await fetch(`${BASE}/api/v1/auth/logout`, { method: "POST", headers: { cookie: cookie! } });
  assert.equal(res.status, 403);
  const j = await res.json();
  assert.equal(j.error.code, "CSRF");
});

test("logout revokes the session: cookie no longer works", async () => {
  await resetUser("inv.diallo");
  const { cookie } = await apiLogin("inv.diallo");
  const out = await fetch(`${BASE}/api/v1/auth/logout`, { method: "POST", headers: { cookie: cookie!, "x-requested-with": "PMS" } });
  assert.equal(out.status, 200);
  const me = await fetch(`${BASE}/api/v1/auth/me`, { headers: { cookie: cookie! } });
  assert.equal(me.status, 401);
});

test("expired session is rejected (absolute expiry in the past)", async () => {
  await resetUser("inv.diallo");
  const { cookie } = await apiLogin("inv.diallo");
  const token = cookie!.split("=")[1];
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256").update(token).digest("hex");
  await pool.query(`UPDATE "Session" SET "expiresAt" = $2 WHERE "tokenHash"=$1`, [hash, since(60_000)]);
  const me = await fetch(`${BASE}/api/v1/auth/me`, { headers: { cookie: cookie! } });
  assert.equal(me.status, 401);
});

test("brute force: account locks after configured failures and login is rejected even with the right password", async () => {
  await resetUser("desk.cs1");
  const max = Number(process.env.LOGIN_MAX_FAILURES ?? 5);
  for (let i = 0; i < max; i++) {
    const r = await apiLogin("desk.cs1", `bad-password-${i}!`);
    assert.equal(r.res.status, 422);
  }
  const u = await pool.query(`SELECT status, "lockedUntil" FROM "User" WHERE username='desk.cs1'`);
  assert.equal(u.rows[0].status, "LOCKED");
  assert.ok(u.rows[0].lockedUntil);
  const good = await apiLogin("desk.cs1");
  assert.equal(good.res.status, 422);
  assert.equal(good.cookie, null);
  const audit = await pool.query(`SELECT 1 FROM "AuditLog" WHERE action='ACCOUNT_LOCKED' AND "entityLabel"='desk.cs1' AND at > $1`, [since(120_000)]);
  assert.ok(audit.rows.length >= 1);
  await resetUser("desk.cs1");
});

test("MFA-required role without enrolment: API refuses until security step completed", { skip: MFA_OFF ? "MFA_ENFORCEMENT=off (temporary setting)" : false }, async () => {
  // Fixture: a privileged (MFA-required) demo account that has NOT enrolled an authenticator yet.
  let pick = await pool.query(`SELECT u.username FROM "User" u JOIN "Role" r ON r.id=u."roleId" WHERE r."requiresMfa" AND NOT u."mfaEnabled" AND u.username <> 'admin' ORDER BY u.username LIMIT 1`);
  if (pick.rowCount === 0) {
    await pool.query(`UPDATE "User" SET "mfaEnabled"=false, "mfaSecretEnc"=NULL, "mfaEnrolledAt"=NULL WHERE username='commander.national'`);
    pick = await pool.query(`SELECT 'commander.national' AS username`);
  }
  const username = pick.rows[0].username as string;
  await resetUser(username);
  const { res, cookie } = await apiLogin(username);
  assert.equal(res.status, 200);
  assert.ok(cookie, "password-only login of a not-yet-enrolled account still yields a session");
  const me = await fetch(`${BASE}/api/v1/auth/me`, { headers: { cookie: cookie! } });
  assert.equal(me.status, 403);
  const j = await me.json();
  assert.equal(j.error.code, "SECURITY_STEP_REQUIRED");
});

test("API key: Bearer token authenticates with the owner's permissions and is CSRF-exempt", async () => {
  await resetUser("inv.diallo");
  const { randomBytes, createHash } = await import("node:crypto");
  const key = `pms_test0001_${randomBytes(32).toString("base64url")}`;
  const user = await pool.query(`SELECT id FROM "User" WHERE username='inv.diallo'`);
  await pool.query(`INSERT INTO "ApiKey"(id, "userId", name, "keyPrefix", "keyHash") VALUES ($1,$2,'test','test0001',$3) ON CONFLICT DO NOTHING`, [`apikey_${Date.now()}`, user.rows[0].id, createHash("sha256").update(key).digest("hex")]);
  const me = await fetch(`${BASE}/api/v1/auth/me`, { headers: { authorization: `Bearer ${key}` } });
  assert.equal(me.status, 200);
  const j = await me.json();
  assert.equal(j.data.authMethod, "api_key");
  const forbidden = await fetch(`${BASE}/api/v1/users`, { headers: { authorization: `Bearer ${key}` } });
  assert.equal(forbidden.status, 403);
  const bad = await fetch(`${BASE}/api/v1/auth/me`, { headers: { authorization: `Bearer pms_test0001_${randomBytes(32).toString("base64url")}` } });
  assert.equal(bad.status, 401);
  await pool.query(`DELETE FROM "ApiKey" WHERE "keyPrefix"='test0001'`);
});

test("login attempts are recorded and audited", async () => {
  const { rows } = await pool.query(`SELECT count(*)::int AS n FROM "LoginAttempt" WHERE "createdAt" > $1`, [since(180_000)]);
  assert.ok(rows[0].n >= 5);
  const audit = await pool.query(`SELECT count(*)::int AS n FROM "AuditLog" WHERE action IN ('LOGIN','LOGIN_FAILED','LOGOUT') AND at > $1`, [since(180_000)]);
  assert.ok(audit.rows[0].n >= 5);
});

test("malicious input: SQL-injection-shaped identifier is handled safely", async () => {
  const r = await apiLogin(`' OR 1=1; --`, "x");
  assert.equal(r.res.status, 422);
  const r2 = await fetch(`${BASE}/api/v1/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: "not json" });
  assert.equal(r2.status, 422);
  const r3 = await fetch(`${BASE}/api/v1/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: "", password: "" }) });
  assert.equal(r3.status, 422);
});

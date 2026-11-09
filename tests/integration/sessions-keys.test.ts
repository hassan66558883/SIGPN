/**
 * Security audit, lot 7 — sessions of sensitive accounts and API keys. Live dev server + seeded database:
 *   npx tsx --test tests/integration/sessions-keys.test.ts
 * Signs in with the demonstration password (accounts without an enrolled second factor only reach the pending state, which is
 * enough here), uses temporary API keys inserted in the database, and revokes every session and key it created.
 */
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";

const BASE = process.env.PMS_URL ?? "http://localhost:3300";
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo-Pms-2026!";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: "-c timezone=UTC" });
const RUN = Date.now().toString(36);
const insertedKeys: string[] = [];
const touchedUsers = new Set<string>();

async function login(username: string) {
  touchedUsers.add(username);
  const res = await fetch(`${BASE}/api/v1/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: username, password: PASSWORD }) });
  assert.equal(res.status, 200, `login ${username}: ${await res.clone().text()}`);
  return res.headers.getSetCookie().find((c) => c.startsWith("pms_session="))!.split(";")[0];
}
const me = (cookie: string) => fetch(`${BASE}/api/v1/auth/me`, { headers: { cookie } });
const sessionOf = async (cookie: string) => (await pool.query(`SELECT id, "revokedReason", "revokedAt", sensitive FROM "Session" WHERE "tokenHash"=$1`, [createHash("sha256").update(cookie.split("=")[1]).digest("hex")])).rows[0];
const idle = (id: string, minutes: number) => pool.query(`UPDATE "Session" SET "lastSeenAt" = now() - ($2 || ' minutes')::interval WHERE id=$1`, [id, String(minutes)]);

/** An API key inserted directly: `noSensitive` as the application creates them (true) or the legacy default (false). */
async function key(username: string, opts: { noSensitive?: boolean; ageDays?: number; expiresInDays?: number | null } = {}) {
  const secret = `pms_k${RUN.slice(-5)}_${randomBytes(32).toString("base64url")}`;
  const u = (await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username])).rows[0].id;
  const id = `apikey_s7_${randomBytes(6).toString("hex")}`;
  await pool.query(
    `INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash","noSensitive","createdAt","expiresAt") VALUES ($1,$2,'integration',$3,$4,$5, now() - ($6 || ' days')::interval, ${opts.expiresInDays === null || opts.expiresInDays === undefined ? "NULL" : "now() + ($7 || ' days')::interval"})`,
    opts.expiresInDays === null || opts.expiresInDays === undefined ? [id, u, `k${RUN.slice(-5)}`, createHash("sha256").update(secret).digest("hex"), !!opts.noSensitive, String(opts.ageDays ?? 0)] : [id, u, `k${RUN.slice(-5)}`, createHash("sha256").update(secret).digest("hex"), !!opts.noSensitive, String(opts.ageDays ?? 0), String(opts.expiresInDays)],
  );
  insertedKeys.push(id);
  return { id, secret };
}
const withKey = (secret: string, path: string, init: RequestInit = {}) => fetch(`${BASE}${path}`, { ...init, headers: { authorization: `Bearer ${secret}`, "content-type": "application/json", ...(init.headers ?? {}) } });

after(async () => {
  for (const u of touchedUsers) await pool.query(`UPDATE "Session" SET "revokedAt"=now(), "revokedReason"='test_cleanup' WHERE "revokedAt" IS NULL AND "userId"=(SELECT id FROM "User" WHERE username=$1)`, [u]);
  await pool.query(`DELETE FROM "ApiKey" WHERE id = ANY($1) OR ("keyPrefix"=$2)`, [insertedKeys, `k${RUN.slice(-5)}`]);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='Clé de test lot 7' AND "userId"=(SELECT id FROM "User" WHERE username='inv.diallo')`);
  await pool.end();
});

test("a sensitive account has ONE active session: signing in again ends the previous one", async () => {
  const first = await login("chief.cs1");
  const a = await sessionOf(first);
  assert.equal(a.sensitive, true, "the session is flagged sensitive");
  assert.equal(a.revokedAt, null);
  const second = await login("chief.cs1");
  const b = await sessionOf(second);
  assert.equal(b.revokedAt, null);
  assert.equal((await sessionOf(first)).revokedReason, "single_session", "the first session was ended");
  assert.equal((await me(first)).status, 401);
  assert.notEqual((await me(second)).status, 401, "the new one is alive (403 = second factor still to enrol)");
  const audit = (await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='SESSION_REPLACED' AND "entityLabel"='chief.cs1' AND "at" > now() - interval '1 minute'`)).rows[0].n;
  assert.ok(audit >= 1, "the replacement is audited");
});

test("an ordinary account may keep several sessions", async () => {
  const first = await login("inv.diallo");
  const second = await login("inv.diallo");
  assert.equal((await sessionOf(first)).sensitive, false);
  assert.equal((await sessionOf(first)).revokedAt, null);
  assert.equal((await me(first)).status, 200);
  assert.equal((await me(second)).status, 200);
});

test("idle timeout: 15 minutes for a sensitive account, 60 for an ordinary one", async () => {
  const sens = await login("chief.cs1");
  await idle((await sessionOf(sens)).id, 10);
  assert.notEqual((await me(sens)).status, 401, "10 minutes idle: still alive");
  await idle((await sessionOf(sens)).id, 20);
  assert.equal((await me(sens)).status, 401, "20 minutes idle: expired");
  assert.equal((await sessionOf(sens)).revokedReason, "idle_timeout");

  const ord = await login("inv.diallo");
  await idle((await sessionOf(ord)).id, 20);
  assert.equal((await me(ord)).status, 200, "20 minutes idle: an ordinary session is still alive");
  await idle((await sessionOf(ord)).id, 70);
  assert.equal((await me(ord)).status, 401, "70 minutes idle: expired");
});

test("a key created by the application carries no sensitive permission and cannot reach sensitive routes; a legacy key still can", async () => {
  const restricted = await key("security.admin", { noSensitive: true, expiresInDays: 30 });
  const legacy = await key("security.admin");
  const perms = async (k: string) => ((await (await withKey(k, "/api/v1/auth/me")).json()) as { data: { permissions: string[] } }).data.permissions;
  const r = await perms(restricted.secret);
  const l = await perms(legacy.secret);
  for (const p of ["audit:export", "approvals:decide", "roles:manage", "warrants:approve", "cases:view_sensitive"]) assert.ok(!r.includes(p), `a restricted key does not carry ${p}`);
  assert.ok(r.includes("audit:view") && r.includes("security:manage") && r.includes("users:create"), "its ordinary permissions remain");
  assert.ok(l.includes("audit:export"), "a legacy key is unchanged");
  assert.equal((await withKey(restricted.secret, "/api/v1/audit/export?module=users")).status, 403, "the export is refused to a restricted key");
  assert.equal((await withKey(legacy.secret, "/api/v1/audit/export?module=users")).status, 200);

  const cmd = await key("commander.national", { noSensitive: true, expiresInDays: 30 });
  const c = await perms(cmd.secret);
  assert.ok(!c.includes("approvals:decide") && !c.includes("warrants:approve") && !c.includes("detention:extend"), "a commander's key can never approve anything");
  assert.ok(c.includes("warrants:view") && c.includes("persons:view"), "but it still reads");
});

test("rotation: no key outlives 90 days, whatever its own expiry says; an expired key is refused", async () => {
  const fresh = await key("inv.diallo", { ageDays: 89, expiresInDays: 365 });
  const old = await key("inv.diallo", { ageDays: 91, expiresInDays: 365 });
  const legacy = await key("inv.diallo", { ageDays: 200 }); // a legacy key without any expiry
  const expired = await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash","expiresAt") SELECT $1, id, 'integration', $2, $3, now() - interval '1 day' FROM "User" WHERE username='inv.diallo'`, [`apikey_s7_exp_${RUN}`, `k${RUN.slice(-5)}`, createHash("sha256").update(`pms_expired_${RUN}_${"x".repeat(40)}`).digest("hex")]);
  insertedKeys.push(`apikey_s7_exp_${RUN}`);
  assert.equal(expired.rowCount, 1);
  assert.equal((await withKey(fresh.secret, "/api/v1/auth/me")).status, 200, "89 days old: still valid");
  assert.equal((await withKey(old.secret, "/api/v1/auth/me")).status, 401, "91 days old: refused");
  assert.equal((await withKey(legacy.secret, "/api/v1/auth/me")).status, 401, "200 days old without expiry: refused");
  assert.equal((await withKey(`pms_expired_${RUN}_${"x".repeat(40)}`, "/api/v1/auth/me")).status, 401, "past its own expiry: refused");
});

test("the application refuses a key without expiry or beyond 90 days, and creates restricted keys that expire", async () => {
  const Module = (await import("node:module")).default as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
  const orig = Module._resolveFilename;
  Module._resolveFilename = function (request: string, ...rest: unknown[]) {
    return request === "server-only" ? require.resolve("../../scripts/empty.cjs") : orig.call(this, request, ...rest);
  };
  const { createApiKey } = await import("../../src/server/auth/login");
  const { loadUserRow, buildActor } = await import("../../src/server/auth/dal");
  const { prisma } = await import("../../src/server/db");
  const row = await loadUserRow((await pool.query(`SELECT id FROM "User" WHERE username='inv.diallo'`)).rows[0].id);
  const actor = (await buildActor(row!, { id: null, mfaVerified: true }, "api_key"))!;
  const ctx = { ip: null, userAgent: null };
  for (const bad of [null, 0, -1, 91, 365, Number.NaN]) await assert.rejects(() => createApiKey(actor, "Clé de test lot 7", bad as number, ctx), /must expire/, `refused: ${bad}`);

  const secret = await createApiKey(actor, "Clé de test lot 7", 30, ctx);
  const stored = (await pool.query(`SELECT "noSensitive", "expiresAt", "createdAt" FROM "ApiKey" WHERE "keyHash"=$1`, [createHash("sha256").update(secret).digest("hex")])).rows[0];
  assert.equal(stored.noSensitive, true, "created restricted");
  const days = (new Date(stored.expiresAt).getTime() - new Date(stored.createdAt).getTime()) / 86_400_000;
  assert.ok(days > 29.9 && days < 30.1, `expires in 30 days (${days})`);
  assert.equal((await withKey(secret, "/api/v1/auth/me")).status, 200);
  await prisma.$disconnect();
});

test("the security administrator sees every active key (never a secret) and can revoke any of them", async () => {
  const sec = await key("security.admin");
  const victim = await key("inv.diallo", { noSensitive: true, expiresInDays: 60 });
  const list = await withKey(sec.secret, "/api/v1/security/api-keys");
  assert.equal(list.status, 200);
  const rows = ((await list.json()) as { data: { id: string; keyPrefix: string; user: { username: string } }[] }).data;
  const mine = rows.find((r) => r.id === victim.id);
  assert.ok(mine, "another user's key is listed");
  assert.equal(mine!.user.username, "inv.diallo");
  assert.ok(!JSON.stringify(rows).includes("keyHash") && !JSON.stringify(rows).includes(victim.secret), "no secret leaves the service");

  const desk = await key("desk.cs1");
  assert.equal((await withKey(desk.secret, "/api/v1/security/api-keys")).status, 403, "an ordinary user cannot list them");
  assert.equal((await withKey(desk.secret, `/api/v1/security/api-keys/${victim.id}`, { method: "DELETE" })).status, 403, "nor revoke them");
  assert.equal((await withKey(victim.secret, "/api/v1/auth/me")).status, 200);

  assert.equal((await withKey(sec.secret, `/api/v1/security/api-keys/${victim.id}`, { method: "DELETE" })).status, 200);
  assert.equal((await withKey(victim.secret, "/api/v1/auth/me")).status, 401, "the revoked key no longer works");
  const audit = (await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='API_KEY_REVOKED_BY_ADMIN' AND "entityId"=$1`, [victim.id])).rows[0].n;
  assert.equal(audit, 1);
  assert.equal((await withKey(sec.secret, `/api/v1/security/api-keys/${victim.id}`, { method: "DELETE" })).status, 409, "an already revoked key is refused");
});

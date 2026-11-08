/**
 * Phase 8 — rights matrix over EVERY REST route (live dev server + seeded database).
 *   npx tsx --test tests/security/route-matrix.test.ts
 * The matrix is derived from the source (each exported handler and its declared permission), so a route added later
 * without protection fails here. For each protected handler:
 *   - no credentials               -> 401
 *   - a user WITHOUT the permission -> 403
 *   - a user WITH the permission    -> anything but 401/403 (the request is dummy, so 404/422 are expected)
 * Public handlers are only checked to never answer 401/403 for a plain read and to carry no Set-Cookie.
 * Only requests that cannot create data are sent to permitted users (dummy ids, empty bodies).
 */
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";

const BASE = process.env.PMS_URL ?? "http://localhost:3300";
const ROOT = join(process.cwd(), "src", "app", "api");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const RUN = Date.now().toString(36).slice(-5);

type Handler = { method: string; path: string; permission: string | null; isPublic: boolean; file: string; wrapped: boolean };

function walk(dir: string, out: string[] = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (n === "route.ts") out.push(p);
  }
  return out;
}

function discover(): Handler[] {
  const found: Handler[] = [];
  for (const file of walk(ROOT)) {
    const src = readFileSync(file, "utf8");
    const url = "/api/" + relative(ROOT, file).split(sep).slice(0, -1).join("/").replace(/\[[^\]]+\]/g, "00000000-dummy");
    const re = /export const (GET|POST|PUT|PATCH|DELETE)\s*=\s*withApi(?:<[^>]*>)?\(\s*\{([^}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const perm = /permission:\s*"([^"]+)"/.exec(m[2]);
      found.push({ method: m[1], path: url, permission: perm ? perm[1] : null, isPublic: /public:\s*true/.test(m[2]), file, wrapped: true });
    }
    // Any exported handler that does NOT go through withApi must be a conscious exception, listed here.
    const raw = [...src.matchAll(/export (?:async function|const) (GET|POST|PUT|PATCH|DELETE)\b/g)].map((x) => x[1]);
    const wrapped = new Set(found.filter((f) => f.path === url).map((f) => f.method));
    for (const m2 of raw) if (!wrapped.has(m2)) found.push({ method: m2, path: url, permission: null, isPublic: false, file, wrapped: false });
  }
  return found;
}

const handlers = discover();
/** Handlers that legitimately do not use withApi (they authenticate by other means). */
const UNWRAPPED_OK = new Set(["POST /api/auth/login", "POST /api/v1/auth/login", "POST /api/v1/auth/logout", "GET /api/health"]);

const keys = new Map<string, string>();
async function keyFor(userId: string, tag: string) {
  const key = `pms_rm${RUN}_${randomBytes(32).toString("base64url")}`;
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'rm-test',$3,$4)`, [`apikey_rm_${tag}_${RUN}`, userId, `rm${RUN}`, createHash("sha256").update(key).digest("hex")]);
  keys.set(tag, key);
  return key;
}
async function permsOf(key: string): Promise<Set<string>> {
  const r = await fetch(`${BASE}/api/v1/auth/me`, { headers: { authorization: `Bearer ${key}` } });
  const j = (await r.json()) as { data?: { permissions: string[] } };
  return new Set(j.data?.permissions ?? []);
}
const actors: { name: string; key: string; perms: Set<string> }[] = [];

before(async () => {
  // Every active demo user gets a key; the matrix then picks, per permission, one holder and one non-holder.
  const users = await pool.query(`SELECT id, username FROM "User" WHERE status='ACTIVE' AND username NOT LIKE 'ui.%' ORDER BY username LIMIT 60`);
  for (const u of users.rows) {
    const key = await keyFor(u.id, u.username);
    const perms = await permsOf(key);
    if (perms.size) actors.push({ name: u.username, key, perms });
  }
  assert.ok(actors.length >= 5, "seeded demo users expected");
});
after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='rm-test' AND "keyPrefix"=$1`, [`rm${RUN}`]);
  await pool.end();
});

async function call(key: string | null, h: Handler, safeBody = true) {
  const init: RequestInit = { method: h.method, headers: { ...(key ? { authorization: `Bearer ${key}` } : {}), "content-type": "application/json" } };
  if (h.method !== "GET" && safeBody) init.body = "{}"; // an empty object never validates, so nothing is written
  // The write bucket (60/min) is itself a control; when the matrix trips it, wait out the window rather than weaken it.
  for (let i = 0; ; i++) {
    const res = await fetch(`${BASE}${h.path}`, init);
    if (res.status !== 429 || i >= 3) return res;
    await res.arrayBuffer();
    await new Promise((ok) => setTimeout(ok, Math.min(65, Number(res.headers.get("retry-after") ?? 30)) * 1000));
  }
}

test("the matrix covers the whole API (sanity)", () => {
  assert.ok(handlers.length > 120, `only ${handlers.length} handlers discovered`);
  const protectedCount = handlers.filter((h) => h.permission).length;
  assert.ok(protectedCount > 100, `only ${protectedCount} permissioned handlers`);
});

test("every handler is either public on purpose, permissioned, or an authenticated-only route; nothing is silently open", () => {
  const unguarded = handlers.filter((h) => !h.permission && !h.isPublic && !UNWRAPPED_OK.has(`${h.method} ${h.path}`));
  // Authenticated-only routes (withApi({}) — e.g. /auth/me) are allowed, raw exports are not.
  const raw = unguarded.filter((h) => !h.wrapped);
  assert.deepEqual(raw.map((h) => `${h.method} ${h.path}`), [], "handlers outside withApi must be listed in UNWRAPPED_OK");
});

test("no credentials: every non-public handler answers 401", async () => {
  const bad: string[] = [];
  for (const h of handlers.filter((x) => !x.isPublic && !UNWRAPPED_OK.has(`${x.method} ${x.path}`))) {
    const r = await call(null, h);
    if (r.status !== 401) bad.push(`${h.method} ${h.path} -> ${r.status}`);
    await r.arrayBuffer();
  }
  assert.deepEqual(bad, []);
});

test("an invalid or forged bearer key is refused like no credentials", async () => {
  const h = handlers.find((x) => x.permission === "alerts:view" && x.method === "GET")!;
  for (const k of ["pms_garbage", `pms_rm${RUN}_${"A".repeat(43)}`, "Bearer", ""]) {
    const r = await fetch(`${BASE}${h.path}`, { headers: { authorization: `Bearer ${k}` } });
    assert.equal(r.status, 401, k);
    await r.arrayBuffer();
  }
});

test("a user without the permission is refused (403) on every permissioned handler", async () => {
  const bad: string[] = [];
  let checked = 0;
  for (const h of handlers.filter((x) => x.permission)) {
    const without = actors.find((a) => !a.perms.has(h.permission!));
    if (!without) continue; // everybody holds it (not expected for sensitive permissions)
    const r = await call(without.key, h);
    checked++;
    if (r.status !== 403) bad.push(`${h.method} ${h.path} [${h.permission}] as ${without.name} -> ${r.status}`);
    await r.arrayBuffer();
  }
  assert.ok(checked > 80, `only ${checked} deny checks ran`);
  assert.deepEqual(bad, []);
});

test("a holder of the permission is NOT refused on safe requests (the permission, not a blanket deny, is what gates)", async () => {
  const bad: string[] = [];
  for (const h of handlers.filter((x) => x.permission && x.method === "GET")) {
    const holder = actors.find((a) => a.perms.has(h.permission!));
    if (!holder) continue;
    const r = await call(holder.key, h);
    if (r.status === 401 || r.status === 403 || r.status >= 500) bad.push(`${h.method} ${h.path} [${h.permission}] as ${holder.name} -> ${r.status}`);
    await r.arrayBuffer();
  }
  assert.deepEqual(bad, []);
});

test("sensitive permissions of the SIGPN-T modernisation are held by few roles (no over-grant)", () => {
  const sensitive = ["wanted:publish", "wanted:verify", "alerts:supervise", "alerts:simulate", "biometric:control", "intake:manage", "public:content"];
  for (const p of sensitive) {
    const holders = actors.filter((a) => a.perms.has(p));
    const non = actors.filter((a) => !a.perms.has(p));
    assert.ok(holders.length >= 1, `${p}: nobody holds it (feature unusable)`);
    assert.ok(non.length >= holders.length / 2, `${p}: held by ${holders.length}/${actors.length} users — too wide`);
  }
});

test("public handlers: plain reads answer, set no cookie, and expose no internal field name", async () => {
  const FORBIDDEN = /"(passwordHash|codeHash|ipHash|internalReason|createdById|issuedById|approvedById|verifiedById|nationalId|phone|photo)"/;
  for (const h of handlers.filter((x) => x.isPublic && x.method === "GET" && !x.path.includes("verify"))) {
    const r = await fetch(`${BASE}${h.path}`);
    assert.ok([200, 404].includes(r.status), `${h.path} -> ${r.status}`);
    assert.equal(r.headers.get("set-cookie"), null, `${h.path} sets a cookie`);
    const text = await r.text();
    assert.ok(!FORBIDDEN.test(text), `${h.path} leaks an internal field`);
  }
});

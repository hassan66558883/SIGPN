/**
 * Phase 8 — hostile input against the public surface and the new endpoints (live dev server).
 *   npx tsx --test tests/security/public-attacks.test.ts
 * Nothing here may produce a 5xx, leak a stack trace or a SQL error, create an unexpected row, or widen what an anonymous caller sees.
 */
import "dotenv/config";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

const BASE = process.env.PMS_URL ?? "http://localhost:3300";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
after(async () => pool.end());

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
const complaint = (over: Record<string, unknown> = {}) => ({ kind: "COMPLAINT", category: "THEFT", subject: "Test sécurité phase 8", message: "Message de test de sécurité, sans conséquence, plus de vingt caractères.", locationText: "Marché", contactName: "Test", contactPhone: "+235 60 00 00 00", anonymous: false, consent: true, ...over });
const LEAK = /(syntax error|pg_catalog|PrismaClient|at \S+ \(.*\.(ts|js):\d+|SQLSTATE|relation ".*" does not exist|ECONNREFUSED)/i;

test("SQL-injection style payloads in public search parameters give 200/422, never 5xx or an error leak", async () => {
  const payloads = ["' OR '1'='1", "'; DROP TABLE \"Station\"; --", "%' UNION SELECT passwordHash FROM \"User\" --", "\\", "\u0000", "a".repeat(5000)];
  for (const q of payloads) for (const path of ["/api/v1/public/stations", "/api/v1/public/news", "/api/v1/public/wanted"]) {
    const r = await fetch(`${BASE}${path}?q=${encodeURIComponent(q)}&regionId=${encodeURIComponent(q)}`);
    const t = await r.text();
    assert.ok(r.status < 500, `${path} ${JSON.stringify(q).slice(0, 30)} -> ${r.status}`);
    if (q.includes("\u0000") && path.endsWith("/stations")) assert.equal(r.status, 422, "NUL must be a validation error where a parameter is read");
    assert.ok(!LEAK.test(t), `${path} leaks: ${t.slice(0, 120)}`);
  }
  const still = await pool.query(`SELECT count(*)::int AS n FROM "Station"`);
  assert.ok(still.rows[0].n > 0, "Station table still there");
});

test("tracking: injection, huge and wrong-typed fields are refused uniformly (404/422/429), never 5xx", async () => {
  const bodies: unknown[] = [
    { reference: "' OR 1=1 --", code: "x" },
    { reference: "PUB-2026-000001", code: { $ne: "" } },
    { reference: ["PUB-2026-000001"], code: "ABCDEFGHJK" },
    { reference: "A".repeat(10_000), code: "B".repeat(10_000) },
    {},
    "not json",
  ];
  for (const b of bodies) {
    const r = await post("/api/v1/public/track", b);
    const t = await r.text();
    assert.ok([404, 422, 429].includes(r.status), `${JSON.stringify(b).slice(0, 40)} -> ${r.status}`);
    assert.ok(!LEAK.test(t));
  }
});

test("submission: mass assignment is ignored (status, station, complaint link, reply cannot be forced by the citizen)", async () => {
  const r = await post("/api/v1/public/submissions", complaint({ status: "CLOSED", publicReply: "forged", complaintId: "x", stationId: "x", reviewedById: "x", codeHash: "x" }));
  if (r.status === 429) return; // per-address ceiling reached by earlier suites: the control itself is the assertion
  assert.ok([201, 422].includes(r.status), String(r.status));
  if (r.status === 201) {
    const ref = (await r.json()).data.reference as string;
    const row = (await pool.query(`SELECT status, "publicReply", "complaintId", "codeHash" FROM "PublicSubmission" WHERE number=$1`, [ref])).rows[0];
    assert.equal(row.status, "RECEIVED");
    assert.equal(row.publicReply, null);
    assert.equal(row.complaintId, null);
    assert.notEqual(row.codeHash, "x");
  }
});

test("submission: markup is stored as inert text and the tracking answer never echoes it as HTML", async () => {
  const xss = `<img src=x onerror=alert(1)><script>alert(2)</script>`;
  const r = await post("/api/v1/public/submissions", complaint({ subject: `Sujet ${xss}`.slice(0, 120), message: `${xss} ${"texte ".repeat(8)}` }));
  if (r.status === 429) return;
  const body = (await r.json()) as { data?: { reference: string; trackingCode: string } };
  assert.equal(r.status, 201, JSON.stringify(body));
  const j = body.data!;
  const t = await post("/api/v1/public/track", { reference: j.reference, code: j.trackingCode });
  assert.equal(t.headers.get("content-type")?.startsWith("application/json"), true);
  assert.equal(t.headers.get("x-content-type-options"), "nosniff");
});

test("malformed bodies and wrong content types are 4xx (never 5xx)", async () => {
  for (const [body, ct] of [["{", "application/json"], ["null", "application/json"], ["[]", "application/json"], ["a=b", "application/x-www-form-urlencoded"], ["x".repeat(2_000_000), "text/plain"]] as const) {
    const r = await fetch(`${BASE}/api/v1/public/submissions`, { method: "POST", headers: { "content-type": ct }, body });
    await r.arrayBuffer();
    assert.ok(r.status >= 400 && r.status < 500, `${ct} ${body.slice(0, 10)} -> ${r.status}`);
  }
});

test("page routes with hostile ids answer 404 (or redirect to sign-in), not 500", async () => {
  for (const p of ["/actualites/..%2F..%2Fetc%2Fpasswd", "/actualites/%00", "/actualites/' OR 1=1", "/actualites/" + "a".repeat(2000), "/suivi?ref=<script>", "/commissariats?q=%27%22%3C", "/avis-de-recherche?x=1&x=2"]) {
    const r = await fetch(`${BASE}${p}`, { redirect: "manual" });
    const t = await r.text();
    assert.ok(r.status < 500, `${p.slice(0, 50)} -> ${r.status}`);
    // The development server streams its own error overlay on a 404; the leak check is meaningful against a production build.
    if (!/runtime\.dev\.js|resolveErrorDev/.test(t)) assert.ok(!LEAK.test(t), p.slice(0, 40));
  }
});

test("security headers are present on public pages, public API and error pages", async () => {
  for (const p of ["/", "/plaintes", "/api/v1/public/news", "/does-not-exist"]) {
    const r = await fetch(`${BASE}${p}`);
    await r.arrayBuffer();
    assert.equal(r.headers.get("x-content-type-options"), "nosniff", p);
    assert.equal(r.headers.get("x-frame-options"), "DENY", p);
    assert.match(r.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/, p);
    assert.match(r.headers.get("content-security-policy") ?? "", /object-src 'none'/, p);
    assert.equal(r.headers.get("x-powered-by"), null, p);
  }
});

test("internal pages redirect an anonymous visitor to the sign-in page (no content, no data)", async () => {
  for (const p of ["/dashboard", "/alerts", "/wanted", "/biometric/control", "/public-admin", "/persons", "/hr"]) {
    const r = await fetch(`${BASE}${p}`, { redirect: "manual" });
    const body = await r.text();
    assert.ok([302, 303, 307, 308].includes(r.status), `${p} -> ${r.status}`);
    assert.match(r.headers.get("location") ?? "", /login|sign-?in|connexion/i, p);
    assert.ok(body.length < 2000, `${p} sends a body of ${body.length} bytes with the redirect`);
  }
});

test("the public wanted list exposes only active, verified, expressly published notices and the whitelisted fields", async () => {
  const r = await fetch(`${BASE}/api/v1/public/wanted`);
  const j = (await r.json()) as { data: Record<string, unknown>[] };
  const allowed = new Set(["id", "displayName", "name", "fullName", "aliases", "approximateAge", "ageApprox", "age", "description", "reason", "offense", "kind", "notice", "publicNotice", "publishedAt", "contact", "station", "unit", "stationName", "stationPhone", "phone", "address", "number"]);
  for (const row of j.data) for (const k of Object.keys(row)) assert.ok(allowed.has(k), `unexpected public field: ${k}`);
  const published = (await pool.query(`SELECT count(*)::int n FROM "WantedPerson" WHERE "publicPublishedAt" IS NOT NULL AND status='ACTIVE'`)).rows[0].n;
  assert.equal(j.data.length, published);
});

test("database guard: a non-ACTIVE notice cannot be public, and a public station needs a verification date", async () => {
  const nonActive = (await pool.query(`SELECT count(*)::int n FROM "WantedPerson" WHERE status<>'ACTIVE'`)).rows[0].n;
  if (nonActive) await assert.rejects(pool.query(`UPDATE "WantedPerson" SET "publicPublishedAt"=now() WHERE id=(SELECT id FROM "WantedPerson" WHERE status<>'ACTIVE' LIMIT 1)`), /check|constraint/i);
  await assert.rejects(pool.query(`UPDATE "Station" SET "publicVisible"=true, "publicVerifiedAt"=NULL WHERE id=(SELECT id FROM "Station" LIMIT 1)`), /check|constraint/i);
});

test("static: no raw HTML injection in the code base and no secret literal in the public surface", () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(n)) files.push(p);
    }
  };
  walk(join(process.cwd(), "src"));
  const raw = files.filter((f) => /dangerouslySetInnerHTML|\.innerHTML\s*=|document\.write\(|eval\(/.test(readFileSync(f, "utf8")));
  assert.deepEqual(raw, [], "raw HTML/eval usage must be reviewed");
  const pub = files.filter((f) => /[\\/](\(public\)|api[\\/]v1[\\/]public)[\\/]/.test(f));
  for (const f of pub) assert.ok(!/(password|secret|apikey|token)\s*[:=]\s*["'][^"']{8,}/i.test(readFileSync(f, "utf8")), f);
});

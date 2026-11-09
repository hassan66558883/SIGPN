/**
 * Warrants module — live dev server + seed.
 *   npx tsx --test tests/integration/warrants.test.ts
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
let personId = "";
let warrantId = "";

async function keyFor(username: string) {
  const key = `pms_wr${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'wr-test',$3,$4)`, [`apikey_wr_${username}_${RUN}`, u.rows[0].id, `wr${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
type Json = { data?: Record<string, unknown> & { id?: string; status?: string }; error?: { code: string; message: string }; meta?: { total: number } };
async function api(key: string, method: string, path: string, body?: unknown) {
  const send = () => fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  let res = await send();
  for (let i = 0; i < 2 && res.status === 429; i++) {
    await res.arrayBuffer();
    await new Promise((ok) => setTimeout(ok, Math.min(65, Number(res.headers.get("retry-after") ?? 30)) * 1000));
    res = await send();
  }
  const json = (await res.json().catch(() => ({}))) as Json;
  return { res, json };
}

before(async () => {
  for (const u of ["chief.cs1", "inv.diallo", "desk.cs1"]) keys[u] = await keyFor(u);
  const p = await pool.query(`SELECT p.id FROM "Person" p WHERE p."deletedAt" IS NULL LIMIT 1`);
  personId = p.rows[0].id;
});

after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='wr-test' AND "keyPrefix"=$1`, [`wr${RUN}`]);
  await pool.end();
});

test("desk officer cannot request a warrant (403)", async () => {
  const { res } = await api(keys["desk.cs1"], "POST", "/api/v1/warrants", { personId, issuingAuthority: "Tribunal de test", grounds: "Motifs suffisamment longs pour valider." });
  assert.equal(res.status, 403);
});

test("investigator requests a warrant: DRAFT, and cannot approve it himself", async () => {
  const body = { type: "ARREST", personId, issuingAuthority: "Tribunal de test", grounds: "Motifs suffisamment longs pour valider.", expiresAt: new Date(Date.now() + 7 * 864e5).toISOString() };
  const c = await api(keys["inv.diallo"], "POST", "/api/v1/warrants", body);
  assert.equal(c.res.status, 201, JSON.stringify(c.json));
  assert.equal(c.json.data?.status, "DRAFT");
  warrantId = String(c.json.data?.id);
  const own = await api(keys["inv.diallo"], "PATCH", `/api/v1/warrants/${warrantId}`, { status: "ACTIVE" });
  assert.ok([403, 409].includes(own.res.status), `self-approval must be refused, got ${own.res.status}`);
});

test("chief approves; rejection and cancellation need a reason; execution only when ACTIVE", async () => {
  const early = await api(keys["chief.cs1"], "PATCH", `/api/v1/warrants/${warrantId}`, { status: "EXECUTED" });
  assert.equal(early.res.status, 409, "cannot execute a DRAFT warrant");
  const noReason = await api(keys["chief.cs1"], "PATCH", `/api/v1/warrants/${warrantId}`, { status: "REJECTED" });
  assert.equal(noReason.res.status, 422, "a rejection needs a reason");
  const ok = await api(keys["chief.cs1"], "PATCH", `/api/v1/warrants/${warrantId}`, { status: "ACTIVE" });
  assert.equal(ok.res.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.data?.status, "ACTIVE");
  const done = await api(keys["chief.cs1"], "PATCH", `/api/v1/warrants/${warrantId}`, { status: "EXECUTED", notes: "Exécuté en présence de témoins." });
  assert.equal(done.res.status, 200, JSON.stringify(done.json));
  const again = await api(keys["chief.cs1"], "PATCH", `/api/v1/warrants/${warrantId}`, { status: "CANCELLED", notes: "trop tard" });
  assert.equal(again.res.status, 409, "an executed warrant is final");
});

test("list is audited-scope and reachable by the requester", async () => {
  const r = await api(keys["inv.diallo"], "GET", "/api/v1/warrants?q=WRT");
  assert.equal(r.res.status, 200);
  const a = await pool.query(`SELECT count(*)::int AS n FROM "AuditLog" WHERE "entityId"=$1 AND action LIKE 'WARRANT_%'`, [warrantId]);
  assert.ok(a.rows[0].n >= 3, "creation, approval and execution are audited");
});

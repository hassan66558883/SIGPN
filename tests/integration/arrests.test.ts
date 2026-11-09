/**
 * Arrests module — live dev server + seed.
 *   npx tsx --test tests/integration/arrests.test.ts
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
let officerId = "";
let arrestId = "";

async function keyFor(username: string) {
  const key = `pms_ar${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'ar-test',$3,$4)`, [`apikey_ar_${username}_${RUN}`, u.rows[0].id, `ar${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
type Json = { data?: Record<string, unknown> & { id?: string; status?: string }; error?: { code: string; message: string } };
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
  for (const u of ["inv.diallo", "desk.cs1", "chief.arr5"]) keys[u] = await keyFor(u);
  personId = (await pool.query(`SELECT id FROM "Person" WHERE "deletedAt" IS NULL LIMIT 1`)).rows[0].id;
  officerId = (await pool.query(`SELECT o.id FROM "Officer" o JOIN "Station" s ON s.id=o."stationId" WHERE s.code='CS-01' AND o."deletedAt" IS NULL LIMIT 1`)).rows[0].id;
});

after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='ar-test' AND "keyPrefix"=$1`, [`ar${RUN}`]);
  await pool.end();
});

const base = () => ({ personId, arrestingOfficerId: officerId, arrestedAt: new Date(Date.now() - 3600_000).toISOString(), locationText: "Marché central, N'Djamena", charges: "Vol à main armée", authority: "FLAGRANTE_DELICTO" });

test("an arrest under a warrant must name an ACTIVE warrant of that person", async () => {
  const none = await api(keys["desk.cs1"], "POST", "/api/v1/arrests", { ...base(), authority: "WARRANT" });
  assert.equal(none.res.status, 422);
  const w = await pool.query(`SELECT id FROM "Warrant" WHERE status <> 'ACTIVE' LIMIT 1`);
  if (w.rowCount) {
    const bad = await api(keys["desk.cs1"], "POST", "/api/v1/arrests", { ...base(), authority: "WARRANT", warrantId: w.rows[0].id });
    assert.ok([409, 422].includes(bad.res.status), `non-active or foreign warrant refused, got ${bad.res.status}`);
  }
});

test("the arrest time cannot be in the future", async () => {
  const r = await api(keys["desk.cs1"], "POST", "/api/v1/arrests", { ...base(), arrestedAt: new Date(Date.now() + 86400_000).toISOString() });
  assert.equal(r.res.status, 422);
});

test("desk officer records an arrest, but cannot change its status", async () => {
  const c = await api(keys["desk.cs1"], "POST", "/api/v1/arrests", base());
  assert.equal(c.res.status, 201, JSON.stringify(c.json));
  assert.equal(c.json.data?.status, "RECORDED");
  arrestId = String(c.json.data?.id);
  const p = await api(keys["desk.cs1"], "PATCH", `/api/v1/arrests/${arrestId}`, { status: "IN_CUSTODY" });
  assert.equal(p.res.status, 403);
});

test("status flow: custody, release needs a reason, then final", async () => {
  const a = await api(keys["inv.diallo"], "PATCH", `/api/v1/arrests/${arrestId}`, { status: "IN_CUSTODY" });
  assert.equal(a.res.status, 200, JSON.stringify(a.json));
  const noReason = await api(keys["inv.diallo"], "PATCH", `/api/v1/arrests/${arrestId}`, { status: "RELEASED" });
  assert.equal(noReason.res.status, 422);
  const ok = await api(keys["inv.diallo"], "PATCH", `/api/v1/arrests/${arrestId}`, { status: "RELEASED", notes: "Libéré faute de charges." });
  assert.equal(ok.res.status, 200, JSON.stringify(ok.json));
  const again = await api(keys["inv.diallo"], "PATCH", `/api/v1/arrests/${arrestId}`, { status: "CHARGED" });
  assert.equal(again.res.status, 409);
});

test("territorial scope: another station's chief cannot see it; everything is audited", async () => {
  const other = await api(keys["chief.arr5"], "GET", `/api/v1/arrests/${arrestId}`);
  assert.equal(other.res.status, 404);
  const own = await api(keys["inv.diallo"], "GET", `/api/v1/arrests/${arrestId}`);
  assert.equal(own.res.status, 200);
  const a = await pool.query(`SELECT count(*)::int AS n FROM "AuditLog" WHERE "entityId"=$1 AND action LIKE 'ARREST_%'`, [arrestId]);
  assert.ok(a.rows[0].n >= 3);
});

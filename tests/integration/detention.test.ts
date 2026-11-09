/**
 * Detention module — live dev server + seed.
 *   npx tsx --test tests/integration/detention.test.ts
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
let detentionId = "";

async function keyFor(username: string) {
  const key = `pms_dt${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'dt-test',$3,$4)`, [`apikey_dt_${username}_${RUN}`, u.rows[0].id, `dt${RUN}`, createHash("sha256").update(key).digest("hex")]);
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
const iso = (ms: number) => new Date(Date.now() + ms).toISOString();
const H = 3_600_000;

before(async () => {
  for (const u of ["custody.cs1", "desk.cs1", "chief.cs1", "chief.arr5"]) keys[u] = await keyFor(u);
  personId = (await pool.query(`SELECT id FROM "Person" WHERE "deletedAt" IS NULL LIMIT 1`)).rows[0].id;
  officerId = (await pool.query(`SELECT o.id FROM "Officer" o JOIN "Station" s ON s.id=o."stationId" WHERE s.code='CS-01' AND o."deletedAt" IS NULL LIMIT 1`)).rows[0].id;
  const a = await api(keys["desk.cs1"], "POST", "/api/v1/arrests", { personId, arrestingOfficerId: officerId, arrestedAt: iso(-3 * H), locationText: "Carrefour test", charges: "Trouble à l'ordre public", authority: "FLAGRANTE_DELICTO" });
  assert.equal(a.res.status, 201, JSON.stringify(a.json));
  arrestId = String(a.json.data?.id);
});

after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='dt-test' AND "keyPrefix"=$1`, [`dt${RUN}`]);
  await pool.end();
});

test("desk officer cannot open a custody (403); custody cannot start before the arrest", async () => {
  const no = await api(keys["desk.cs1"], "POST", "/api/v1/detention", { arrestId, startedAt: iso(-1 * H) });
  assert.equal(no.res.status, 403);
  const early = await api(keys["custody.cs1"], "POST", "/api/v1/detention", { arrestId, startedAt: iso(-10 * H) });
  assert.equal(early.res.status, 422);
});

test("custody starts, legal limit is arrest + 48 h, arrest moves to IN_CUSTODY, a second custody is refused", async () => {
  const c = await api(keys["custody.cs1"], "POST", "/api/v1/detention", { arrestId, startedAt: iso(-2 * H), cellNumber: "C2" });
  assert.equal(c.res.status, 201, JSON.stringify(c.json));
  detentionId = String(c.json.data?.id);
  const row = await pool.query(`SELECT d."legalLimitAt", a."arrestedAt", a.status FROM "Detention" d JOIN "Arrest" a ON a.id=d."arrestId" WHERE d.id=$1`, [detentionId]);
  assert.equal(new Date(row.rows[0].legalLimitAt).getTime() - new Date(row.rows[0].arrestedAt).getTime(), 48 * H);
  assert.equal(row.rows[0].status, "IN_CUSTODY");
  const dup = await api(keys["custody.cs1"], "POST", "/api/v1/detention", { arrestId, startedAt: iso(-1 * H) });
  assert.ok([409, 422].includes(dup.res.status), `second custody refused, got ${dup.res.status}`);
});

test("welfare log; extension needs its own permission, a valid bound, authority and reason", async () => {
  const log = await api(keys["custody.cs1"], "PATCH", `/api/v1/detention/${detentionId}`, { action: "log", type: "MEAL", notes: "Repas servi à midi." });
  assert.equal(log.res.status, 200, JSON.stringify(log.json));
  const deadline = Date.now() - 3 * H + 48 * H; // arrest + 48 h
  const tooLong = await api(keys["chief.cs1"], "PATCH", `/api/v1/detention/${detentionId}`, { action: "extend", extendedUntil: new Date(deadline + 60 * H).toISOString(), extensionAuthority: "Procureur", extensionReason: "Enquête complexe en cours" });
  assert.equal(tooLong.res.status, 422);
  const ok = await api(keys["chief.cs1"], "PATCH", `/api/v1/detention/${detentionId}`, { action: "extend", extendedUntil: new Date(deadline + 24 * H).toISOString(), extensionAuthority: "Procureur de la République", extensionReason: "Enquête complexe en cours" });
  assert.equal(ok.res.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.data?.status, "EXTENDED");
});

test("ending: the arrest follows the outcome; a closed custody accepts nothing more", async () => {
  const end = await api(keys["custody.cs1"], "PATCH", `/api/v1/detention/${detentionId}`, { action: "end", endReason: "RELEASED_NO_CHARGE", endNotes: "Aucune charge retenue." });
  assert.equal(end.res.status, 200, JSON.stringify(end.json));
  const a = await pool.query(`SELECT status FROM "Arrest" WHERE id=$1`, [arrestId]);
  assert.equal(a.rows[0].status, "RELEASED");
  const more = await api(keys["custody.cs1"], "PATCH", `/api/v1/detention/${detentionId}`, { action: "log", type: "NOTE", notes: "trop tard" });
  assert.equal(more.res.status, 409);
});

test("territorial scope and audit trail", async () => {
  const other = await api(keys["chief.arr5"], "GET", `/api/v1/detention/${detentionId}`);
  assert.equal(other.res.status, 404);
  const n = await pool.query(`SELECT count(*)::int AS n FROM "AuditLog" WHERE "entityId"=$1 AND action LIKE 'DETENTION_%'`, [detentionId]);
  assert.ok(n.rows[0].n >= 4);
});

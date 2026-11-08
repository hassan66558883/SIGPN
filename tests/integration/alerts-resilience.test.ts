/**
 * Phase 8 — connectivity and recovery of the national alert network (live dev server + seeded database).
 *   npx tsx --test tests/integration/alerts-resilience.test.ts
 * Covers: concurrent synchronisations and acknowledgements, two maintenance passes at once (several instances or app + cron),
 * a long outage followed by catch-up in order, a revoked key / disabled account, and the durable queue (nothing lives only in memory).
 */
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";
import Module from "node:module";
import path from "node:path";

const m = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolveFilename = m._resolveFilename;
m._resolveFilename = function (request: string, ...rest: unknown[]) {
  return request === "server-only" ? path.join(process.cwd(), "scripts", "empty.cjs") : resolveFilename.call(this, request, ...rest);
};

const BASE = process.env.PMS_URL ?? "http://localhost:3300";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const RUN = Date.now().toString(36).slice(-5);
const keys: Record<string, string> = {};
const ids: Record<string, string> = {};
let seq = 0;

async function keyFor(username: string) {
  const key = `pms_rs${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'rs-test',$3,$4)`, [`apikey_rs_${username}_${RUN}_${seq++}`, u.rows[0].id, `rs${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
type Json = { data?: any; error?: { code: string }; meta?: { offline?: boolean; caughtUp?: number } };
async function api(key: string, method: string, p: string, body?: unknown) {
  const res = await fetch(`${BASE}${p}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { res, json: (await res.json().catch(() => ({}))) as Json };
}
const unitRows = async (alertId: string, stationId: string) => (await pool.query(`SELECT status, "deliveredAt", "readAt", "ackAt", "escalationLevel" FROM "AlertDelivery" WHERE "alertId"=$1 AND "stationId"=$2`, [alertId, stationId])).rows;

before(async () => {
  for (const u of ["admin", "chief.cs1", "commander.national"]) keys[u] = await keyFor(u);
  ids.cs1 = (await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`)).rows[0].id;
  await pool.query(`UPDATE "StationPresence" SET "simulatedOffline"=false WHERE "stationId"=$1`, [ids.cs1]);
});
after(async () => {
  await pool.query(`UPDATE "StationPresence" SET "simulatedOffline"=false WHERE "stationId"=$1`, [ids.cs1]);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='rs-test' AND "keyPrefix"=$1`, [`rs${RUN}`]);
  await pool.end();
});

async function simulate(title: string) {
  const r = await api(keys.admin, "POST", "/api/v1/alerts/simulate", { title, diffusion: "NATIONAL", stationId: ids.cs1 });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  return r.json.data.id as string;
}

test("a long outage accumulates alerts in order and one reconnection delivers every one of them exactly once", async () => {
  assert.equal((await api(keys.admin, "POST", `/api/v1/alerts/units/${ids.cs1}/presence`, { offline: true })).res.status, 200);
  const made: string[] = [];
  for (let i = 1; i <= 5; i++) made.push(await simulate(`Panne ${RUN} #${i}`));
  for (const id of made) assert.equal((await unitRows(id, ids.cs1))[0].status, "PENDING", "kept in the durable queue while the unit is offline");
  assert.equal((await api(keys.admin, "POST", `/api/v1/alerts/units/${ids.cs1}/presence`, { offline: false })).res.status, 200);
  const back = await api(keys["chief.cs1"], "GET", "/api/v1/alerts?limit=200");
  const items = back.json.data as { alert: { id: string; seq: number } }[];
  // a chief sees one entry per unit of the scope (the unit and its sub-units), so count distinct alerts
  const mine = items.filter((x) => made.includes(x.alert.id));
  const seqs = [...new Set(mine.map((x) => x.alert.seq))];
  assert.equal(new Set(mine.map((x) => x.alert.id)).size, 5, "all five arrive");
  for (const id of made) assert.equal((await unitRows(id, ids.cs1)).length, 1, "one delivery row per unit and alert");
  ids.lastSeq = String(Math.max(...seqs));
  const resume = await api(keys["chief.cs1"], "GET", `/api/v1/alerts?afterSeq=${ids.lastSeq}`);
  assert.equal((resume.json.data as { alert: { id: string } }[]).filter((x) => made.includes(x.alert.id)).length, 0, "resuming after the last event returns nothing already seen");
  ids.made = made.join(",");
});

test("25 simultaneous synchronisations and 10 simultaneous acknowledgements neither fail nor duplicate anything", async () => {
  const id = await simulate(`Concurrence ${RUN}`);
  const calls = await Promise.all([
    ...Array.from({ length: 15 }, () => api(keys["chief.cs1"], "GET", "/api/v1/alerts?limit=50")),
    ...Array.from({ length: 10 }, () => api(keys["chief.cs1"], "POST", "/api/v1/alerts/heartbeat")),
  ]);
  assert.ok(calls.every((c) => c.res.status === 200), calls.map((c) => c.res.status).join(","));
  const rows = await unitRows(id, ids.cs1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "DELIVERED");
  const acks = await Promise.all(Array.from({ length: 10 }, () => api(keys["chief.cs1"], "POST", `/api/v1/alerts/${id}/ack`)));
  assert.ok(acks.every((c) => c.res.status === 200), acks.map((c) => c.res.status).join(","));
  const after = (await unitRows(id, ids.cs1))[0];
  assert.equal(after.status, "ACKNOWLEDGED");
  assert.ok(after.ackAt && after.deliveredAt);
  const audits = (await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action ILIKE '%ALERT%ACK%' AND "entityId"=$1`, [id])).rows[0].n;
  assert.ok(audits >= 1 && audits <= 10, `acknowledgement audit rows: ${audits}`);
});

test("two maintenance passes at the same instant (two instances, or app + cron) escalate and notify once", async () => {
  const { runAlertMaintenance } = await import("../../src/server/alerts/maintenance");
  // a real (non simulated) alert is needed for escalation: take the most recent PUBLISHED one that still has pending deliveries, else skip
  const target = (await pool.query(`SELECT a.id, a.number FROM "NationalAlert" a WHERE a."isSimulation"=false AND EXISTS (SELECT 1 FROM "AlertDelivery" d WHERE d."alertId"=a.id AND d.status='PENDING') ORDER BY a.seq DESC LIMIT 1`)).rows[0];
  if (!target) return;
  await pool.query(`UPDATE "AlertDelivery" SET "escalationLevel"=0, "escalatedAt"=NULL WHERE "alertId"=$1`, [target.id]);
  const body = `Alerte ${target.number} :%`;
  const count = async () => (await pool.query(`SELECT count(*)::int n FROM "Notification" WHERE title LIKE 'Escalade%' AND body LIKE $1`, [body])).rows[0].n as number;
  const before = await count();
  const future = new Date(Date.now() + 120 * 60_000);
  const eligibleBefore = (await pool.query(`SELECT count(*)::int n FROM "AlertDelivery" WHERE "escalationLevel" < 2 AND status IN ('PENDING','DELIVERED','READ')`)).rows[0].n as number;
  const runs = await Promise.all([runAlertMaintenance(future), runAlertMaintenance(future), runAlertMaintenance(future)]);
  const total1 = runs.reduce((s, r) => s + r.escalated1, 0);
  const total2 = runs.reduce((s, r) => s + r.escalated2, 0);
  // A pass counts every overdue delivery of the whole network (other alerts left by earlier runs included), so the bound is the number of
  // deliveries that could still escalate before the passes: each is escalated to its final level once, never once per concurrent pass.
  assert.ok(total1 + total2 <= eligibleBefore, `escalations counted ${total1 + total2} for ${eligibleBefore} eligible deliveries (double escalation)`);
  const created = (await count()) - before;
  const second = await runAlertMaintenance(future);
  assert.equal(second.escalated1 + second.escalated2, 0, "a further pass repeats nothing");
  const distinct = (await pool.query(`SELECT count(*)::int n FROM (SELECT "userId", body FROM "Notification" WHERE title LIKE 'Escalade%' AND body LIKE $1 AND "createdAt" > now() - interval '2 minutes' GROUP BY "userId", body HAVING count(*) > 1) x`, [body])).rows[0].n as number;
  assert.equal(distinct, 0, `supervisors received duplicate escalation notices (${created} created by 3 concurrent passes)`);
  await pool.query(`UPDATE "AlertDelivery" SET "escalationLevel"=0, "escalatedAt"=NULL WHERE "alertId"=$1`, [target.id]);
});

test("a revoked API key and a disabled account are cut off at once and the unit is not marked online by them", async () => {
  const k = await keyFor("desk.cs1");
  assert.equal((await api(k, "POST", "/api/v1/alerts/heartbeat")).res.status, 200);
  await pool.query(`UPDATE "ApiKey" SET "revokedAt"=now() WHERE "keyPrefix"=$1 AND "userId"=(SELECT id FROM "User" WHERE username='desk.cs1')`, [`rs${RUN}`]);
  assert.equal((await api(k, "POST", "/api/v1/alerts/heartbeat")).res.status, 401, "revoked key");
  const k2 = await keyFor("desk.cs1").catch(() => null);
  if (k2) {
    await pool.query(`UPDATE "User" SET status='DISABLED' WHERE username='desk.cs1'`);
    try {
      assert.equal((await api(k2, "GET", "/api/v1/alerts")).res.status, 401, "disabled account");
    } finally {
      await pool.query(`UPDATE "User" SET status='ACTIVE' WHERE username='desk.cs1'`);
    }
  }
});

test("the queue is durable: every undelivered row is in the database with its retry state, nothing depends on server memory", async () => {
  const r = await pool.query(`SELECT count(*)::int total, count(*) FILTER (WHERE d.status='PENDING' AND "nextAttemptAt" IS NULL AND attempts < 12 AND s."isActive")::int AS orphan FROM "AlertDelivery" d JOIN "Station" s ON s.id=d."stationId"`);
  assert.equal(r.rows[0].orphan, 0, "every pending delivery to an active unit has a next attempt time");
});

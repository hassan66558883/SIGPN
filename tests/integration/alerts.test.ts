/**
 * National alert network (SIGPN-T v2.0, section 5) — live dev server + seeded database.
 *   npx tsx --test tests/integration/alerts.test.ts
 * Covers: automatic publication on approval, recipients by diffusion level, delivery / read / acknowledgement receipts,
 * offline catch-up, withdrawal broadcast, supervision, escalation, permissions and generic notifications.
 */
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";
import Module from "node:module";
import path from "node:path";

// the maintenance service is `server-only`: bypass the guard exactly as the CLI scripts do
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
let activeStations = 0;

async function keyFor(username: string) {
  const key = `pms_al${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'al-test',$3,$4)`, [`apikey_al_${username}_${RUN}`, u.rows[0].id, `al${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
type Json = { data?: any; error?: { code: string; message: string }; meta?: { offline?: boolean; caughtUp?: number } };
async function api(key: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as Json;
  return { res, json };
}
const deliveries = async (alertId: string) => (await pool.query(`SELECT d.status, d."stationId", s.code FROM "AlertDelivery" d JOIN "Station" s ON s.id=d."stationId" WHERE d."alertId"=$1`, [alertId])).rows as { status: string; stationId: string; code: string }[];

/** Every unit active both when the alert was published and now must have exactly one delivery (other suites may create or retire units concurrently, so no absolute count). */
async function assertCoversAllUnits(alertId: string) {
  const d = await deliveries(alertId);
  const have = new Set(d.map((x) => x.stationId));
  assert.equal(have.size, d.length, "one delivery per unit");
  const missing = await pool.query(`SELECT s.code FROM "Station" s, "NationalAlert" a WHERE a.id=$1 AND s."isActive" AND s."createdAt" < a."createdAt" - interval '2 seconds' AND NOT (s.id = ANY($2))`, [alertId, [...have]]);
  assert.equal(missing.rowCount, 0, `units without delivery: ${missing.rows.map((r) => r.code).join(",")}`);
  assert.ok(d.length >= activeStations - 5, "delivered to the whole network");
  return d;
}

before(async () => {
  for (const u of ["admin", "inv.diallo", "chief.cs1", "chief.mdu", "chief.arr5", "desk.post1", "desk.cs1", "commander.national", "analyst"]) keys[u] = await keyFor(u);
  ids.cs1 = (await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`)).rows[0].id;
  ids.ns1 = (await pool.query(`SELECT id FROM "Station" WHERE code='NS-01'`)).rows[0].id;
  activeStations = (await pool.query(`SELECT count(*)::int n FROM "Station" WHERE "isActive"`)).rows[0].n;
  const free = await pool.query(`SELECT id FROM "Person" p WHERE p."deletedAt" IS NULL AND p."mergedIntoId" IS NULL AND NOT EXISTS (SELECT 1 FROM "WantedPerson" w WHERE w."personId"=p.id AND w.status IN ('DRAFT','PENDING_APPROVAL','ACTIVE','LOCATED','SUSPENDED')) ORDER BY random() LIMIT 1`);
  assert.ok(free.rowCount, "need a person without a live notice");
  ids.person = free.rows[0].id;
  // a clean slate for the units used below: previous alerts must not hide the ones of this run
  await pool.query(`UPDATE "StationPresence" SET "simulatedOffline"=false`);
});
after(async () => {
  await pool.query(`UPDATE "StationPresence" SET "simulatedOffline"=false`);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='al-test' AND "keyPrefix"=$1`, [`al${RUN}`]);
  await pool.end();
});

test("approving a notice publishes ONE national event to every active unit, in PENDING state", async () => {
  const created = await api(keys["inv.diallo"], "POST", "/api/v1/wanted", { personId: ids.person, stationId: ids.cs1, offense: `Alerte test ${RUN}`, reason: "Motif de test suffisamment long pour la validation.", dangerLevel: "HIGH", kind: "HEARING", diffusionLevel: "NATIONAL", legalBasis: "Convocation (test)", issuingAuthority: "Parquet (test)" });
  assert.equal(created.res.status, 201, JSON.stringify(created.json));
  ids.wanted = created.json.data.id;
  assert.equal((await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${ids.wanted}`, { op: "verify" })).res.status, 200);
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "NationalAlert" WHERE "wantedPersonId"=$1`, [ids.wanted])).rows[0].n, 0, "nothing is published before approval");
  const approved = await api(keys["admin"], "PATCH", `/api/v1/wanted/${ids.wanted}`, { op: "status", status: "ACTIVE" });
  assert.equal(approved.res.status, 200, JSON.stringify(approved.json));
  const alerts = await pool.query(`SELECT id, kind, diffusion, priority, payload FROM "NationalAlert" WHERE "wantedPersonId"=$1`, [ids.wanted]);
  assert.equal(alerts.rowCount, 1);
  assert.equal(alerts.rows[0].kind, "PUBLISHED");
  ids.alert = alerts.rows[0].id;
  const payload = JSON.stringify(alerts.rows[0].payload);
  assert.ok(!payload.includes("Motif de test"), "the internal reason never travels on the network");
  const d = await assertCoversAllUnits(ids.alert);
  assert.ok(d.every((x) => x.status === "PENDING"));
});

test("alerts are immutable (database trigger)", async () => {
  await assert.rejects(pool.query(`UPDATE "NationalAlert" SET title='x' WHERE id=$1`, [ids.alert]), /append-only|immutable|not allowed|forbidden/i);
  await assert.rejects(pool.query(`DELETE FROM "NationalAlert" WHERE id=$1`, [ids.alert]));
});

test("a unit receives it on its next synchronisation: fetching is the delivery receipt, then read, then acknowledgement", async () => {
  const hb = await api(keys["chief.mdu"], "POST", "/api/v1/alerts/heartbeat");
  assert.equal(hb.res.status, 200);
  assert.equal(hb.json.data.online, true);
  assert.ok(hb.json.data.pending >= 1);
  const inbox = await api(keys["chief.mdu"], "GET", "/api/v1/alerts?limit=200");
  assert.equal(inbox.res.status, 200);
  const mine = (inbox.json.data as { alert: { id: string }; status: string }[]).find((x) => x.alert.id === ids.alert);
  assert.ok(mine, "the alert is in the inbox");
  assert.equal(mine!.status, "DELIVERED");
  const row = async () => (await pool.query(`SELECT status, "deliveredAt", "readAt", "ackAt" FROM "AlertDelivery" WHERE "alertId"=$1 AND "stationId"=$2`, [ids.alert, ids.ns1])).rows[0];
  assert.equal((await row()).status, "DELIVERED");
  assert.equal((await api(keys["chief.mdu"], "POST", `/api/v1/alerts/${ids.alert}/read`)).res.status, 200);
  assert.equal((await row()).status, "READ");
  assert.equal((await api(keys["chief.mdu"], "POST", `/api/v1/alerts/${ids.alert}/ack`)).res.status, 200);
  const r = await row();
  assert.equal(r.status, "ACKNOWLEDGED");
  assert.ok(r.deliveredAt && r.readAt && r.ackAt);
  assert.equal((await api(keys["chief.mdu"], "POST", `/api/v1/alerts/${ids.alert}/ack`)).res.status, 200, "acknowledgement is idempotent");
});

test("an offline unit gets nothing, keeps the alert pending, and catches up on reconnection (new alerts are cumulative)", async () => {
  assert.equal((await api(keys["admin"], "POST", `/api/v1/alerts/units/${ids.cs1}/presence`, { offline: true })).res.status, 200);
  const hb = await api(keys["chief.cs1"], "POST", "/api/v1/alerts/heartbeat");
  assert.equal(hb.json.data.online, false);
  const off = await api(keys["chief.cs1"], "GET", "/api/v1/alerts");
  assert.equal(off.json.meta?.offline, true);
  assert.deepEqual(off.json.data, []);
  const sim = await api(keys["admin"], "POST", "/api/v1/alerts/simulate", { title: `Exercice ${RUN}`, diffusion: "NATIONAL", stationId: ids.cs1 });
  assert.equal(sim.res.status, 201, JSON.stringify(sim.json));
  ids.sim = sim.json.data.id;
  const stillPending = (await deliveries(ids.sim)).find((x) => x.stationId === ids.cs1);
  assert.equal(stillPending?.status, "PENDING", "offline unit: still pending");
  assert.equal((await api(keys["admin"], "POST", `/api/v1/alerts/units/${ids.cs1}/presence`, { offline: false })).res.status, 200);
  const back = await api(keys["chief.cs1"], "GET", "/api/v1/alerts?limit=200");
  assert.ok((back.json.meta?.caughtUp ?? 0) >= 2, `caught up ${back.json.meta?.caughtUp}`);
  const items = back.json.data as { alert: { id: string; isSimulation: boolean }; status: string }[];
  assert.ok(items.find((x) => x.alert.id === ids.sim && x.status === "DELIVERED"));
  assert.ok(items.find((x) => x.alert.id === ids.alert));
  assert.equal(items.find((x) => x.alert.id === ids.sim)!.alert.isSimulation, true);
  const resume = await api(keys["chief.cs1"], "GET", `/api/v1/alerts?afterSeq=${(await pool.query(`SELECT seq FROM "NationalAlert" WHERE id=$1`, [ids.alert])).rows[0].seq}`);
  assert.ok((resume.json.data as unknown[]).length >= 1, "afterSeq resumes after a given event");
});

test("suspension and withdrawal are diffused automatically as new events on the same notice", async () => {
  assert.equal((await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${ids.wanted}`, { op: "status", status: "SUSPENDED", closureNotes: "Vérification d identité (test)" })).res.status, 200);
  assert.equal((await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${ids.wanted}`, { op: "status", status: "CANCELLED", closureNotes: "Retrait test" })).res.status, 200);
  const kinds = (await pool.query(`SELECT kind FROM "NationalAlert" WHERE "wantedPersonId"=$1 ORDER BY seq`, [ids.wanted])).rows.map((r) => r.kind);
  assert.deepEqual(kinds, ["PUBLISHED", "SUSPENDED", "WITHDRAWN"]);
  const w = (await pool.query(`SELECT id FROM "NationalAlert" WHERE "wantedPersonId"=$1 AND kind='WITHDRAWN'`, [ids.wanted])).rows[0].id;
  await assertCoversAllUnits(w);
});

test("a LOCAL notice goes to the issuing unit and its sub-units only; a notice never published produces no alert", async () => {
  const free = await pool.query(`SELECT id FROM "Person" p WHERE p."deletedAt" IS NULL AND p."mergedIntoId" IS NULL AND NOT EXISTS (SELECT 1 FROM "WantedPerson" w WHERE w."personId"=p.id AND w.status IN ('DRAFT','PENDING_APPROVAL','ACTIVE','LOCATED','SUSPENDED')) ORDER BY random() LIMIT 1`);
  const c = await api(keys["inv.diallo"], "POST", "/api/v1/wanted", { personId: free.rows[0].id, stationId: ids.cs1, offense: `Local test ${RUN}`, reason: "Motif de test suffisamment long pour la validation.", kind: "HEARING", diffusionLevel: "LOCAL", legalBasis: "Convocation (test)", issuingAuthority: "Parquet (test)" });
  assert.equal(c.res.status, 201, JSON.stringify(c.json));
  const id = c.res.status === 201 ? c.json.data.id : "";
  await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${id}`, { op: "verify" });
  assert.equal((await api(keys["admin"], "PATCH", `/api/v1/wanted/${id}`, { op: "status", status: "ACTIVE" })).res.status, 200);
  const a = (await pool.query(`SELECT id FROM "NationalAlert" WHERE "wantedPersonId"=$1`, [id])).rows[0].id;
  const d = await deliveries(a);
  assert.ok(d.length >= 1 && d.length < activeStations, `local scope: ${d.length} of ${activeStations}`);
  assert.ok(d.some((x) => x.stationId === ids.cs1));
  assert.ok(!d.some((x) => x.stationId === ids.ns1), "another commissariat is not a recipient of a local notice");
  await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${id}`, { op: "status", status: "CANCELLED", closureNotes: "Fin du test" });
  // a draft cancelled before any publication generates no alert
  const free2 = await pool.query(`SELECT id FROM "Person" p WHERE p."deletedAt" IS NULL AND p."mergedIntoId" IS NULL AND NOT EXISTS (SELECT 1 FROM "WantedPerson" w WHERE w."personId"=p.id AND w.status IN ('DRAFT','PENDING_APPROVAL','ACTIVE','LOCATED','SUSPENDED')) ORDER BY random() LIMIT 1`);
  const c2 = await api(keys["inv.diallo"], "POST", "/api/v1/wanted", { personId: free2.rows[0].id, stationId: ids.cs1, offense: `Brouillon ${RUN}`, reason: "Motif de test suffisamment long pour la validation." });
  const id2 = c2.json.data.id;
  await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${id2}`, { op: "status", status: "CANCELLED", closureNotes: "Abandon" });
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "NationalAlert" WHERE "wantedPersonId"=$1`, [id2])).rows[0].n, 0);
});

test("a unit only sees and answers its own deliveries; users without alerts:* cannot use the network", async () => {
  const own = await api(keys["desk.post1"], "GET", "/api/v1/alerts?limit=200");
  assert.equal(own.res.status, 200);
  const stationOfDesk = (await pool.query(`SELECT "stationId" FROM "User" WHERE username='desk.post1'`)).rows[0].stationId;
  const rows = await pool.query(`SELECT "stationId" FROM "AlertDelivery" WHERE id = ANY($1)`, [(own.json.data as { id: string }[]).map((x) => x.id)]);
  assert.ok(rows.rows.every((r) => r.stationId === stationOfDesk));
  assert.equal((await api(keys["desk.post1"], "GET", "/api/v1/alerts/supervision")).res.status, 403, "supervision needs alerts:supervise");
  assert.equal((await api(keys["desk.post1"], "POST", "/api/v1/alerts/simulate", { title: "Essai" })).res.status, 403);
  assert.equal((await api(keys["desk.post1"], "POST", `/api/v1/alerts/units/${stationOfDesk}/presence`, { offline: true })).res.status, 403);
  const notFound = await api(keys["desk.post1"], "POST", `/api/v1/alerts/00000000/ack`);
  assert.equal(notFound.res.status, 404);
});

test("notifications are generic: nothing sensitive for a locked screen", async () => {
  const n = await pool.query(`SELECT title, body, href FROM "Notification" n JOIN "User" u ON u.id=n."userId" WHERE n.kind='ALERT' AND u.username='chief.mdu' ORDER BY n."createdAt" DESC LIMIT 5`);
  assert.ok(n.rowCount && n.rowCount >= 1);
  for (const r of n.rows) assert.ok(!/Alerte test|Mandat|Local test|offense/i.test(r.title + r.body), "no case content in the notification");
});

test("supervision: national view lists the alert with receipt counters and the units' connectivity; detail per unit", async () => {
  const ov = await api(keys["commander.national"], "GET", "/api/v1/alerts/supervision?days=1");
  assert.equal(ov.res.status, 200, JSON.stringify(ov.json));
  const a = (ov.json.data.alerts as { id: string; total: number; counts: Record<string, number> }[]).find((x) => x.id === ids.alert);
  assert.ok(a, "alert listed");
  assert.ok(a!.total >= activeStations - 5);
  assert.ok(a!.counts.ACKNOWLEDGED >= 1 && a!.counts.PENDING >= 1);
  assert.ok(ov.json.data.units.length >= activeStations - 5);
  assert.ok((ov.json.data.units as { online: boolean }[]).some((u) => u.online), "at least one connected unit (heartbeat above)");
  assert.ok((ov.json.data.units as { online: boolean }[]).some((u) => !u.online), "units without heartbeat are offline");
  const detail = await api(keys["commander.national"], "GET", `/api/v1/alerts/supervision/${ids.alert}`);
  assert.equal(detail.res.status, 200);
  assert.ok(detail.json.data.deliveries.length >= activeStations - 5);
  const filtered = await api(keys["commander.national"], "GET", `/api/v1/alerts/supervision?days=1&status=ACKNOWLEDGED`);
  assert.ok((filtered.json.data.alerts as { total: number }[]).every((x) => x.total >= 1));
  const remind = await api(keys["commander.national"], "POST", `/api/v1/alerts/supervision/${ids.alert}/remind`);
  assert.equal(remind.res.status, 200);
  assert.ok(remind.json.data.reminded >= 1);
});

test("escalation levels follow priority and state (pure rules)", async () => {
  const { escalationLevelFor } = await import("../../src/lib/alert-escalation");
  assert.equal(escalationLevelFor({ status: "PENDING", requiresAck: true, priority: "HIGH", ageMinutes: 4 }), 0);
  assert.equal(escalationLevelFor({ status: "PENDING", requiresAck: true, priority: "HIGH", ageMinutes: 6 }), 1);
  assert.equal(escalationLevelFor({ status: "PENDING", requiresAck: true, priority: "HIGH", ageMinutes: 20 }), 2);
  assert.equal(escalationLevelFor({ status: "PENDING", requiresAck: true, priority: "LOW", ageMinutes: 20 }), 1);
  assert.equal(escalationLevelFor({ status: "DELIVERED", requiresAck: true, priority: "LOW", ageMinutes: 31 }), 1);
  assert.equal(escalationLevelFor({ status: "ACKNOWLEDGED", requiresAck: true, priority: "HIGH", ageMinutes: 999 }), 0);
});

test("maintenance: overdue deliveries are retried and escalated once, supervisors get a generic notice, a rerun repeats nothing", async () => {
  const { runAlertMaintenance } = await import("../../src/server/alerts/maintenance");
  const before = (await pool.query(`SELECT count(*)::int n FROM "Notification" n JOIN "User" u ON u.id=n."userId" WHERE u.username='commander.national' AND n.title LIKE 'Escalade%'`)).rows[0].n;
  const future = new Date(Date.now() + 90 * 60_000);
  await runAlertMaintenance(future); // (the in-process scheduler may have handled part of it already: assert on the resulting state)
  const lvl = await pool.query(`SELECT max("escalationLevel")::int l FROM "AlertDelivery" WHERE "alertId"=$1 AND status='PENDING'`, [ids.alert]);
  assert.equal(lvl.rows[0].l, 2, "a HIGH alert pending for 90 minutes reaches level 2");
  const after = await pool.query(`SELECT n.body FROM "Notification" n JOIN "User" u ON u.id=n."userId" WHERE u.username='commander.national' AND n.title LIKE 'Escalade%' ORDER BY n."createdAt" DESC`);
  assert.ok(after.rowCount! >= before && after.rowCount! >= 1, "national supervisor notified");
  assert.ok(!/Alerte test|offense/i.test(after.rows[0].body));
  const r2 = await runAlertMaintenance(future);
  assert.equal(r2.escalated1 + r2.escalated2, 0, "idempotent: nothing is escalated twice");
  const acked = await pool.query(`SELECT "escalationLevel" l FROM "AlertDelivery" WHERE "alertId"=$1 AND "stationId"=$2`, [ids.alert, ids.ns1]);
  assert.equal(acked.rows[0].l, 0, "an acknowledged delivery is never escalated");
  await pool.query(`UPDATE "AlertDelivery" SET "escalationLevel"=0, "escalatedAt"=NULL WHERE "alertId"=$1`, [ids.alert]);
});

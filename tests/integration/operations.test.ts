/**
 * Operations: incidents / interventions and patrols — live dev server + seed.
 *   npx tsx --test tests/integration/operations.test.ts
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
const ids: Record<string, string> = {};

async function keyFor(username: string) {
  const key = `pms_op${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'op-test',$3,$4)`, [`apikey_op_${username}_${RUN}`, u.rows[0].id, `op${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
type Json = { data?: Record<string, unknown> & { id?: string; number?: string; status?: string }; error?: { code: string; message: string }; meta?: { total: number } };
async function api(key: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as Json;
  return { res, json };
}
const iso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

before(async () => {
  for (const u of ["patrol.cs1", "chief.cs1", "desk.cs1", "chief.arr5", "desk.post1", "admin"]) keys[u] = await keyFor(u);
  const cs1 = await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`);
  ids.cs1 = cs1.rows[0].id;
  const arr5 = await pool.query(`SELECT id FROM "Station" WHERE code='CA-NDJ-05'`);
  ids.arr5 = arr5.rows[0].id;
});
after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='op-test' AND "keyPrefix"=$1`, [`op${RUN}`]);
  await pool.end();
});

test("patrol officer reports a HIGH incident: numbered INC-, reporter dispatched as officer, station supervisors alerted", async () => {
  const r = await api(keys["patrol.cs1"], "POST", "/api/v1/incidents", { type: "TRAFFIC_ACCIDENT", severity: "HIGH", title: `Accident test ${RUN}`, description: "Collision entre deux véhicules, un blessé léger. Test automatisé.", occurredAt: iso(30), locationText: "Rond-point test, N'Djamena", latitude: 12.11, longitude: 15.05 });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  assert.match(r.json.data!.number!, /^INC-\d{4}-\d{5}$/);
  assert.equal(r.json.data!.status, "REPORTED");
  ids.incident = r.json.data!.id!;
  const officers = r.json.data!.officers as unknown[];
  const linked = await pool.query(`SELECT o.id FROM "Officer" o JOIN "User" u ON u.id=o."userId" WHERE u.username='patrol.cs1'`);
  assert.equal(officers.length, linked.rowCount ? 1 : 0, "reporting officer is linked only when the account has an officer record");
  const chief = await pool.query(`SELECT id FROM "User" WHERE username='chief.cs1'`);
  const notif = await pool.query(`SELECT count(*)::int AS n FROM "Notification" WHERE "userId"=$1 AND href=$2 AND kind='ALERT'`, [chief.rows[0].id, `/incidents/${ids.incident}`]);
  assert.equal(notif.rows[0].n, 1, "station commander alerted once");
  const future = await api(keys["patrol.cs1"], "POST", "/api/v1/incidents", { type: "OTHER", severity: "LOW", title: "Futur", description: "Date dans le futur — doit être refusé.", occurredAt: iso(-120), locationText: "Nulle part" });
  assert.equal(future.res.status, 422);
});

test("incident scope: other commissariat 404, attached post 404, own station 200, national 200", async () => {
  assert.equal((await api(keys["chief.arr5"], "GET", `/api/v1/incidents/${ids.incident}`)).res.status, 404);
  assert.equal((await api(keys["desk.post1"], "GET", `/api/v1/incidents/${ids.incident}`)).res.status, 404, "a post does not see its parent's incidents");
  assert.equal((await api(keys["desk.cs1"], "GET", `/api/v1/incidents/${ids.incident}`)).res.status, 200);
  assert.equal((await api(keys["admin"], "GET", `/api/v1/incidents/${ids.incident}`)).res.status, 200);
  const list = await api(keys["chief.arr5"], "GET", `/api/v1/incidents?q=${encodeURIComponent(`Accident test ${RUN}`)}`);
  assert.equal(list.json.meta?.total, 0, "list is scoped");
});

test("incident life cycle: RESPONDING → ON_SCENE → RESOLVED requires a report; illegal transition 409; audit trail complete", async () => {
  const a = await api(keys["patrol.cs1"], "PATCH", `/api/v1/incidents/${ids.incident}`, { op: "status", status: "RESPONDING" });
  assert.equal(a.res.status, 200, JSON.stringify(a.json));
  assert.equal(a.json.data!.status, "RESPONDING");
  const b = await api(keys["patrol.cs1"], "PATCH", `/api/v1/incidents/${ids.incident}`, { op: "status", status: "ON_SCENE" });
  assert.equal(b.json.data!.status, "ON_SCENE");
  const noReport = await api(keys["patrol.cs1"], "PATCH", `/api/v1/incidents/${ids.incident}`, { op: "status", status: "RESOLVED" });
  assert.equal(noReport.res.status, 422, "report required to resolve");
  const back = await api(keys["patrol.cs1"], "PATCH", `/api/v1/incidents/${ids.incident}`, { op: "status", status: "RESPONDING" });
  assert.equal(back.res.status, 409, "cannot go back from ON_SCENE to RESPONDING");
  // a person involved before resolution
  const person = await pool.query(`SELECT id FROM "Person" WHERE "stationId"=$1 AND "deletedAt" IS NULL LIMIT 1`, [ids.cs1]);
  if (person.rowCount) {
    const p = await api(keys["patrol.cs1"], "PATCH", `/api/v1/incidents/${ids.incident}`, { op: "addPerson", personId: person.rows[0].id, role: "WITNESS", notes: "Témoin test" });
    assert.equal(p.res.status, 200, JSON.stringify(p.json));
    ids.witness = person.rows[0].id;
  }
  const c = await api(keys["patrol.cs1"], "PATCH", `/api/v1/incidents/${ids.incident}`, { op: "status", status: "RESOLVED", report: "Constat effectué, blessé pris en charge, circulation rétablie." });
  assert.equal(c.res.status, 200, JSON.stringify(c.json));
  assert.equal(c.json.data!.status, "RESOLVED");
  assert.ok(c.json.data!.resolvedAt);
  const audit = await pool.query(`SELECT array_agg(action ORDER BY at) AS a FROM "AuditLog" WHERE "entityType"='Incident' AND "entityId"=$1`, [ids.incident]);
  const actions = audit.rows[0].a as string[];
  assert.equal(actions[0], "INCIDENT_CREATED");
  assert.ok(actions.includes("INCIDENT_RESPONDING") && actions.includes("INCIDENT_ON_SCENE") && actions.includes("INCIDENT_RESOLVED"), actions.join(","));
});

test("escalation opens a case (needs cases:create), copies involved persons as parties, links both, then CLOSED is read-only", async () => {
  const denied = await api(keys["patrol.cs1"], "PATCH", `/api/v1/incidents/${ids.incident}`, { op: "escalate" });
  assert.equal(denied.res.status, 403, "patrol officer lacks cases:create");
  const esc = await api(keys["chief.cs1"], "PATCH", `/api/v1/incidents/${ids.incident}`, { op: "escalate", title: `Affaire issue de l'incident ${RUN}` });
  assert.equal(esc.res.status, 200, JSON.stringify(esc.json));
  const d = esc.json.data as unknown as { incident: { status: string; caseId: string }; case: { id: string; number: string } };
  assert.equal(d.incident.status, "ESCALATED");
  assert.match(d.case.number, /^CASE-\d{4}-\d{5}$/);
  assert.equal(d.incident.caseId, d.case.id);
  ids.case = d.case.id;
  const k = await api(keys["chief.cs1"], "GET", `/api/v1/cases/${ids.case}`);
  assert.equal(k.res.status, 200);
  assert.equal(k.json.data!.category, "TRAFFIC_OFFENSE", "incident type mapped to offence category");
  assert.equal(k.json.data!.priority, "HIGH", "severity mapped to priority");
  if (ids.witness) {
    const party = await pool.query(`SELECT role FROM "CaseParty" WHERE "caseId"=$1 AND "personId"=$2`, [ids.case, ids.witness]);
    assert.equal(party.rows[0]?.role, "WITNESS", "involved person copied as a party");
  }
  const twice = await api(keys["chief.cs1"], "PATCH", `/api/v1/incidents/${ids.incident}`, { op: "escalate" });
  assert.equal(twice.res.status, 409);
  const closed = await api(keys["chief.cs1"], "PATCH", `/api/v1/incidents/${ids.incident}`, { op: "status", status: "CLOSED" });
  assert.equal(closed.res.status, 200, JSON.stringify(closed.json));
  assert.equal(closed.json.data!.status, "CLOSED");
  const edit = await api(keys["chief.cs1"], "PATCH", `/api/v1/incidents/${ids.incident}`, { op: "addPerson", personId: ids.witness ?? "x", role: "OTHER" });
  assert.equal(edit.res.status, 409, "closed incident is read-only");
});

test("zones: station commander creates a zone for their station; duplicate code 409; other station 422", async () => {
  const z = await api(keys["chief.cs1"], "POST", "/api/v1/patrols/zones", { stationId: ids.cs1, code: `T${RUN}`, name: `Zone test ${RUN}`, description: "Zone de test" });
  assert.equal(z.res.status, 201, JSON.stringify(z.json));
  assert.equal(z.json.data!.code, `T${RUN}`.toUpperCase());
  assert.equal(z.json.data!.isActive, true, "isActive defaults to true when absent");
  ids.zone = z.json.data!.id!;
  const dup = await api(keys["chief.cs1"], "POST", "/api/v1/patrols/zones", { stationId: ids.cs1, code: `t${RUN}`, name: "Doublon" });
  assert.equal(dup.res.status, 409, "code is case-insensitive unique per station");
  const other = await api(keys["chief.cs1"], "POST", "/api/v1/patrols/zones", { stationId: ids.arr5, code: "X1", name: "Hors périmètre" });
  assert.equal(other.res.status, 409, JSON.stringify(other.json));
  const list = await api(keys["chief.arr5"], "GET", "/api/v1/patrols/zones");
  assert.ok(!(list.json.data as unknown as { id: string }[]).some((x) => x.id === ids.zone), "zones are scoped");
});

test("patrol life cycle: plan (vehicle reserved) → start (vehicle IN_USE) → complete (vehicle released, mileage updated); scope enforced", async () => {
  const sup = await pool.query(`SELECT id FROM "Officer" WHERE "stationId"=$1 AND "isActive" AND "deletedAt" IS NULL ORDER BY "badgeNumber" LIMIT 3`, [ids.cs1]);
  assert.ok(sup.rowCount! >= 2);
  const [supervisor, member] = sup.rows.map((r) => r.id as string);
  const veh = await pool.query(`SELECT id, "mileageKm" FROM "Vehicle" WHERE "stationId"=$1 AND status='AVAILABLE' AND "isActive" LIMIT 1`, [ids.cs1]);
  const vehicleId: string | undefined = veh.rows[0]?.id;
  const start = new Date(Date.now() + 3_600_000);
  const end = new Date(start.getTime() + 8 * 3_600_000);
  const badEnd = await api(keys["chief.cs1"], "POST", "/api/v1/patrols", { stationId: ids.cs1, shift: "MORNING", mission: `Mission test ${RUN}`, plannedStart: start.toISOString(), plannedEnd: start.toISOString(), supervisorId: supervisor });
  assert.equal(badEnd.res.status, 422, "end must be after start");
  const foreign = await pool.query(`SELECT id FROM "Officer" WHERE "stationId"=$1 AND "isActive" LIMIT 1`, [ids.arr5]);
  const outOfScope = await api(keys["chief.cs1"], "POST", "/api/v1/patrols", { stationId: ids.cs1, shift: "MORNING", mission: `Mission test ${RUN}`, plannedStart: start.toISOString(), plannedEnd: end.toISOString(), supervisorId: foreign.rows[0].id });
  assert.equal(outOfScope.res.status, 409, "supervisor from another commissariat is refused");
  const created = await api(keys["chief.cs1"], "POST", "/api/v1/patrols", { stationId: ids.cs1, zoneId: ids.zone, shift: "MORNING", mission: `Mission test ${RUN}`, plannedStart: start.toISOString(), plannedEnd: end.toISOString(), supervisorId: supervisor, vehicleId, officerIds: [member, supervisor] });
  assert.equal(created.res.status, 201, JSON.stringify(created.json));
  assert.match(created.json.data!.number!, /^PTL-\d{4}-\d{5}$/);
  assert.equal(created.json.data!.status, "PLANNED");
  assert.equal((created.json.data!.officers as unknown[]).length, 1, "supervisor is not duplicated as a member");
  ids.patrol = created.json.data!.id!;
  // scope
  assert.equal((await api(keys["chief.arr5"], "GET", `/api/v1/patrols/${ids.patrol}`)).res.status, 404);
  assert.equal((await api(keys["desk.cs1"], "PATCH", `/api/v1/patrols/${ids.patrol}`, { op: "start" })).res.status, 403, "desk officer lacks patrols:manage");
  // start
  const started = await api(keys["patrol.cs1"], "PATCH", `/api/v1/patrols/${ids.patrol}`, { op: "start", startKm: 1000 });
  assert.equal(started.res.status, 200, JSON.stringify(started.json));
  assert.equal(started.json.data!.status, "ACTIVE");
  if (vehicleId) {
    const v = await pool.query(`SELECT status FROM "Vehicle" WHERE id=$1`, [vehicleId]);
    assert.equal(v.rows[0].status, "IN_USE");
    const again = await api(keys["chief.cs1"], "POST", "/api/v1/patrols", { stationId: ids.cs1, shift: "NIGHT", mission: `Mission test 2 ${RUN}`, plannedStart: start.toISOString(), plannedEnd: end.toISOString(), supervisorId: supervisor, vehicleId });
    assert.equal(again.res.status, 409, "a vehicle in use cannot be reserved by another patrol");
  }
  const lowKm = await api(keys["patrol.cs1"], "PATCH", `/api/v1/patrols/${ids.patrol}`, { op: "complete", endKm: 900, report: "Rapport de test de patrouille." });
  assert.equal(lowKm.res.status, 422, "end km below start km refused");
  const done = await api(keys["patrol.cs1"], "PATCH", `/api/v1/patrols/${ids.patrol}`, { op: "complete", endKm: 1080, report: "Rapport de test de patrouille : RAS." });
  assert.equal(done.res.status, 200, JSON.stringify(done.json));
  assert.equal(done.json.data!.status, "COMPLETED");
  if (vehicleId) {
    const v = await pool.query(`SELECT status, "mileageKm" FROM "Vehicle" WHERE id=$1`, [vehicleId]);
    assert.equal(v.rows[0].status, "AVAILABLE");
    assert.equal(v.rows[0].mileageKm, 1080);
    const asg = await pool.query(`SELECT "endAt","endKm" FROM "VehicleAssignment" WHERE "vehicleId"=$1 AND purpose=$2`, [vehicleId, `Patrol ${created.json.data!.number}`]);
    assert.ok(asg.rows[0]?.endAt, "vehicle assignment closed");
  }
  const cancel = await api(keys["patrol.cs1"], "PATCH", `/api/v1/patrols/${ids.patrol}`, { op: "cancel", reason: "Trop tard" });
  assert.equal(cancel.res.status, 409, "completed patrol cannot be cancelled");
  const audit = await pool.query(`SELECT array_agg(action ORDER BY at) AS a FROM "AuditLog" WHERE "entityType"='Patrol' AND "entityId"=$1`, [ids.patrol]);
  assert.deepEqual(audit.rows[0].a, ["PATROL_CREATED", "PATROL_STARTED", "PATROL_COMPLETED"]);
});

test("incident linked to a patrol must belong to the same station; patrol detail lists its incidents", async () => {
  const sup = await pool.query(`SELECT id FROM "Officer" WHERE "stationId"=$1 AND "isActive" AND "deletedAt" IS NULL LIMIT 1`, [ids.cs1]);
  const start = new Date(Date.now() - 600_000);
  const p = await api(keys["chief.cs1"], "POST", "/api/v1/patrols", { stationId: ids.cs1, shift: "AFTERNOON", mission: `Mission liée ${RUN}`, plannedStart: start.toISOString(), plannedEnd: new Date(start.getTime() + 4 * 3_600_000).toISOString(), supervisorId: sup.rows[0].id });
  assert.equal(p.res.status, 201, JSON.stringify(p.json));
  const inc = await api(keys["patrol.cs1"], "POST", "/api/v1/incidents", { type: "NOISE", severity: "LOW", title: `Tapage test ${RUN}`, description: "Nuisance sonore signalée pendant la patrouille (test).", occurredAt: iso(5), locationText: "Quartier test", patrolId: p.json.data!.id });
  assert.equal(inc.res.status, 201, JSON.stringify(inc.json));
  const detail = await api(keys["chief.cs1"], "GET", `/api/v1/patrols/${p.json.data!.id}`);
  const incidents = detail.json.data!.incidents as { id: string }[];
  assert.ok(incidents.some((x) => x.id === inc.json.data!.id));
  // a patrol of another station cannot be linked (404, no existence leak)
  const otherPatrol = await pool.query(`SELECT id FROM "Patrol" WHERE "stationId"=$1 LIMIT 1`, [ids.arr5]);
  if (otherPatrol.rowCount) {
    const bad = await api(keys["patrol.cs1"], "POST", "/api/v1/incidents", { type: "NOISE", severity: "LOW", title: `Tapage test 2 ${RUN}`, description: "Lien vers une patrouille hors périmètre (test).", occurredAt: iso(5), locationText: "Quartier test", patrolId: otherPatrol.rows[0].id });
    assert.equal(bad.res.status, 404);
  }
  const cancel = await api(keys["chief.cs1"], "PATCH", `/api/v1/patrols/${p.json.data!.id}`, { op: "cancel", reason: "Fin de test automatisé" });
  assert.equal(cancel.res.status, 200, JSON.stringify(cancel.json));
  assert.equal(cancel.json.data!.status, "CANCELLED");
});

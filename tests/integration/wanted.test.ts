/**
 * Wanted Persons — live dev server + seed.
 *   npx tsx --test tests/integration/wanted.test.ts
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
  const key = `pms_wt${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'wt-test',$3,$4)`, [`apikey_wt_${username}_${RUN}`, u.rows[0].id, `wt${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
type Json = { data?: Record<string, unknown> & { id?: string; number?: string; status?: string }; error?: { code: string; message: string }; meta?: { total: number } };
async function api(key: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as Json;
  return { res, json };
}

before(async () => {
  for (const u of ["chief.cs1", "inv.diallo", "desk.cs1", "chief.arr5", "admin"]) keys[u] = await keyFor(u);
  const cs1 = await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`);
  ids.cs1 = cs1.rows[0].id;
  const person = await pool.query(`SELECT id FROM "Person" WHERE "deletedAt" IS NULL AND "mergedIntoId" IS NULL AND "stationId"=$1 LIMIT 1`, [ids.cs1]);
  ids.person = person.rows[0]?.id ?? (await pool.query(`SELECT id FROM "Person" WHERE "deletedAt" IS NULL AND "mergedIntoId" IS NULL LIMIT 1`)).rows[0].id;
});
after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='wt-test' AND "keyPrefix"=$1`, [`wt${RUN}`]);
  await pool.end();
});

test("desk officer cannot create a wanted notice (lacks wanted:create); investigator can, in DRAFT status", async () => {
  const denied = await api(keys["desk.cs1"], "POST", "/api/v1/wanted", { personId: ids.person, stationId: ids.cs1, offense: `Vol test ${RUN}`, reason: "Motif de test suffisamment long pour la validation." });
  assert.equal(denied.res.status, 403, JSON.stringify(denied.json));
  const created = await api(keys["inv.diallo"], "POST", "/api/v1/wanted", { personId: ids.person, stationId: ids.cs1, offense: `Vol test ${RUN}`, reason: "Motif de test suffisamment long pour la validation.", dangerLevel: "HIGH" });
  assert.equal(created.res.status, 201, JSON.stringify(created.json));
  assert.match(created.json.data!.number!, /^WNT-\d{4}-\d{5}$/);
  assert.equal(created.json.data!.status, "DRAFT");
  ids.wanted = created.json.data!.id!;
});

test("only wanted:approve can move DRAFT -> ACTIVE; wanted:status (not approve) moves ACTIVE -> LOCATED", async () => {
  const deniedApprove = await api(keys["inv.diallo"], "PATCH", `/api/v1/wanted/${ids.wanted}`, { op: "status", status: "ACTIVE" });
  assert.equal(deniedApprove.res.status, 403, "investigator lacks wanted:approve — cannot publish an active notice");
  const activated = await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${ids.wanted}`, { op: "status", status: "ACTIVE" });
  assert.equal(activated.res.status, 200, JSON.stringify(activated.json));
  assert.equal(activated.json.data!.status, "ACTIVE");
  const located = await api(keys["inv.diallo"], "PATCH", `/api/v1/wanted/${ids.wanted}`, { op: "status", status: "LOCATED" });
  assert.equal(located.res.status, 200, "investigator has wanted:status for non-publishing transitions");
  assert.equal(located.json.data!.status, "LOCATED");
  const illegal = await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${ids.wanted}`, { op: "status", status: "PENDING_APPROVAL" });
  assert.equal(illegal.res.status, 409, "LOCATED cannot go back to PENDING_APPROVAL");
});

test("scope: another station's chief gets 404; sighting and vehicle can be recorded and appear on the profile", async () => {
  assert.equal((await api(keys["chief.arr5"], "GET", `/api/v1/wanted/${ids.wanted}`)).res.status, 404);
  const sighting = await api(keys["inv.diallo"], "PATCH", `/api/v1/wanted/${ids.wanted}`, { op: "addSighting", location: `Marché test ${RUN}`, occurredAt: new Date().toISOString(), source: "Test automatisé" });
  assert.equal(sighting.res.status, 200, JSON.stringify(sighting.json));
  const vehicle = await api(keys["inv.diallo"], "PATCH", `/api/v1/wanted/${ids.wanted}`, { op: "addVehicle", plateNumber: "td-9999-zz", make: "Toyota" });
  assert.equal(vehicle.res.status, 200, JSON.stringify(vehicle.json));
  const detail = await api(keys["inv.diallo"], "GET", `/api/v1/wanted/${ids.wanted}`);
  const d = detail.json.data as unknown as { sightings: { location: string }[]; vehicles: { plateNumber: string }[]; lastSeenLocation: string };
  assert.ok(d.sightings.some((s) => s.location === `Marché test ${RUN}`));
  assert.equal(d.lastSeenLocation, `Marché test ${RUN}`, "most recent sighting updates the cached last-seen location");
  assert.ok(d.vehicles.some((v) => v.plateNumber === "TD-9999-ZZ"), "plate is normalized to uppercase");
});

test("warrant: request (reuses the existing Warrant model), then activate; a second request on the same notice is refused", async () => {
  const warrant = await api(keys["inv.diallo"], "POST", `/api/v1/wanted/${ids.wanted}/warrant`, { type: "ARREST", issuingAuthority: "Procureur de la République", grounds: "Charges suffisantes réunies dans le cadre de l'enquête (test)." });
  assert.equal(warrant.res.status, 201, JSON.stringify(warrant.json));
  assert.match(warrant.json.data!.number!, /^WRT-\d{4}-\d{5}$/);
  ids.warrant = warrant.json.data!.id!;
  const twice = await api(keys["inv.diallo"], "POST", `/api/v1/wanted/${ids.wanted}/warrant`, { type: "ARREST", issuingAuthority: "Procureur de la République", grounds: "Deuxième mandat — doit être refusé (test)." });
  assert.equal(twice.res.status, 409, "a wanted notice may only be linked to one warrant");
  const denied = await api(keys["inv.diallo"], "PATCH", `/api/v1/wanted/${ids.wanted}/warrant`, { warrantId: ids.warrant, status: "ACTIVE" });
  assert.equal(denied.res.status, 403, "investigator lacks warrants:approve/wanted:approve to activate a warrant from DRAFT");
  const activated = await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${ids.wanted}/warrant`, { warrantId: ids.warrant, status: "ACTIVE" });
  assert.equal(activated.res.status, 200, JSON.stringify(activated.json));
  const row = await pool.query(`SELECT status, "approvedById" FROM "Warrant" WHERE id=$1`, [ids.warrant]);
  assert.equal(row.rows[0].status, "ACTIVE");
  assert.ok(row.rows[0].approvedById);
  const audit = await pool.query(`SELECT array_agg(action) AS a FROM "AuditLog" WHERE ("entityType"='WantedPerson' AND "entityId"=$1) OR ("entityType"='Warrant' AND "entityId"=$2)`, [ids.wanted, ids.warrant]);
  const actions = audit.rows[0].a as string[];
  assert.ok(actions.includes("WANTED_CREATED") && actions.includes("WARRANT_CREATED") && actions.includes("WARRANT_ACTIVE"), actions.join(","));
});

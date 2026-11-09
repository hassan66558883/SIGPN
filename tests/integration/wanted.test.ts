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
  // The per-account write quota (60 per minute) is shared by every suite run back to back (hr-security exhausts it on purpose): wait out the window instead of failing.
  const send = () => fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  let res = await send();
  for (let i = 0; i < 2 && res.status === 429 && true; i++) {
    await res.arrayBuffer();
    await new Promise((ok) => setTimeout(ok, Math.min(65, Number(res.headers.get("retry-after") ?? 30)) * 1000));
    res = await send();
  }
  const json = (await res.json().catch(() => ({}))) as Json;
  return { res, json };
}

before(async () => {
  for (const u of ["chief.cs1", "inv.diallo", "desk.cs1", "chief.arr5", "commander.national"]) keys[u] = await keyFor(u);
  const cs1 = await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`);
  ids.cs1 = cs1.rows[0].id;
  // persons without a live notice (the service refuses a second live notice for the same person)
  const free = await pool.query(`SELECT id FROM "Person" p WHERE p."deletedAt" IS NULL AND p."mergedIntoId" IS NULL AND NOT EXISTS (SELECT 1 FROM "WantedPerson" w WHERE w."personId"=p.id AND w.status IN ('DRAFT','PENDING_APPROVAL','ACTIVE','LOCATED','SUSPENDED')) ORDER BY random() LIMIT 3`);
  assert.ok(free.rowCount && free.rowCount >= 2, "need two persons without a live wanted notice");
  ids.person = free.rows[0].id;
  ids.person2 = free.rows[1].id;
});
after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='wt-test' AND "keyPrefix"=$1`, [`wt${RUN}`]);
  await pool.end();
});

test("desk officer cannot create a wanted notice (lacks wanted:create); investigator can, in DRAFT status", async () => {
  const denied = await api(keys["desk.cs1"], "POST", "/api/v1/wanted", { personId: ids.person, stationId: ids.cs1, offense: `Vol test ${RUN}`, reason: "Motif de test suffisamment long pour la validation." });
  assert.equal(denied.res.status, 403, JSON.stringify(denied.json));
  const created = await api(keys["inv.diallo"], "POST", "/api/v1/wanted", { personId: ids.person, stationId: ids.cs1, offense: `Vol test ${RUN}`, reason: "Motif de test suffisamment long pour la validation.", dangerLevel: "HIGH", kind: "HEARING", legalBasis: "Convocation du parquet n° 12/2026 (test)", issuingAuthority: "Parquet de N'Djamena (test)" });
  assert.equal(created.res.status, 201, JSON.stringify(created.json));
  assert.match(created.json.data!.number!, /^WNT-\d{4}-\d{5}$/);
  assert.equal(created.json.data!.status, "DRAFT");
  assert.equal(created.json.data!.kind, "HEARING");
  ids.wanted = created.json.data!.id!;
});

test("workflow: a draft cannot skip verification; the issuer cannot verify; verification by another person moves it to PENDING_APPROVAL", async () => {
  const skip = await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${ids.wanted}`, { op: "status", status: "ACTIVE" });
  assert.equal(skip.res.status, 409, "DRAFT -> ACTIVE is no longer a legal transition");
  assert.equal((await api(keys["inv.diallo"], "PATCH", `/api/v1/wanted/${ids.wanted}`, { op: "verify" })).res.status, 403, "investigator lacks wanted:verify");
  const verified = await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${ids.wanted}`, { op: "verify", notes: "Pièces contrôlées (test)" });
  assert.equal(verified.res.status, 200, JSON.stringify(verified.json));
  assert.equal(verified.json.data!.status, "PENDING_APPROVAL");
  assert.ok(verified.json.data!.verifiedAt);
});

test("only wanted:approve can move PENDING_APPROVAL -> ACTIVE; wanted:status (not approve) moves ACTIVE -> LOCATED", async () => {
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

test("a search-warrant notice needs a legal basis, an authority and an ACTIVE warrant; the issuer cannot self-verify or self-approve", async () => {
  const created = await api(keys["chief.cs1"], "POST", "/api/v1/wanted", { personId: ids.person2, stationId: ids.cs1, offense: `Mandat test ${RUN}`, reason: "Motif de test suffisamment long pour la validation.", kind: "SEARCH_WARRANT" });
  assert.equal(created.res.status, 201, JSON.stringify(created.json));
  const id = created.json.data!.id!;
  ids.swWanted = id;
  const self = await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${id}`, { op: "verify" });
  assert.equal(self.res.status, 409, "the issuer cannot verify (four-eyes)");
  const noBasis = await api(keys["commander.national"], "PATCH", `/api/v1/wanted/${id}`, { op: "verify" });
  assert.equal(noBasis.res.status, 409, "legal basis / authority missing: " + JSON.stringify(noBasis.json));
  await pool.query(`UPDATE "WantedPerson" SET "legalBasis"='Mandat de recherche du juge d instruction (test)', "issuingAuthority"='Tribunal de grande instance (test)' WHERE id=$1`, [id]);
  const noWarrant = await api(keys["commander.national"], "PATCH", `/api/v1/wanted/${id}`, { op: "verify" });
  assert.equal(noWarrant.res.status, 409, "a search-warrant notice needs a linked warrant");
  const w = await api(keys["chief.cs1"], "POST", `/api/v1/wanted/${id}/warrant`, { type: "ARREST", issuingAuthority: "Tribunal de grande instance", grounds: "Charges suffisantes réunies dans le cadre de l'enquête (test)." });
  assert.equal(w.res.status, 201, JSON.stringify(w.json));
  const verified = await api(keys["commander.national"], "PATCH", `/api/v1/wanted/${id}`, { op: "verify" });
  assert.equal(verified.res.status, 200, JSON.stringify(verified.json));
  const draftWarrant = await api(keys["commander.national"], "PATCH", `/api/v1/wanted/${id}`, { op: "status", status: "ACTIVE" });
  assert.equal(draftWarrant.res.status, 409, "the warrant is still a draft: " + JSON.stringify(draftWarrant.json));
  await pool.query(`UPDATE "Warrant" SET status='ACTIVE' WHERE id=$1`, [w.json.data!.id]);
  const selfApprove = await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${id}`, { op: "status", status: "ACTIVE" });
  assert.equal(selfApprove.res.status, 409, "the issuer cannot approve (four-eyes)");
  const ok = await api(keys["commander.national"], "PATCH", `/api/v1/wanted/${id}`, { op: "status", status: "ACTIVE" });
  assert.equal(ok.res.status, 200, JSON.stringify(ok.json));
});

test("suspension and withdrawal need a reason; a suspended notice can be reactivated while its warrant is valid", async () => {
  const id = ids.swWanted;
  const noReason = await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${id}`, { op: "status", status: "SUSPENDED" });
  assert.equal(noReason.res.status, 409, "suspension needs a reason");
  const susp = await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${id}`, { op: "status", status: "SUSPENDED", closureNotes: "Erreur d identité à vérifier (test)" });
  assert.equal(susp.res.status, 200, JSON.stringify(susp.json));
  assert.equal(susp.json.data!.status, "SUSPENDED");
  assert.equal(susp.json.data!.suspensionReason, "Erreur d identité à vérifier (test)");
  await pool.query(`UPDATE "Warrant" SET "expiresAt"=now() - interval '1 day' WHERE id=(SELECT "warrantId" FROM "WantedPerson" WHERE id=$1)`, [id]);
  const expired = await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${id}`, { op: "status", status: "ACTIVE" });
  assert.equal(expired.res.status, 409, "an expired warrant cannot support a reactivation");
  await pool.query(`UPDATE "Warrant" SET "expiresAt"=NULL WHERE id=(SELECT "warrantId" FROM "WantedPerson" WHERE id=$1)`, [id]);
  assert.equal((await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${id}`, { op: "status", status: "ACTIVE" })).res.status, 200);
  assert.equal((await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${id}`, { op: "status", status: "CANCELLED" })).res.status, 409, "withdrawal needs a reason");
  const wd = await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${id}`, { op: "status", status: "CANCELLED", closureNotes: "Mandat levé par la juridiction (test)" });
  assert.equal(wd.res.status, 200, JSON.stringify(wd.json));
  assert.equal(wd.json.data!.status, "CANCELLED");
});

test("a person cannot carry two live notices; consultations are audited; the kind filter works", async () => {
  const dup = await api(keys["inv.diallo"], "POST", "/api/v1/wanted", { personId: ids.person, stationId: ids.cs1, offense: `Doublon ${RUN}`, reason: "Motif de test suffisamment long pour la validation." });
  assert.equal(dup.res.status, 409, "person already has a live notice: " + JSON.stringify(dup.json));
  await api(keys["chief.cs1"], "GET", `/api/v1/wanted/${ids.wanted}`);
  const viewed = await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='WANTED_VIEWED' AND "entityId"=$1`, [ids.wanted]);
  assert.ok(viewed.rows[0].n >= 1, "WANTED_VIEWED audited");
  const list = await api(keys["chief.cs1"], "GET", "/api/v1/wanted?kind=HEARING&pageSize=100");
  assert.equal(list.res.status, 200);
  assert.ok((list.json.data as unknown as { kind: string }[]).every((x) => x.kind === "HEARING"));
  const verifyAudit = await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='WANTED_VERIFIED' AND "entityId" IN ($1,$2)`, [ids.wanted, ids.swWanted]);
  assert.equal(verifyAudit.rows[0].n, 2);
});

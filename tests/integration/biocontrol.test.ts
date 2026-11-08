/**
 * Biometric control screen (SIGPN-T v2.0, section 6) — live dev server + seeded database.
 *   npx tsx --test tests/integration/biocontrol.test.ts
 * Simulation only: the four result states, the human-review rules, the four action buttons, scope and audit.
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
  const key = `pms_bc${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'bc-test',$3,$4)`, [`apikey_bc_${username}_${RUN}`, u.rows[0].id, `bc${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
type Json = { data?: any; error?: { code: string; message: string } };
async function api(key: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { res, json: (await res.json().catch(() => ({}))) as Json };
}
const run = (key: string, scenario: string, modality = "FINGERPRINT") => api(key, "POST", "/api/v1/biometric/control", { scenario, modality, reason: `Contrôle de test ${RUN}` });

before(async () => {
  for (const u of ["biometric.cs1", "admin", "desk.cs1", "chief.cs1", "chief.mdu", "inv.diallo"]) keys[u] = await keyFor(u);
});
after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='bc-test' AND "keyPrefix"=$1`, [`bc${RUN}`]);
  await pool.end();
});

test("the four result states, each with its explicit wording rules; every control is a flagged simulation", async () => {
  const exp: Record<string, [string, (s: number | null) => boolean]> = {
    POSSIBLE_MATCH: ["POSSIBLE_MATCH", (s) => s !== null && s >= 80],
    UNCERTAIN: ["UNCERTAIN", (s) => s !== null && s >= 45 && s < 80],
    NO_MATCH: ["NO_MATCH", (s) => s !== null && s < 45],
    UNAVAILABLE: ["UNAVAILABLE", (s) => s === null],
  };
  for (const [scenario, [result, okScore]] of Object.entries(exp)) {
    const r = await run(keys["biometric.cs1"], scenario);
    assert.equal(r.res.status, 201, JSON.stringify(r.json));
    assert.equal(r.json.data.result, result);
    assert.ok(okScore(r.json.data.score), `${scenario}: score ${r.json.data.score}`);
    assert.equal(r.json.data.isSimulation, true);
    assert.match(r.json.data.number, /^BCT-\d{4}-\d{6}$/);
    if (scenario === "POSSIBLE_MATCH") ids.possible = r.json.data.id;
    if (scenario === "UNCERTAIN") ids.uncertain = r.json.data.id;
    if (scenario === "NO_MATCH") ids.nomatch = r.json.data.id;
  }
  const rnd = await run(keys["biometric.cs1"], "RANDOM", "FACE");
  assert.equal(rnd.res.status, 201);
  assert.equal(rnd.json.data.modality, "FACE");
});

test("only a simulation can be stored (database constraint)", async () => {
  await assert.rejects(pool.query(`UPDATE "BiometricControl" SET "isSimulation"=false WHERE id=$1`, [ids.possible]), /simulation_only|check constraint/i);
});

test("the control requires the permission and a stated purpose", async () => {
  assert.equal((await run(keys["desk.cs1"], "NO_MATCH")).res.status, 403);
  const noReason = await api(keys["biometric.cs1"], "POST", "/api/v1/biometric/control", { scenario: "NO_MATCH", modality: "FACE", reason: "x" });
  assert.ok(noReason.res.status >= 400 && noReason.res.status < 500);
});

test("a possible match is compared to a live network alert: identity shown only for POSSIBLE_MATCH; withdrawn notices are never used", async () => {
  const mk = async () => {
    const free = await pool.query(`SELECT id FROM "Person" p WHERE p."deletedAt" IS NULL AND p."mergedIntoId" IS NULL AND NOT EXISTS (SELECT 1 FROM "WantedPerson" w WHERE w."personId"=p.id AND w.status IN ('DRAFT','PENDING_APPROVAL','ACTIVE','LOCATED','SUSPENDED')) ORDER BY random() LIMIT 1`);
    const cs1 = (await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`)).rows[0].id;
    const c = await api(keys["inv.diallo"], "POST", "/api/v1/wanted", { personId: free.rows[0].id, stationId: cs1, offense: `Contrôle test ${RUN}`, reason: "Motif de test suffisamment long pour la validation.", kind: "HEARING", diffusionLevel: "NATIONAL", legalBasis: "Convocation (test)", issuingAuthority: "Parquet (test)" });
    assert.equal(c.res.status, 201, JSON.stringify(c.json));
    const wid = c.json.data.id;
    assert.equal((await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${wid}`, { op: "verify" })).res.status, 200);
    assert.equal((await api(keys["admin"], "PATCH", `/api/v1/wanted/${wid}`, { op: "status", status: "ACTIVE" })).res.status, 200);
    return wid as string;
  };
  const wid = await mk();
  const r = await run(keys["biometric.cs1"], "POSSIBLE_MATCH");
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  assert.ok(r.json.data.reference, "compared to a live alert of the network");
  assert.ok(r.json.data.reference.name, "identity from the bulletin is shown for a possible match");
  const u = await run(keys["biometric.cs1"], "UNCERTAIN");
  if (u.json.data.reference) assert.equal(u.json.data.reference.name, null, "an uncertain result never names a person");
  assert.equal(typeof r.json.data.reference.canOpenDossier, "boolean");
  // withdraw the notice: it must disappear from the references
  assert.equal((await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${wid}`, { op: "status", status: "CANCELLED", closureNotes: "Fin test" })).res.status, 200);
  const after = await pool.query(`SELECT id FROM "NationalAlert" WHERE "wantedPersonId"=$1 ORDER BY seq DESC LIMIT 1`, [wid]);
  const again = await run(keys["biometric.cs1"], "POSSIBLE_MATCH");
  assert.notEqual(again.json.data.reference?.alertNumber === undefined ? "" : (await pool.query(`SELECT id FROM "NationalAlert" WHERE number=$1`, [again.json.data.reference.alertNumber])).rows[0]?.id, after.rows[0].id, "withdrawn notice is not a reference");
});

test("the four buttons: request verification, notify superior, report an error — all audited", async () => {
  const k = keys["biometric.cs1"];
  assert.equal((await api(k, "PATCH", `/api/v1/biometric/control/${ids.possible}`, { op: "requestVerification" })).json.data.status, "VERIFICATION_REQUESTED");
  assert.equal((await api(k, "PATCH", `/api/v1/biometric/control/${ids.possible}`, { op: "notifySuperior" })).res.status, 200);
  const err = await api(k, "PATCH", `/api/v1/biometric/control/${ids.uncertain}`, { op: "reportError", kind: "POOR_CAPTURE", notes: "Doigt humide (test)" });
  assert.equal(err.res.status, 200, JSON.stringify(err.json));
  assert.equal(err.json.data.status, "ERROR_REPORTED");
  assert.equal((await api(k, "PATCH", `/api/v1/biometric/control/${ids.nomatch}`, { op: "requestVerification" })).res.status, 409, "no verification to request for a clean result");
  const audit = await pool.query(`SELECT action FROM "AuditLog" WHERE "entityId" = ANY($1)`, [[ids.possible, ids.uncertain]]);
  const actions = audit.rows.map((r) => r.action);
  for (const a of ["BIOMETRIC_CONTROL_POSSIBLE_MATCH", "BIOMETRIC_CONTROL_VERIFICATION_REQUESTED", "BIOMETRIC_CONTROL_SUPERIOR_NOTIFIED", "BIOMETRIC_CONTROL_ERROR_REPORTED"]) assert.ok(actions.includes(a), `${a} audited`);
  const n = await pool.query(`SELECT title, body FROM "Notification" n JOIN "User" u ON u.id=n."userId" WHERE u.username='admin' AND n.title='Vérification biométrique' ORDER BY n."createdAt" DESC LIMIT 3`);
  for (const r of n.rows) assert.ok(!/fictive|Khadidja|Mbaïro|offense/i.test(r.body), "notification carries no identity");
});

test("human review: needs biometric:verify and another officer than the one who ran the control; written justification required; final", async () => {
  const id = ids.possible;
  assert.equal((await api(keys["biometric.cs1"], "PATCH", `/api/v1/biometric/control/${id}`, { op: "review", outcome: "CONFIRMED", notes: "Vérification de test suffisamment détaillée" })).res.status, 409, "same officer cannot review (four-eyes)");
  assert.equal((await api(keys["chief.cs1"], "PATCH", `/api/v1/biometric/control/${id}`, { op: "review", outcome: "CONFIRMED", notes: "Vérification de test suffisamment détaillée" })).res.status, 403, "chief lacks biometric:verify");
  assert.equal((await api(keys["admin"], "PATCH", `/api/v1/biometric/control/${id}`, { op: "review", outcome: "CONFIRMED", notes: "court" })).res.status, 422, "justification required");
  const ok = await api(keys["admin"], "PATCH", `/api/v1/biometric/control/${id}`, { op: "review", outcome: "CONFIRMED", notes: "Identité vérifiée sur pièce et mandat contrôlé (test)" });
  assert.equal(ok.res.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.data.status, "CONFIRMED_BY_HUMAN");
  assert.equal((await api(keys["admin"], "PATCH", `/api/v1/biometric/control/${id}`, { op: "review", outcome: "REJECTED", notes: "Changement d'avis non permis (test)" })).res.status, 409, "a human decision is final");
  await assert.rejects(pool.query(`UPDATE "BiometricControl" SET "reviewedById"="officerId" WHERE id=$1`, [id]), /reviewer_not_officer|check constraint/i);
});

test("scope: a unit sees its own controls; another station's officer cannot open them", async () => {
  const mine = await api(keys["biometric.cs1"], "GET", "/api/v1/biometric/control");
  assert.ok((mine.json.data as { id: string }[]).some((x) => x.id === ids.possible));
  const other = await api(keys["chief.mdu"], "GET", `/api/v1/biometric/control/${ids.possible}`);
  assert.equal(other.res.status === 403 || other.res.status === 404, true, `other unit: ${other.res.status}`);
});

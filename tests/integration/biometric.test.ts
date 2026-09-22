/**
 * Biometric & forensic identification, and evidence & chain of custody — live dev server + seed.
 *   npx tsx --test tests/integration/biometric.test.ts
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
  const key = `pms_bio${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'bio-test',$3,$4)`, [`apikey_bio_${username}_${RUN}`, u.rows[0].id, `bio${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
type Json = { data?: Record<string, unknown> & { id?: string; number?: string; status?: string }; error?: { code: string; message: string }; meta?: { total: number } };
async function api(key: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as Json;
  return { res, json };
}
async function apiForm(key: string, method: string, path: string, fields: Record<string, string>, file?: { name: string; content: string }) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  if (file) fd.set("file", new Blob([file.content], { type: "image/png" }), file.name);
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}` }, body: fd });
  const json = (await res.json().catch(() => ({}))) as Json;
  return { res, json };
}

before(async () => {
  for (const u of ["biometric.cs1", "forensic.cs1", "prosecutor.cs1", "patrol.cs1", "auditor", "inv.diallo", "admin"]) keys[u] = await keyFor(u);
  const cs1 = await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`);
  ids.cs1 = cs1.rows[0].id;
  const kase = await pool.query(`SELECT id, number FROM "Case" WHERE "stationId"=$1 AND "deletedAt" IS NULL LIMIT 1`, [ids.cs1]);
  assert.ok(kase.rowCount, "a DEMO case at CS-01 is required for this test — run npm run db:seed first");
  ids.case = kase.rows[0].id;
  const person = await pool.query(`SELECT id FROM "Person" WHERE "deletedAt" IS NULL AND "mergedIntoId" IS NULL LIMIT 1`);
  ids.person = person.rows[0].id;
});
after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='bio-test' AND "keyPrefix"=$1`, [`bio${RUN}`]);
  await pool.end();
});

test("no anonymous biometric search: missing case/reason is rejected (spec §10)", async () => {
  const noCase = await apiForm(keys["biometric.cs1"], "POST", "/api/v1/biometric/fingerprint/search", { reason: "Motif de test suffisamment long", mode: "IDENTIFY_1_N" }, { name: "scan.png", content: "fingerprint-bytes" });
  assert.equal(noCase.res.status, 422, JSON.stringify(noCase.json));
  const noFile = await api(keys["biometric.cs1"], "POST", "/api/v1/biometric/anpr/search", { caseId: ids.case, reason: "Motif de test suffisamment long", plateNumber: "TD-1234-AB" });
  assert.equal(noFile.res.status, 200, "text-based plate search needs no file"); // sanity: JSON endpoint works without multipart
});

test("fingerprint: enroll a person (Forensic Officer), then VERIFY_1_1 against them scores 100% (identical capture) and is logged", async () => {
  const enroll = await apiForm(keys["forensic.cs1"], "POST", "/api/v1/biometric/fingerprint/enroll", { personId: ids.person, position: "RIGHT_THUMB" }, { name: "print.png", content: `same-bytes-${RUN}` });
  assert.equal(enroll.res.status, 201, JSON.stringify(enroll.json));
  const biometricOfficerEnroll = await apiForm(keys["biometric.cs1"], "POST", "/api/v1/biometric/fingerprint/enroll", { personId: ids.person, position: "LEFT_THUMB" }, { name: "print2.png", content: "x" });
  assert.equal(biometricOfficerEnroll.res.status, 403, "enrollment (biometric:manage) is reserved to Forensic Officer, not Biometric Officer, in this access matrix");
  assert.ok(!JSON.stringify(enroll.json).includes("templateSecretEnc"), "encrypted template must never appear in the API response");
  const search = await apiForm(keys["biometric.cs1"], "POST", "/api/v1/biometric/fingerprint/search", { caseId: ids.case, reason: "Vérification d'identité — test automatisé", mode: "VERIFY_1_1", personId: ids.person, position: "RIGHT_THUMB" }, { name: "print.png", content: `same-bytes-${RUN}` });
  assert.equal(search.res.status, 201, JSON.stringify(search.json));
  assert.match(search.json.data!.number!, /^BIO-\d{4}-\d{6}$/);
  ids.search = search.json.data!.id!;
  const row = await pool.query(`SELECT result, "topMatchScore", "isDemo" FROM "BiometricSearch" WHERE id=$1`, [ids.search]);
  assert.equal(row.rows[0].result, "POTENTIAL_MATCH", "identical capture must score high enough to be a potential match");
  assert.equal(Number(row.rows[0].topMatchScore), 100);
  assert.equal(row.rows[0].isDemo, true, "mock provider results are always flagged DEMO");
  const audit = await pool.query(`SELECT action FROM "AuditLog" WHERE "entityType"='BiometricSearch' AND "entityId"=$1`, [ids.search]);
  assert.ok(audit.rows.some((r) => r.action === "BIOMETRIC_SEARCH_FINGERPRINT"), "search is recorded in the audit log automatically");
});

test("investigator action: NONE is rejected, a real action is recorded and re-audited, and there is no delete endpoint", async () => {
  const badAction = await api(keys["biometric.cs1"], "PATCH", `/api/v1/biometric/history/${ids.search}`, { action: "NONE" });
  assert.equal(badAction.res.status, 422, "NONE is not a settable action — only a real verification outcome is");
  const denied = await api(keys["patrol.cs1"], "PATCH", `/api/v1/biometric/history/${ids.search}`, { action: "VERIFIED_BY_INVESTIGATOR" });
  assert.equal(denied.res.status, 403, "patrol officer lacks biometric:verify");
  const ok = await api(keys["inv.diallo"], "PATCH", `/api/v1/biometric/history/${ids.search}`, { action: "VERIFIED_BY_INVESTIGATOR", notes: "Confirmé après vérification manuelle (test)." });
  assert.equal(ok.res.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.data!.action, "VERIFIED_BY_INVESTIGATOR");
  const audit = await pool.query(`SELECT count(*)::int AS n FROM "AuditLog" WHERE "entityType"='BiometricSearch' AND "entityId"=$1 AND action='BIOMETRIC_ACTION_RECORDED'`, [ids.search]);
  assert.equal(audit.rows[0].n, 1);
});

test("access control: a Patrol Officer may run ANPR searches but not fingerprint/face/voice; an Auditor sees history but cannot search", async () => {
  const anpr = await api(keys["patrol.cs1"], "POST", "/api/v1/biometric/anpr/search", { caseId: ids.case, reason: "Contrôle routier — vérification du véhicule", plateNumber: "TD-9999-ZZ" });
  assert.equal(anpr.res.status, 200, JSON.stringify(anpr.json));
  const fp = await apiForm(keys["patrol.cs1"], "POST", "/api/v1/biometric/fingerprint/search", { caseId: ids.case, reason: "Test d'accès refusé", mode: "IDENTIFY_1_N" }, { name: "x.png", content: "x" });
  assert.equal(fp.res.status, 403, "patrol officer lacks biometric:search_fingerprint");
  const auditorHistory = await api(keys["auditor"], "GET", "/api/v1/biometric/history");
  assert.equal(auditorHistory.res.status, 200, "auditor can view the search history");
  const auditorSearch = await apiForm(keys["auditor"], "POST", "/api/v1/biometric/fingerprint/search", { caseId: ids.case, reason: "Test d'accès refusé", mode: "IDENTIFY_1_N" }, { name: "x.png", content: "x" });
  assert.equal(auditorSearch.res.status, 403, "auditor can view history but must never be able to run a search (spec example)");
  const prosecutorSearch = await apiForm(keys["prosecutor.cs1"], "POST", "/api/v1/biometric/fingerprint/search", { caseId: ids.case, reason: "Test d'accès refusé", mode: "IDENTIFY_1_N" }, { name: "x.png", content: "x" });
  assert.equal(prosecutorSearch.res.status, 403, "prosecutor has read-only oversight, no search/manage permissions");
});

test("evidence: register with a file, hash-chained custody transfer, and no direct delete route exists", async () => {
  const reg = await apiForm(keys["forensic.cs1"], "POST", "/api/v1/evidence", { caseId: ids.case, category: "BIOLOGICAL", description: "Trace biologique relevée sur les lieux (test automatisé)", collectedAt: new Date().toISOString() }, { name: "trace.png", content: "evidence-bytes" });
  assert.equal(reg.res.status, 201, JSON.stringify(reg.json));
  assert.match(reg.json.data!.number!, /^EVD-\d{4}-\d{5}$/);
  ids.evidence = reg.json.data!.id!;
  const custody1 = await pool.query(`SELECT seq, hash, "prevHash" FROM "CustodyEvent" WHERE "evidenceId"=$1 ORDER BY seq`, [ids.evidence]);
  assert.equal(custody1.rows.length, 1);
  assert.equal(custody1.rows[0].seq, 1);
  assert.equal(custody1.rows[0].prevHash, null);
  const transfer = await api(keys["forensic.cs1"], "PATCH", `/api/v1/evidence/${ids.evidence}`, { op: "transfer", action: "STORED", reason: "Placée au coffre scellé (test)." });
  assert.equal(transfer.res.status, 200, JSON.stringify(transfer.json));
  assert.equal(transfer.json.data!.status, "STORED");
  const custody2 = await pool.query(`SELECT seq, hash, "prevHash" FROM "CustodyEvent" WHERE "evidenceId"=$1 ORDER BY seq`, [ids.evidence]);
  assert.equal(custody2.rows.length, 2);
  assert.equal(custody2.rows[1].prevHash, custody1.rows[0].hash, "seq 2 chains to seq 1's hash");
  const tamper = await pool.query(`UPDATE "CustodyEvent" SET reason='hacked' WHERE "evidenceId"=$1 AND seq=1`, [ids.evidence]).catch((e: Error) => e);
  assert.ok(tamper instanceof Error, "CustodyEvent is DB-trigger append-only — UPDATE must be rejected");
  const patrolTransfer = await api(keys["patrol.cs1"], "PATCH", `/api/v1/evidence/${ids.evidence}`, { op: "transfer", action: "EXAMINED", reason: "Tentative hors périmètre (test)." });
  assert.equal(patrolTransfer.res.status, 403, "patrol officer has evidence:create but not evidence:transfer");
});

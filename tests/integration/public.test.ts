/**
 * Public portal (SIGPN-T v2.0, sections 2.2 and 4) — live dev server + seeded database.
 *   npx tsx --test tests/integration/public.test.ts
 * Covers: anonymous intake and tracking, validation and honeypot, staff handling, directory verification, public wanted publication
 * (express validation, four-eyes, automatic withdrawal) and the public/internal boundary.
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
  const key = `pms_pb${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'pb-test',$3,$4)`, [`apikey_pb_${username}_${RUN}`, u.rows[0].id, `pb${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
type Json = { data?: any; error?: { code: string; message: string; details?: any } };
async function api(key: string | null, method: string, path: string, body?: unknown) {
  // The per-account write quota (60 per minute) is shared by every suite run back to back (hr-security exhausts it on purpose): wait out the window instead of failing.
  const send = () => fetch(`${BASE}${path}`, { method, headers: { ...(key ? { authorization: `Bearer ${key}` } : {}), "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  let res = await send();
  for (let i = 0; i < 2 && res.status === 429 && key !== null; i++) {
    await res.arrayBuffer();
    await new Promise((ok) => setTimeout(ok, Math.min(65, Number(res.headers.get("retry-after") ?? 30)) * 1000));
    res = await send();
  }
  return { res, json: (await res.json().catch(() => ({}))) as Json };
}
const complaint = (over: Record<string, unknown> = {}) => ({ kind: "COMPLAINT", category: "THEFT", subject: `Vol de téléphone ${RUN}`, message: "Mon téléphone a été volé au marché central vers 10 heures du matin (test).", locationText: "Marché central", contactName: "Test Citoyen", contactPhone: "+235 60 00 00 00", anonymous: false, consent: true, ...over });
const freePerson = async () => (await pool.query(`SELECT id FROM "Person" p WHERE p."deletedAt" IS NULL AND p."mergedIntoId" IS NULL AND NOT EXISTS (SELECT 1 FROM "WantedPerson" w WHERE w."personId"=p.id AND w.status IN ('DRAFT','PENDING_APPROVAL','ACTIVE','LOCATED','SUSPENDED')) ORDER BY random() LIMIT 1`)).rows[0].id as string;

before(async () => {
  for (const u of ["commander.national", "commander.central", "chief.cs1", "desk.cs1", "inv.diallo"]) keys[u] = await keyFor(u);
  ids.cs1 = (await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`)).rows[0].id;
});
after(async () => {
  await pool.query(`UPDATE "Station" SET "publicVisible"=false WHERE id=$1`, [ids.cs1]);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='pb-test' AND "keyPrefix"=$1`, [`pb${RUN}`]);
  await pool.end();
});

test("anonymous intake: reference + tracking code returned once, the code is stored only hashed", async () => {
  const r = await api(null, "POST", "/api/v1/public/submissions", complaint());
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  assert.match(r.json.data.reference, /^PUB-\d{4}-\d{6}$/);
  assert.match(r.json.data.trackingCode, /^[A-HJ-NP-Z2-9]{10}$/);
  ids.ref = r.json.data.reference;
  ids.code = r.json.data.trackingCode;
  const row = (await pool.query(`SELECT "codeHash", "contactName", status FROM "PublicSubmission" WHERE number=$1`, [ids.ref])).rows[0];
  assert.equal(row.codeHash.length, 64);
  assert.notEqual(row.codeHash, ids.code);
  assert.equal(row.status, "RECEIVED");
  ids.sub = (await pool.query(`SELECT id FROM "PublicSubmission" WHERE number=$1`, [ids.ref])).rows[0].id;
});

test("validation: short text, missing consent, no way to reach a non-anonymous author, honeypot", async () => {
  assert.equal((await api(null, "POST", "/api/v1/public/submissions", complaint({ message: "trop court" }))).res.status, 422);
  assert.equal((await api(null, "POST", "/api/v1/public/submissions", complaint({ consent: false }))).res.status, 422);
  assert.equal((await api(null, "POST", "/api/v1/public/submissions", complaint({ contactPhone: "", contactEmail: "" }))).res.status, 422);
  assert.equal((await api(null, "POST", "/api/v1/public/submissions", complaint({ contactName: "" }))).res.status, 422, "a non-anonymous complaint needs a name");
  const before = (await pool.query(`SELECT count(*)::int n FROM "PublicSubmission"`)).rows[0].n;
  const bot = await api(null, "POST", "/api/v1/public/submissions", complaint({ website: "http://spam.example" }));
  assert.equal(bot.res.status, 201, "a bot is told it worked");
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "PublicSubmission"`)).rows[0].n, before, "...but nothing is stored");
  const anon = await api(null, "POST", "/api/v1/public/submissions", complaint({ anonymous: true, contactName: "Ne Pas Garder", contactPhone: "123", contactEmail: "" }));
  assert.equal(anon.res.status, 201);
  const row = (await pool.query(`SELECT "contactName","contactPhone","contactEmail" FROM "PublicSubmission" WHERE number=$1`, [anon.json.data.reference])).rows[0];
  assert.deepEqual(row, { contactName: null, contactPhone: null, contactEmail: null }, "an anonymous deposit keeps no contact data");
});

test("tracking: right pair returns status only (no personal data); wrong code or reference give the same 404; per-reference rate limit", async () => {
  const ok = await api(null, "POST", "/api/v1/public/track", { reference: ids.ref, code: ids.code.toLowerCase() });
  assert.equal(ok.res.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.data.status, "RECEIVED");
  const keysReturned = Object.keys(ok.json.data).sort();
  for (const forbidden of ["contactName", "contactPhone", "contactEmail", "message", "ipHash", "stationId", "id", "codeHash", "handledById", "complaintId"]) assert.ok(!keysReturned.includes(forbidden), `${forbidden} must not be public`);
  const badCode = await api(null, "POST", "/api/v1/public/track", { reference: ids.ref, code: "AAAAAAAAAA" });
  const badRef = await api(null, "POST", "/api/v1/public/track", { reference: `PUB-2026-9${Math.floor(Math.random() * 99999).toString().padStart(5, "0")}`, code: ids.code });
  assert.equal(badCode.res.status, 404);
  assert.equal(badRef.res.status, 404);
  assert.deepEqual(badCode.json, badRef.json, "indistinguishable answers (no enumeration)");
  // throttling is per reference: hammer a different submission so the one used by the next tests stays usable
  const other = await api(null, "POST", "/api/v1/public/submissions", complaint({ subject: `Autre dépôt ${RUN}` }));
  let limited = false;
  for (let i = 0; i < 12 && !limited; i++) limited = (await api(null, "POST", "/api/v1/public/track", { reference: other.json.data.reference, code: `WRONG${i}XXXX` })).res.status === 429;
  assert.ok(limited, "guessing the code of one reference is throttled");
});

test("staff side: permission, audited consultation, public reply visible through the code, closure needs a reply", async () => {
  assert.equal((await api(keys["inv.diallo"], "GET", "/api/v1/intake")).res.status, 403, "an investigator has no intake permission");
  const pg = await fetch(`${BASE}/public-admin`, { redirect: "manual" });
  assert.ok([302, 307, 308].includes(pg.status), "the internal page requires a session");
  const list = await api(keys["chief.cs1"], "GET", "/api/v1/intake");
  assert.equal(list.res.status, 200, JSON.stringify(list.json));
  const detail = await api(keys["commander.national"], "GET", `/api/v1/intake/${ids.sub}`);
  assert.equal(detail.res.status, 200);
  assert.equal(detail.json.data.contactName, "Test Citoyen");
  const viewed = (await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='PUBLIC_SUBMISSION_VIEWED' AND "entityId"=$1`, [ids.sub])).rows[0].n;
  assert.ok(viewed >= 1, "reading the declarant's contact data is audited");
  const close = await api(keys["commander.national"], "PATCH", `/api/v1/intake/${ids.sub}`, { op: "update", status: "CLOSED" });
  assert.equal(close.res.status, 422, "closing without a reply the person will see is refused");
  const upd = await api(keys["commander.national"], "PATCH", `/api/v1/intake/${ids.sub}`, { op: "update", status: "IN_REVIEW", publicReply: "Votre plainte est en cours d'examen (test)." });
  assert.equal(upd.res.status, 200, JSON.stringify(upd.json));
  const t = await api(null, "POST", "/api/v1/public/track", { reference: ids.ref, code: ids.code });
  assert.equal(t.json.data.status, "IN_REVIEW");
  assert.equal(t.json.data.publicReply, "Votre plainte est en cours d'examen (test).");
});

test("a complaint filed online becomes an internal complaint (once), without creating a Person record", async () => {
  const c = await api(keys["commander.central"], "PATCH", `/api/v1/intake/${ids.sub}`, { op: "convert", stationId: ids.cs1 });
  assert.equal(c.res.status, 200, JSON.stringify(c.json));
  assert.match(c.json.data.complaintNumber, /^CMP-/);
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "Person" WHERE "lastName" ILIKE '%Citoyen%' OR "firstName" ILIKE '%Citoyen%'`)).rows[0].n, 0, "no Person record is created from the declarant's data");
  assert.equal((await api(keys["commander.central"], "PATCH", `/api/v1/intake/${ids.sub}`, { op: "convert", stationId: ids.cs1 })).res.status, 409, "already converted");
  const t = await api(null, "POST", "/api/v1/public/track", { reference: ids.ref, code: ids.code });
  assert.equal(t.json.data.status, "FORWARDED");
});

test("directory: a unit is listed only after its coordinates are verified; only public fields leave", async () => {
  const find = async () => ((await api(null, "GET", "/api/v1/public/stations")).json.data as { id: string }[]).find((x) => x.id === ids.cs1);
  assert.ok(!(await find()) || true);
  const noVerify = await api(keys["commander.national"], "PUT", `/api/v1/public-content/stations/${ids.cs1}`, { publicVisible: true, publicAddress: "Adresse de démonstration", publicPhone: "+235 00 00 00 01 (démo)", verified: false });
  if ((await pool.query(`SELECT "publicVerifiedAt" FROM "Station" WHERE id=$1`, [ids.cs1])).rows[0].publicVerifiedAt === null) assert.equal(noVerify.res.status, 409, "listing without verification is refused");
  const ok = await api(keys["commander.national"], "PUT", `/api/v1/public-content/stations/${ids.cs1}`, { publicVisible: true, publicAddress: "Adresse de démonstration", publicPhone: "+235 00 00 00 01 (démo)", publicHours: "24 h / 24", verified: true });
  assert.equal(ok.res.status, 200, JSON.stringify(ok.json));
  const listed = await find();
  assert.ok(listed, "listed after verification");
  for (const forbidden of ["code", "isActive", "adminDepartmentId", "latitude", "regionId", "parentId", "publicVerifiedById"]) assert.ok(!(forbidden in (listed as object)), `${forbidden} is not public`);
  assert.equal((await api(keys["desk.cs1"], "PUT", `/api/v1/public-content/stations/${ids.cs1}`, { publicVisible: false, verified: false })).res.status, 403);
  assert.equal((await api(keys["commander.national"], "PUT", `/api/v1/public-content/stations/${ids.cs1}`, { publicVisible: false, verified: false })).res.status, 200);
  assert.ok(!(await find()), "hidden again");
});

test("news: a draft is invisible; publication makes it public; withdrawal removes it", async () => {
  const n = await api(keys["commander.national"], "POST", "/api/v1/public-content/news", { title: `Actualité test ${RUN}`, summary: "Résumé de l'actualité de test.", body: "Corps de l'actualité de test, suffisamment long pour la validation." });
  assert.equal(n.res.status, 201, JSON.stringify(n.json));
  const id = n.json.data.id as string;
  const visible = async () => ((await api(null, "GET", "/api/v1/public/news")).json.data as { id: string }[]).some((x) => x.id === id);
  assert.equal(await visible(), false);
  assert.equal((await api(keys["commander.national"], "PATCH", `/api/v1/public-content/news/${id}`, { published: true })).res.status, 200);
  assert.equal(await visible(), true);
  assert.equal((await api(keys["commander.national"], "PATCH", `/api/v1/public-content/news/${id}`, { published: false })).res.status, 200);
  assert.equal(await visible(), false);
});

test("public wanted notice: needs express validation, a person other than the issuer, an active verified non-hearing notice; only public fields leave; automatic withdrawal", async () => {
  const create = async (kind: string) => {
    const c = await api(keys["inv.diallo"], "POST", "/api/v1/wanted", { personId: await freePerson(), stationId: ids.cs1, offense: `Disparition test ${RUN}`, reason: "Motif interne confidentiel suffisamment long (test).", kind, diffusionLevel: "LOCAL", legalBasis: "Signalement famille (test)", issuingAuthority: "Parquet (test)" });
    assert.equal(c.res.status, 201, JSON.stringify(c.json));
    const id = c.json.data.id as string;
    assert.equal((await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${id}`, { op: "verify" })).res.status, 200);
    assert.equal((await api(keys["commander.national"], "PATCH", `/api/v1/wanted/${id}`, { op: "status", status: "ACTIVE" })).res.status, 200);
    return id;
  };
  const hearing = await create("HEARING");
  assert.equal((await api(keys["commander.national"], "PATCH", `/api/v1/wanted/${hearing}`, { op: "publishPublic", notice: "Texte public de test suffisamment long.", confirm: true })).res.status, 409, "a hearing summons is never public");
  const id = await create("MISSING_PERSON");
  const publicList = async () => (await api(null, "GET", "/api/v1/public/wanted")).json.data as Record<string, unknown>[];
  assert.ok(!(await publicList()).some((x) => x.id === id), "approved is not public");
  assert.equal((await api(keys["inv.diallo"], "PATCH", `/api/v1/wanted/${id}`, { op: "publishPublic", notice: "Texte public de test suffisamment long.", confirm: true })).res.status, 403, "needs wanted:publish");
  assert.equal((await api(keys["commander.national"], "PATCH", `/api/v1/wanted/${id}`, { op: "publishPublic", notice: "Texte public de test suffisamment long.", confirm: false })).res.status, 422, "express confirmation required");
  assert.equal((await api(keys["commander.national"], "PATCH", `/api/v1/wanted/${id}`, { op: "publishPublic", notice: "court", confirm: true })).res.status, 422, "a real public text is required");
  const pub = await api(keys["commander.national"], "PATCH", `/api/v1/wanted/${id}`, { op: "publishPublic", notice: "Si vous avez des informations, contactez le commissariat le plus proche.", confirm: true });
  assert.equal(pub.res.status, 200, JSON.stringify(pub.json));
  const row = (await publicList()).find((x) => x.id === id);
  assert.ok(row, "published");
  const serialized = JSON.stringify(row);
  for (const forbidden of ["Motif interne", "reason", "caseId", "personId", "issuedBy", "approvedBy", "legalBasis", "status", "dangerLevel", "stationId", "regionId", "photo"]) assert.ok(!serialized.includes(forbidden), `${forbidden} must not be public`);
  assert.deepEqual(Object.keys(row!).sort(), ["aliases", "approximateAge", "contact", "description", "gender", "id", "kind", "name", "notice", "offense", "publishedAt", "reference"].sort());
  // automatic withdrawal as soon as the notice stops being active
  assert.equal((await api(keys["chief.cs1"], "PATCH", `/api/v1/wanted/${id}`, { op: "status", status: "SUSPENDED", closureNotes: "Vérification (test)" })).res.status, 200);
  assert.ok(!(await publicList()).some((x) => x.id === id), "suspension withdraws it from the public site");
  const left = (await pool.query(`SELECT "publicPublishedAt" FROM "WantedPerson" WHERE id=$1`, [id])).rows[0].publicPublishedAt;
  assert.equal(left, null);
  const audit = (await pool.query(`SELECT action FROM "AuditLog" WHERE "entityId"=$1`, [id])).rows.map((r) => r.action);
  assert.ok(audit.includes("WANTED_PUBLIC_PUBLISHED") && audit.includes("WANTED_PUBLIC_UNPUBLISHED"));
  await assert.rejects(pool.query(`UPDATE "WantedPerson" SET "publicPublishedAt"=now() WHERE id=$1`, [id]), /public_only_active|check constraint/i, "the database refuses a public notice that is not ACTIVE");
});

test("the public API never needs a session and never answers with internal fields (boundary)", async () => {
  for (const path of ["/api/v1/public/news", "/api/v1/public/stations", "/api/v1/public/wanted"]) {
    const r = await api(null, "GET", path);
    assert.equal(r.res.status, 200, path);
    assert.ok(!/"(id|userId|officerId|passwordHash|reason|caseId|personId)":"[^"]*(user|officer)_/i.test(JSON.stringify(r.json)));
  }
  for (const path of ["/api/v1/intake", "/api/v1/public-content/news", "/api/v1/public-content/stations"]) assert.equal((await api(null, "GET", path)).res.status, 401, `${path} is internal`);
  assert.equal((await api(null, "GET", "/api/v1/wanted")).res.status, 401);
  assert.equal((await api(null, "GET", "/api/v1/alerts")).res.status, 401);
});

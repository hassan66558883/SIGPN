/**
 * Wanted-persons search (the mock-up screen) — live dev server + seeded database:
 *   npx tsx --test tests/integration/wanted-search.test.ts
 * Builds its own persons and notices (unique surname per run), uses temporary API keys, and removes everything at the end.
 */
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";

const BASE = process.env.PMS_URL ?? "http://localhost:3300";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: "-c timezone=UTC" });
const RUN = Date.now().toString(36).toUpperCase();
const NAME = `ZZTEST${RUN}`;
const keys: Record<string, string> = {};
const ids = { personNat: `p_ws_nat_${RUN}`, personLoc: `p_ws_loc_${RUN}`, personPlain: `p_ws_pln_${RUN}`, noticeNat: `w_ws_nat_${RUN}`, noticeLoc: `w_ws_loc_${RUN}` };

async function keyFor(username: string): Promise<string> {
  const key = `pms_it${RUN.slice(-4).toLowerCase()}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'integration',$3,$4)`, [`apikey_ws_${username}_${RUN}`, u.rows[0].id, `it${RUN.slice(-4).toLowerCase()}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function search(who: string, qs: string) {
  const res = await fetch(`${BASE}/api/v1/wanted/search?${qs}`, { headers: { authorization: `Bearer ${keys[who]}` } });
  const json = (await res.json().catch(() => ({}))) as { data?: any; error?: { code: string } };
  return { res, json, text: JSON.stringify(json) };
}
const audits = async (who: string) => (await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='WANTED_SEARCHED' AND "actorLabel" LIKE $1`, [`${who}%`])).rows[0].n as number;

before(async () => {
  for (const u of ["commander.national", "desk.post1", "chief.mdu", "fleet.central"]) keys[u] = await keyFor(u);
  const mdu = (await pool.query(`SELECT id, "regionId" FROM "Station" WHERE code='NS-01'`)).rows[0];
  const cs1 = (await pool.query(`SELECT id, "regionId" FROM "Station" WHERE code='CS-01'`)).rows[0];
  const issuer = (await pool.query(`SELECT id FROM "User" WHERE username='chief.mdu'`)).rows[0].id;
  const person = (id: string, first: string, station: { id: string; regionId: string }, dob: string) =>
    pool.query(`INSERT INTO "Person"(id, number, "firstName", "lastName", gender, "dateOfBirth", "stationId", "regionId", "updatedAt") VALUES ($1,$2,$3,$4,'MALE',$5,$6,$7, now())`, [id, `PER-ZZ-${id.slice(5, 11)}-${RUN}`, first, NAME, dob, station.id, station.regionId]);
  await person(ids.personNat, "Alpha", mdu, "1990-03-14");
  await person(ids.personLoc, "Bravo", mdu, "1985-07-01");
  await person(ids.personPlain, "Charlie", cs1, "1975-01-20");
  await pool.query(`INSERT INTO "PersonIdentifier"(id, "personId", type, value) VALUES ($1,$2,'NATIONAL_ID',$3)`, [`pi_ws_${RUN}`, ids.personNat, `TDZZ${RUN}`]);
  const notice = (id: string, personId: string, diffusion: string, label: string) =>
    pool.query(`INSERT INTO "WantedPerson"(id, number, "personId", "regionId", "stationId", offense, reason, status, "issuedById", kind, "diffusionLevel", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,'Motif interne confidentiel du test','ACTIVE',$7,'SEARCH_WARRANT',$8::"WantedDiffusion", now())`, [id, `WP-ZZ-${id.slice(5, 11)}-${RUN}`, personId, mdu.regionId, mdu.id, `Escroquerie aggravée (${label})`, issuer, diffusion]);
  await notice(ids.noticeNat, ids.personNat, "NATIONAL", "diffusion nationale");
  await notice(ids.noticeLoc, ids.personLoc, "LOCAL", "diffusion locale");
});
after(async () => {
  await pool.query(`DELETE FROM "WantedPerson" WHERE id = ANY($1)`, [[ids.noticeNat, ids.noticeLoc]]);
  await pool.query(`DELETE FROM "PersonIdentifier" WHERE "personId" = ANY($1)`, [[ids.personNat, ids.personLoc, ids.personPlain]]);
  await pool.query(`DELETE FROM "Person" WHERE id = ANY($1)`, [[ids.personNat, ids.personLoc, ids.personPlain]]);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='integration' AND "keyPrefix"=$1`, [`it${RUN.slice(-4).toLowerCase()}`]);
  await pool.end();
});

test("a person wanted by another unit is found through the national diffusion: identity and offence, never the internal reason", async () => {
  const r = await search("desk.post1", `search=${NAME}&src=NATIONAL_DB&src=WANTED`);
  assert.equal(r.res.status, 200, r.text);
  const d = r.json.data;
  assert.equal(d.state, "MATCH");
  assert.equal(d.matches.length, 1);
  const m = d.matches[0];
  assert.equal(m.noticeId, ids.noticeNat);
  assert.equal(m.person.firstName, "Alpha");
  assert.equal(m.person.identifier.value, `TDZZ${RUN}`);
  assert.match(m.offense, /diffusion nationale/);
  assert.equal(m.dossierAccessible, false, "the dossier belongs to the issuing unit: the Ndjamena desk cannot open it");
  assert.ok(!r.text.includes("Motif interne confidentiel"), "the internal reason of a notice never leaves");
  assert.ok(!("reason" in m));
  // the notice with a LOCAL diffusion is not visible outside its unit, and its person is out of this desk's scope too
  assert.ok(!d.matches.some((x: { noticeId: string }) => x.noticeId === ids.noticeLoc));
});

test("the unit that holds the file sees both notices and may open the dossier", async () => {
  const r = await search("chief.mdu", `search=${NAME}`);
  const d = r.json.data;
  assert.equal(d.matches.length, 2);
  assert.ok(d.matches.every((m: { dossierAccessible: boolean }) => m.dossierAccessible));
  assert.deepEqual(d.matches.map((m: { noticeId: string }) => m.noticeId).sort(), [ids.noticeLoc, ids.noticeNat].sort());
});

test("a person who is known but not wanted is said so, not reported as 'no result'", async () => {
  const r = await search("commander.national", `search=Charlie ${NAME}`);
  const d = r.json.data;
  assert.equal(d.state, "KNOWN");
  assert.equal(d.matches.length, 0);
  assert.equal(d.known.length, 1);
  assert.equal(d.known[0].id, ids.personPlain);
});

test("no match is 'none'; a single character or no source is refused with a reason", async () => {
  assert.equal((await search("commander.national", "search=Zzqxjvw")).json.data.state, "NONE");
  const short = await search("commander.national", "search=a");
  assert.equal(short.json.data.state, "EMPTY");
  assert.equal(short.json.data.problem, "NO_CRITERIA");
  const noSource = await search("commander.national", `search=${NAME}&src=VIDEO`);
  assert.equal(noSource.json.data.problem, "NO_SOURCE", "a source that is not connected is not a source");
});

test("the sources are honest: the journal lists what was queried with real timings, and what is not connected", async () => {
  const d = (await search("commander.national", `search=${NAME}`)).json.data;
  assert.deepEqual(d.steps.map((s: { source: string }) => s.source).sort(), ["NATIONAL_DB", "WANTED"]);
  assert.ok(d.steps.every((s: { ms: number; count: number }) => Number.isInteger(s.ms) && s.ms >= 0 && Number.isInteger(s.count)));
  assert.deepEqual(d.notQueried, ["BORDERS", "VIDEO", "INTEROP"]);
  assert.equal(typeof d.totalMs, "number");
  // only the wanted notices: the person who is merely known no longer appears
  const wantedOnly = (await search("commander.national", `search=Charlie ${NAME}&src=WANTED`)).json.data;
  assert.equal(wantedOnly.state, "NONE");
  assert.deepEqual(wantedOnly.steps.map((s: { source: string }) => s.source), ["WANTED"]);
});

test("advanced search: date of birth, identity number and offence narrow the result", async () => {
  const hit = (await search("commander.national", `mode=advanced&lastName=${NAME}&dateOfBirth=1990-03-14`)).json.data;
  assert.equal(hit.matches.length, 1);
  assert.equal(hit.matches[0].person.firstName, "Alpha");
  assert.equal((await search("commander.national", `mode=advanced&lastName=${NAME}&dateOfBirth=1991-03-14`)).json.data.state, "NONE", "a wrong date of birth finds nobody");
  assert.equal((await search("commander.national", `mode=advanced&idNumber=TDZZ${RUN}`)).json.data.matches[0].noticeId, ids.noticeNat, "by identity document number");
  const byOffense = await search("commander.national", `mode=advanced&lastName=${NAME}&offense=${encodeURIComponent("diffusion locale")}`);
  assert.equal(byOffense.json.data?.matches?.length, 1, "by offence");
  assert.equal(byOffense.json.data.matches[0].noticeId, ids.noticeLoc);
  // a national actor sees every notice in force, whatever its diffusion (a local one included)
  const all = (await search("commander.national", `search=${NAME}`)).json.data;
  assert.deepEqual(all.matches.map((m: { noticeId: string }) => m.noticeId).sort(), [ids.noticeLoc, ids.noticeNat].sort());
});

test("every search is audited with who looked for what and what was found; a role without the permission is refused", async () => {
  const before = await audits("desk.post1");
  await search("desk.post1", `search=${NAME}`);
  assert.equal(await audits("desk.post1"), before + 1);
  const row = (await pool.query(`SELECT summary, after FROM "AuditLog" WHERE action='WANTED_SEARCHED' AND "actorLabel" LIKE 'desk.post1%' ORDER BY "chainSeq" DESC LIMIT 1`)).rows[0];
  assert.match(row.summary, new RegExp(NAME));
  assert.deepEqual(row.after.noticeIds, [ids.noticeNat]);
  assert.equal((await search("fleet.central", `search=${NAME}`)).res.status, 403, "a fleet manager has no wanted:view");
});

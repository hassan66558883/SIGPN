/**
 * HR phase 7: discipline (confidential procedure, sanctions and their effects), distinctions, central document
 * space (PDF + Word, frozen content, uploads) and identity photos.
 * Live dev server + seeded database (npm run db:seed).
 *   npx tsx --test tests/integration/hr-discipline.test.ts
 * Dedicated test structure and officers (deactivated at the end).
 */
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";

const BASE = process.env.PMS_URL ?? "http://localhost:3300";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const RUN = Date.now().toString(36).slice(-5);
const keys: Record<string, string> = {};
const off: Record<"D1" | "D2" | "D3", string> = { D1: "", D2: "", D3: "" };
let station = "";
let startedAt = new Date();
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

async function keyFor(username: string) {
  const key = `pms_ds${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing — run npm run db:seed`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'hr-discipline-test',$3,$4)`, [`apikey_ds_${username}_${RUN}`, u.rows[0].id, `ds${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function raw(who: string, path: string, method = "GET", body?: unknown) {
  const isForm = body instanceof FormData;
  return fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${keys[who]}`, ...(body && !isForm ? { "content-type": "application/json" } : {}) }, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
}
async function call(who: string, path: string, method = "GET", body?: unknown) {
  const res = await raw(who, path, method, body);
  const ct = res.headers.get("content-type") ?? "";
  const json = ct.includes("json") ? ((await res.json()) as { data?: any; error?: { code: string; message: string } }) : {};
  return { res, json, ct };
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const inDays = (n: number) => iso(new Date(Date.now() + n * 86_400_000));
const today = () => iso(new Date());
const is4xx = (r: { res: Response }) => r.res.status >= 400 && r.res.status < 500;
async function newOfficer(tag: string) {
  const r = await call("police.admin", "/api/v1/officers", "POST", { badgeNumber: `DSC${tag}${RUN}`.toUpperCase(), firstName: `Prenom${tag}`, lastName: `DSC${tag}${RUN}`, gender: "UNKNOWN", rankId: (await pool.query(`SELECT id FROM "Rank" WHERE code='GP'`)).rows[0].id, stationId: station, hiredAt: "2012-01-01" });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  return r.json.data.id as string;
}
async function openAndHear(officerId: string, opener = "hr.director") {
  const c = await call(opener, "/api/v1/hr/discipline", "POST", { officerId, facts: "Manquement grave aux obligations de service constaté lors d'un contrôle.", factsDate: inDays(-20) });
  assert.equal(c.res.status, 201, JSON.stringify(c.json));
  const id = c.json.data.id as string;
  assert.equal((await call(opener, `/api/v1/hr/discipline/${id}/step`, "POST", { kind: "HEARING", date: inDays(-5), note: "Audition de l'intéressé en présence de son supérieur." })).res.status, 201);
  return id;
}

before(async () => {
  startedAt = new Date();
  for (const u of ["police.admin", "hr.director", "hr.service", "chief.cs1", "commander.national", "commander.central"]) keys[u] = await keyFor(u);
  const region = (await pool.query(`SELECT "regionId" FROM "Station" WHERE code='CS-01'`)).rows[0].regionId;
  station = (await pool.query(`INSERT INTO "Station"(id,"regionId",code,name,type,status,"isActive","isDemo","updatedAt") VALUES ($1,$2,$3,'Structure de test discipline','STATION','ACTIVE',true,true,now()) RETURNING id`, [`st_ds_${RUN}`, region, `DSC${RUN}`.toUpperCase()])).rows[0].id;
  for (const k of ["D1", "D2", "D3"] as const) off[k] = await newOfficer(k.slice(1));
});

after(async () => {
  const ids = Object.values(off);
  await pool.query(`UPDATE "OfficerAssignment" SET "endDate"=now() WHERE "officerId" = ANY($1) AND "endDate" IS NULL`, [ids]);
  await pool.query(`UPDATE "Officer" SET "isActive"=false, "dutyStatus"='RETIRED', "administrativeStatus"='RETIRED' WHERE id = ANY($1)`, [ids]);
  await pool.query(`UPDATE "Station" SET status='INACTIVE', "isActive"=false WHERE id=$1`, [station]);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='hr-discipline-test' AND "keyPrefix"=$1`, [`ds${RUN}`]);
  await pool.end();
});

test("disciplinary files are confidential: only holders of the permission read, every access is audited", async () => {
  assert.equal((await call("hr.service", "/api/v1/hr/discipline")).res.status, 403);
  assert.equal((await call("chief.cs1", "/api/v1/hr/discipline")).res.status, 403);
  const list = await call("hr.director", "/api/v1/hr/discipline");
  assert.equal(list.res.status, 200);
  assert.ok((await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='HR_DISCIPLINE_LISTED' AND at >= $1`, [startedAt.toISOString()])).rows[0].n >= 1);
});

test("procedure: validation of the opening, steps, and rights of the defence before any sanction", async () => {
  const base = { officerId: off.D1, facts: "Manquement grave aux obligations de service.", factsDate: inDays(-20) };
  assert.equal((await call("hr.service", "/api/v1/hr/discipline", "POST", base)).res.status, 403);
  assert.ok(is4xx(await call("hr.director", "/api/v1/hr/discipline", "POST", { ...base, facts: "court" })), "facts must be described");
  assert.ok(is4xx(await call("hr.director", "/api/v1/hr/discipline", "POST", { ...base, factsDate: inDays(3) })), "facts cannot be in the future");
  const c = await call("hr.director", "/api/v1/hr/discipline", "POST", base);
  assert.equal(c.res.status, 201, JSON.stringify(c.json));
  assert.match(c.json.data.number, /^DIS-\d{4}-\d{5}$/);
  const id = c.json.data.id;
  const decide = (who: string, body: Record<string, unknown>) => call(who, `/api/v1/hr/discipline/${id}/decide`, "POST", { reason: "Faits établis après audition de l'intéressé.", ...body });
  assert.ok(is4xx(await decide("commander.national", { sanction: "WARNING" })), "not decidable before the procedure starts");
  assert.ok(is4xx(await call("hr.director", `/api/v1/hr/discipline/${id}/step`, "POST", { kind: "NOTIFICATION", date: inDays(-30), note: "Avant les faits" })), "step before the facts");
  assert.equal((await call("hr.director", `/api/v1/hr/discipline/${id}/step`, "POST", { kind: "NOTIFICATION", date: inDays(-10), note: "Notification écrite des griefs à l'intéressé." })).res.status, 201);
  assert.equal((await call("hr.director", `/api/v1/hr/discipline/${id}`)).json.data.status, "IN_PROCEDURE");
  assert.ok(is4xx(await decide("commander.national", { sanction: "WARNING" })), "a sanction needs a recorded hearing");
  assert.equal((await decide("hr.director", { sanction: "WARNING" })).res.status, 403, "HR director cannot decide");
  await call("hr.director", `/api/v1/hr/discipline/${id}/step`, "POST", { kind: "HEARING", date: inDays(-5), note: "Audition de l'intéressé." });
  assert.ok(is4xx(await call("commander.national", `/api/v1/hr/discipline/${id}/decide`, "POST", { sanction: "WARNING", reason: "court" })), "decision must be reasoned");
  const ok = await decide("commander.national", { sanction: "WARNING" });
  assert.equal(ok.res.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.data.status, "CLOSED");
  assert.match(ok.json.data.decisionNumber, /^DDI-\d{4}-\d{5}$/);
  assert.equal((await pool.query(`SELECT "administrativeStatus" FROM "Officer" WHERE id=$1`, [off.D1])).rows[0].administrativeStatus, "ACTIVE", "a warning changes nothing on the dossier");
  assert.ok(is4xx(await call("hr.director", `/api/v1/hr/discipline/${id}/step`, "POST", { kind: "NOTE", date: today(), note: "Après clôture" })), "closed file");
  assert.ok((await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='HR_DISCIPLINE_VIEWED' AND "entityId"=$1`, [id])).rows[0].n >= 1, "reading the file is audited");
  await assert.rejects(pool.query(`UPDATE "DisciplinaryStep" SET note='x' WHERE "caseId"=$1`, [id]), /append-only/);
  await assert.rejects(pool.query(`DELETE FROM "DisciplinaryCase" WHERE id=$1`, [id]), /append-only/);
});

test("four-eyes: whoever opened the file cannot decide it; a regional authority decides inside its province", async () => {
  const id = await openAndHear(off.D1, "commander.national");
  const body = { sanction: "REPRIMAND", reason: "Blâme motivé par la répétition des faits reprochés." };
  assert.ok(is4xx(await call("commander.national", `/api/v1/hr/discipline/${id}/decide`, "POST", body)), "opener cannot decide");
  const r = await call("commander.central", `/api/v1/hr/discipline/${id}/decide`, "POST", body);
  assert.equal(r.res.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.data.sanction, "REPRIMAND");
});

test("suspension: validated dates, takes effect on the dossier, ends by itself (reinstatement)", async () => {
  const id = await openAndHear(off.D2);
  const reason = "Suspension motivée par la gravité des faits.";
  assert.ok(is4xx(await call("commander.national", `/api/v1/hr/discipline/${id}/decide`, "POST", { sanction: "SUSPENSION", reason })), "dates required");
  assert.ok(is4xx(await call("commander.national", `/api/v1/hr/discipline/${id}/decide`, "POST", { sanction: "SUSPENSION", reason, startDate: today(), endDate: inDays(-1) })), "end before start");
  const r = await call("commander.national", `/api/v1/hr/discipline/${id}/decide`, "POST", { sanction: "SUSPENSION", reason, startDate: today(), endDate: inDays(2) });
  assert.equal(r.res.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.data.status, "DECIDED");
  const o = (await pool.query(`SELECT "administrativeStatus","dutyStatus" FROM "Officer" WHERE id=$1`, [off.D2])).rows[0];
  assert.deepEqual(o, { administrativeStatus: "SUSPENDED", dutyStatus: "SUSPENDED" });
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "CareerEvent" WHERE "officerId"=$1 AND type='SUSPENSION'`, [off.D2])).rows[0].n, 1);
  const tr = await call("police.admin", "/api/v1/hr/transfers", "POST", { officerId: off.D2, toStationId: (await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`)).rows[0].id, effectiveDate: today(), reason: "Mutation d'un agent suspendu" });
  assert.ok(is4xx(tr), "a suspended officer cannot be transferred");
  // time passes: the suspension is over -> the scheduler step reinstates the officer
  await pool.query(`UPDATE "DisciplinaryCase" SET "sanctionStart"=current_date - 5, "sanctionEnd"=current_date - 1 WHERE id=$1`, [id]);
  execSync("npm run hr:rotation", { cwd: process.cwd(), stdio: "pipe" });
  const back = (await pool.query(`SELECT "administrativeStatus","dutyStatus" FROM "Officer" WHERE id=$1`, [off.D2])).rows[0];
  assert.deepEqual(back, { administrativeStatus: "ACTIVE", dutyStatus: "ON_DUTY" });
  assert.equal((await pool.query(`SELECT status FROM "DisciplinaryCase" WHERE id=$1`, [id])).rows[0].status, "CLOSED");
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "CareerEvent" WHERE "officerId"=$1 AND type='REINSTATEMENT'`, [off.D2])).rows[0].n, 1);
});

test("dismissal removes the officer from the service", async () => {
  const id = await openAndHear(off.D3);
  const r = await call("commander.national", `/api/v1/hr/discipline/${id}/decide`, "POST", { sanction: "DISMISSAL", reason: "Révocation pour faute lourde établie après audition." });
  assert.equal(r.res.status, 200, JSON.stringify(r.json));
  const o = (await pool.query(`SELECT "administrativeStatus","isActive" FROM "Officer" WHERE id=$1`, [off.D3])).rows[0];
  assert.deepEqual(o, { administrativeStatus: "CEASED", isActive: false });
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "CareerEvent" WHERE "officerId"=$1 AND type='CESSATION'`, [off.D3])).rows[0].n, 1);
});

test("distinctions and rewards", async () => {
  const body = { officerId: off.D1, kind: "COMMENDATION", title: "Félicitations du commandement", awardedAt: inDays(-3), reason: "Arrestation d'un fugitif" };
  assert.equal((await call("chief.cs1", "/api/v1/hr/distinctions", "POST", body)).res.status, 403);
  assert.ok(is4xx(await call("hr.service", "/api/v1/hr/distinctions", "POST", { ...body, awardedAt: inDays(3) })));
  assert.equal((await call("hr.service", "/api/v1/hr/distinctions", "POST", body)).res.status, 201);
  const l = await call("hr.director", `/api/v1/hr/distinctions?officerId=${off.D1}`);
  assert.equal(l.json.data.length, 1);
});

test("documents: generation, frozen content, PDF and Word, one-time issue, confidentiality", async () => {
  const issue = (who: string, body: Record<string, unknown>) => call(who, "/api/v1/hr/documents", "POST", body);
  assert.equal((await issue("chief.cs1", { kind: "WORK_CERTIFICATE", officerId: off.D1 })).res.status, 403);
  const wc = await issue("hr.service", { kind: "WORK_CERTIFICATE", officerId: off.D1 });
  assert.equal(wc.res.status, 201, JSON.stringify(wc.json));
  assert.match(wc.json.data.number, /^DRH-\d{4}-\d{6}$/);
  const id = wc.json.data.id;
  const pdf = await raw("hr.service", `/api/v1/hr/documents/${id}/file?format=pdf`);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), "%PDF");
  const docx = await raw("hr.service", `/api/v1/hr/documents/${id}/file?format=docx`);
  assert.equal(docx.status, 200);
  assert.match(docx.headers.get("content-type") ?? "", /wordprocessingml/);
  const zip = Buffer.from(await docx.arrayBuffer());
  assert.equal(zip.subarray(0, 2).toString(), "PK");
  assert.ok(zip.includes(Buffer.from("word/document.xml")), "a real .docx package");
  // the content is frozen: a later change of the dossier does not alter the issued document
  await pool.query(`UPDATE "Officer" SET "firstName"='Renamed' WHERE id=$1`, [off.D1]);
  const snap = (await pool.query(`SELECT snapshot::text s FROM "HrDocument" WHERE id=$1`, [id])).rows[0].s as string;
  assert.ok(snap.includes(`PrenomD1`.replace("D1", "1")) || snap.includes("Prenom1"), "snapshot keeps the original name");
  assert.ok(!snap.includes("Renamed"));
  await pool.query(`UPDATE "Officer" SET "firstName"='Prenom1' WHERE id=$1`, [off.D1]);
  assert.ok((await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='HR_DOCUMENT_DOWNLOADED' AND "entityId"=$1`, [id])).rows[0].n >= 2, "downloads are audited");
  await assert.rejects(pool.query(`DELETE FROM "HrDocument" WHERE id=$1`, [id]), /append-only/);
  assert.equal((await call("chief.cs1", `/api/v1/hr/documents/${id}`)).res.status, 404, "outside the commander's scope");

  // appointment order tied to a career decision, issued once
  const promo = await call("hr.director", "/api/v1/hr/career-events", "POST", { officerId: off.D1, type: "PROMOTION", effectiveDate: today(), reference: `ARR-${RUN}-P`, toRankId: (await pool.query(`SELECT id FROM "Rank" WHERE code='BRG'`)).rows[0].id });
  assert.equal(promo.res.status, 201, JSON.stringify(promo.json));
  const ord = await issue("hr.service", { kind: "APPOINTMENT_ORDER", careerEventId: promo.json.data.id });
  assert.equal(ord.res.status, 201, JSON.stringify(ord.json));
  assert.equal((await issue("hr.service", { kind: "APPOINTMENT_ORDER", careerEventId: promo.json.data.id })).res.status, 409, "issued once");

  // training document only for a passed training
  const tid = (await pool.query(`INSERT INTO "Training"(id,"officerId",title,kind,"startDate",status,"updatedAt") VALUES ($1,$2,'Formation test documents','CONTINUING'::"TrainingKind",now() - interval '5 days','IN_PROGRESS',now()) RETURNING id`, [`tr_ds_${RUN}`, off.D1])).rows[0].id;
  assert.ok(is4xx(await issue("hr.service", { kind: "TRAINING_DOCUMENT", trainingId: tid })), "not passed yet");
  await call("hr.service", `/api/v1/hr/trainings/${tid}/evaluate`, "POST", { passed: true, score: 14 });
  assert.equal((await issue("hr.service", { kind: "TRAINING_DOCUMENT", trainingId: tid })).res.status, 201);

  // service note
  const note = await issue("hr.director", { kind: "SERVICE_NOTE", title: "Rappel sur les horaires", body: "Les horaires de service sont rappelés.\n\nLe respect de l'appel quotidien est obligatoire." });
  assert.equal(note.res.status, 201, JSON.stringify(note.json));
  const listed = await call("hr.service", "/api/v1/hr/documents?kind=SERVICE_NOTE&q=horaires");
  assert.ok((listed.json.data as any[]).some((d) => d.id === note.json.data.id));

  // confidential disciplinary document
  const dcase = (await pool.query(`SELECT id FROM "DisciplinaryCase" WHERE "officerId"=$1 AND sanction='REPRIMAND'`, [off.D1])).rows[0].id;
  assert.equal((await issue("hr.service", { kind: "DISCIPLINARY_DOCUMENT", caseId: dcase })).res.status, 403, "needs discipline access");
  const dd = await issue("hr.director", { kind: "DISCIPLINARY_DOCUMENT", caseId: dcase });
  assert.equal(dd.res.status, 201, JSON.stringify(dd.json));
  assert.equal(dd.json.data.confidential, true);
  assert.equal((await call("hr.service", `/api/v1/hr/documents/${dd.json.data.id}`)).res.status, 404, "invisible without discipline access");
  assert.ok(!(await call("hr.service", "/api/v1/hr/documents?pageSize=100")).json.data.some((d: any) => d.id === dd.json.data.id));
  assert.equal((await call("hr.director", `/api/v1/hr/documents/${dd.json.data.id}`)).res.status, 200);
});

test("uploads: type verified on content, permission by kind, bytes returned as stored", async () => {
  const form = (file: Blob, name: string, extra: Record<string, string> = {}) => {
    const f = new FormData();
    f.set("file", file, name);
    f.set("kind", "ADMIN_FILE");
    f.set("title", "Acte de naissance (copie)");
    f.set("officerId", off.D1);
    for (const [k, v] of Object.entries(extra)) f.set(k, v);
    return f;
  };
  assert.equal((await call("chief.cs1", "/api/v1/hr/documents/upload", "POST", form(new Blob([PNG]), "scan.png"))).res.status, 403);
  const fake = await call("hr.service", "/api/v1/hr/documents/upload", "POST", form(new Blob(["ceci n'est pas un pdf"]), "faux.pdf"));
  assert.ok(is4xx(fake), "a text file renamed .pdf is refused");
  assert.equal((await call("hr.service", "/api/v1/hr/documents/upload", "POST", form(new Blob([PNG]), "x.png", { kind: "DISCIPLINARY_DOCUMENT" }))).res.status, 403, "disciplinary uploads need hr:discipline_manage");
  const ok = await call("hr.service", "/api/v1/hr/documents/upload", "POST", form(new Blob([PNG]), "scan.png"));
  assert.equal(ok.res.status, 201, JSON.stringify(ok.json));
  assert.equal(ok.json.data.mimeType, "image/png");
  const back = await raw("hr.service", `/api/v1/hr/documents/${ok.json.data.id}/file`);
  assert.deepEqual(Buffer.from(await back.arrayBuffer()), PNG);
  const disc = await call("hr.director", "/api/v1/hr/documents/upload", "POST", form(new Blob([PNG]), "pv.png", { kind: "DISCIPLINARY_DOCUMENT" }));
  assert.equal(disc.res.status, 201);
  assert.equal(disc.json.data.confidential, true, "disciplinary uploads are always confidential");
});

test("identity photo: verified, scoped, retrievable", async () => {
  const send = (who: string, blob: Blob, name = "p.png") => {
    const f = new FormData();
    f.set("file", blob, name);
    return call(who, `/api/v1/hr/dossiers/${off.D1}/photo`, "POST", f);
  };
  assert.equal((await send("chief.cs1", new Blob([PNG]))).res.status, 403);
  assert.ok(is4xx(await send("hr.service", new Blob(["not an image"]), "p.png")));
  assert.ok(is4xx(await send("hr.service", new Blob([PNG, Buffer.alloc(2.5 * 1024 * 1024)]))), "over 2 MB");
  assert.equal((await send("hr.service", new Blob([PNG]))).res.status, 200);
  const img = await raw("hr.director", `/api/v1/hr/dossiers/${off.D1}/photo`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get("content-type"), "image/png");
  assert.equal((await raw("chief.cs1", `/api/v1/hr/dossiers/${off.D1}/photo`)).status, 404, "outside the scope");
});

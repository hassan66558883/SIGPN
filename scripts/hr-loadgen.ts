/**
 * `DATABASE_URL=…/pms_load npx tsx scripts/hr-loadgen.ts [officers=14000]` — builds a synthetic national dataset in a
 * SCRATCH database to measure the HR module at scale: ~300 structures, 14 000 officers (imported through the real
 * `hr:import` code), 30 days of attendance, leave, trainings, transfers, career events, documents and disciplinary files.
 * It refuses to run on any database whose name does not end with `_load`. Fictional data only.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { Client } from "pg";
import Module from "node:module";

const url = process.env.DATABASE_URL ?? "";
const dbName = new URL(url).pathname.replace(/^\//, "");
if (!dbName.endsWith("_load")) {
  console.error(`Refusing to run: database "${dbName}" is not a scratch database (name must end with _load).`);
  process.exit(2);
}
const TOTAL = Number(process.argv[2] ?? 14_000);

const m = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolve = m._resolveFilename;
m._resolveFilename = function (request: string, ...rest: unknown[]) {
  return request === "server-only" ? require.resolve("./empty.cjs") : resolve.call(this, request, ...rest);
};

let seed = 20261105;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = <T>(a: T[]) => a[Math.floor(rand() * a.length)];
const FIRST = ["Mahamat", "Abakar", "Hassan", "Idriss", "Moussa", "Ali", "Ibrahim", "Youssouf", "Adoum", "Oumar", "Fatimé", "Achta", "Zara", "Khadidja", "Hawa", "Mariam", "Halimé", "Ngarta", "Djimadoum", "Kemba"];
const LAST = ["Abdoulaye", "Mahamat", "Saleh", "Brahim", "Tahir", "Doumro", "Ngarmbatina", "Nadjita", "Kone", "Adam", "Issa", "Haroun", "Zakaria", "Bichara", "Youssouf", "Allamine", "Djibrine", "Senoussi", "Ouaddaï", "Koulamallah"];
const CITIES = ["N'Djamena", "Moundou", "Sarh", "Abéché", "Bongor", "Doba", "Pala", "Mongo", "Koumra", "Am Timan"];
const iso = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const c = new Client({ connectionString: url });
  await c.connect();
  const t0 = Date.now();
  const lap = (what: string) => console.log(`  ${what} — ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  // ---- structures: top up to ~300 under the 23 provinces ----
  const regions = (await c.query(`SELECT id, code FROM "Region" ORDER BY code`)).rows;
  const have = Number((await c.query(`SELECT count(*)::int n FROM "Station" WHERE "isActive"`)).rows[0].n);
  let n = 0;
  for (let i = have; i < 300; i++) {
    const r = regions[i % regions.length];
    await c.query(`INSERT INTO "Station"(id,"regionId",code,name,type,status,"isActive","isDemo","updatedAt") VALUES ($1,$2,$3,$4,$5::"StationType",'ACTIVE',true,true,now())`, [`st_load_${i}`, r.id, `LD-${String(i).padStart(3, "0")}`, `Commissariat de charge ${i}`, i % 12 === 0 ? "CENTRAL_STATION" : "STATION"]);
    n++;
  }
  lap(`structures: +${n}`);
  const stations = (await c.query(`SELECT code FROM "Station" WHERE "isActive" AND type IN ('STATION','CENTRAL_STATION') ORDER BY code`)).rows.map((r) => r.code as string);

  // ---- CSV of officers (pyramid of ranks) ----
  const ranks = [["GP", 0.34], ["GPHC", 0.14], ["BRG", 0.14], ["BC", 0.1], ["IP", 0.09], ["IPP", 0.06], ["OP", 0.05], ["OPP", 0.04], ["COM", 0.02], ["CPR", 0.01], ["CDIV", 0.005], ["CIV", 0.045]] as [string, number][];
  const pickRank = () => {
    let x = rand();
    for (const [code, w] of ranks) if ((x -= w) <= 0) return code;
    return "GP";
  };
  const rows = ["badgeNumber,firstName,lastName,gender,dateOfBirth,birthPlace,maritalStatus,rankCode,stationCode,positionCode,corpsCode,hiredAt,serviceStartDate,currentPostSince,phone,email"];
  for (let i = 0; i < TOTAL; i++) {
    const birthYear = 1965 + Math.floor(rand() * 38);
    const dob = new Date(Date.UTC(birthYear, Math.floor(rand() * 12), 1 + Math.floor(rand() * 27)));
    const hiredYear = Math.min(2025, birthYear + 20 + Math.floor(rand() * 8));
    const hired = new Date(Date.UTC(hiredYear, Math.floor(rand() * 12), 1 + Math.floor(rand() * 27)));
    const since = new Date(Date.now() - Math.floor(rand() * 40) * 30 * 86_400_000);
    const first = pick(FIRST);
    rows.push([`LD${String(i).padStart(6, "0")}`, first, pick(LAST), ["Fatimé", "Achta", "Zara", "Khadidja", "Hawa", "Mariam", "Halimé"].includes(first) ? "FEMALE" : "MALE", iso(dob), pick(CITIES), pick(["SINGLE", "MARRIED", "MARRIED", "DIVORCED"]), pickRank(), pick(stations), "", "", iso(hired), iso(hired), iso(since < hired ? hired : since), `+235 66${String(100000 + Math.floor(rand() * 899999))}`, ""].join(","));
  }
  const file = path.join(os.tmpdir(), "hr-loadgen-officers.csv");
  writeFileSync(file, rows.join("\n") + "\n");
  lap(`CSV written (${TOTAL} rows)`);

  // ---- import through the real importer ----
  const { importOfficers } = await import("../src/server/hr/import");
  const { readFileSync } = await import("node:fs");
  const dry = await importOfficers(readFileSync(file, "utf8"), { apply: false });
  lap(`importer dry run: ${dry.valid} valid, ${dry.errors.length} errors`);
  if (dry.errors.length) console.log(dry.errors.slice(0, 5));
  const real = await importOfficers(readFileSync(file, "utf8"), { apply: true });
  lap(`importer applied: ${real.created} created, ${real.skippedExisting} skipped`);

  // ---- history, by SQL (fast): attendance 30 days, leave, trainings, transfers, documents, discipline ----
  await c.query(`
    INSERT INTO "AttendanceRecord"(id,"officerId","stationId",date,status,"lateMinutes","updatedAt")
    SELECT 'att_' || md5(o.id || d::text), o.id, o."stationId", d::date,
           CASE WHEN r < 0.88 THEN 'PRESENT' WHEN r < 0.93 THEN 'LATE' ELSE 'ABSENT' END::"AttendanceStatus",
           CASE WHEN r >= 0.88 AND r < 0.93 THEN 5 + floor(random()*60)::int END, now()
    FROM (SELECT o.*, random() AS r FROM "Officer" o WHERE o."badgeNumber" LIKE 'LD%') o
    CROSS JOIN generate_series(current_date - 29, current_date, '1 day') d
    WHERE extract(isodow FROM d) < 6
    ON CONFLICT DO NOTHING`);
  lap(`attendance: ${(await c.query(`SELECT count(*)::int n FROM "AttendanceRecord"`)).rows[0].n} rows`);
  await c.query(`
    INSERT INTO "LeaveRequest"(id,number,"officerId","stationId",type,"startDate","endDate",days,status,"updatedAt")
    SELECT 'lv_' || o.id, 'CNG-LOAD-' || row_number() OVER (), o.id, o."stationId", (ARRAY['ANNUAL','EXCEPTIONAL','PERMISSION'])[1 + floor(random()*3)::int]::"LeaveType",
           current_date + s.off, current_date + s.off + 5, 6, (ARRAY['REQUESTED','APPROVED','APPROVED'])[1 + floor(random()*3)::int]::"LeaveStatus", now()
    FROM "Officer" o CROSS JOIN LATERAL (SELECT 10 + floor(random()*60)::int AS off) s WHERE o."badgeNumber" LIKE 'LD%' AND random() < 0.2`);
  await c.query(`
    INSERT INTO "Training"(id,"officerId",title,kind,"startDate",status,passed,"evaluatedAt","updatedAt")
    SELECT 'tr_' || o.id, o.id, 'Formation de charge ' || (1 + floor(random()*40)::int), (ARRAY['INITIAL','CONTINUING','INTERNSHIP','SPECIALIZED'])[1 + floor(random()*4)::int]::"TrainingKind",
           now() - (floor(random()*300)::int || ' days')::interval, (ARRAY['COMPLETED','COMPLETED','IN_PROGRESS','PLANNED'])[1 + floor(random()*4)::int]::"TrainingStatus",
           CASE WHEN random() < 0.5 THEN true END, CASE WHEN random() < 0.5 THEN now() - interval '30 days' END, now()
    FROM "Officer" o WHERE o."badgeNumber" LIKE 'LD%'`);
  await c.query(`
    INSERT INTO "TransferRequest"(id,number,"officerId","fromStationId","toStationId","effectiveDate",reason,status,"decisionNumber","validatedById","executedAt","updatedAt")
    SELECT 'tx_' || o.id, 'MUT-LOAD-' || row_number() OVER (), o.id, o."stationId", (SELECT id FROM "Station" WHERE "isActive" ORDER BY random() LIMIT 1), now(), 'Besoin de service',
           s.st::"TransferStatus", CASE WHEN s.st IN ('EXECUTED','APPROVED') THEN 'DAF-LOAD-' || row_number() OVER () END,
           CASE WHEN s.st IN ('EXECUTED','APPROVED') THEN (SELECT id FROM "User" LIMIT 1) END, CASE WHEN s.st = 'EXECUTED' THEN now() - (floor(random()*200)::int || ' days')::interval END, now()
    FROM (SELECT o.*, (ARRAY['PROPOSED','HR_APPROVED','EXECUTED','EXECUTED','REJECTED'])[1 + floor(random()*5)::int] AS st FROM "Officer" o WHERE o."badgeNumber" LIKE 'LD%' AND random() < 0.05) o
    CROSS JOIN LATERAL (SELECT o.st) s`);
  await c.query(`
    INSERT INTO "HrDocument"(id,number,kind,title,source,"officerId","stationId",snapshot)
    SELECT 'doc_' || o.id, 'DRH-LOAD-' || row_number() OVER (), 'WORK_CERTIFICATE'::"HrDocumentKind", 'Attestation de travail', 'GENERATED'::"HrDocumentSource", o.id, o."stationId", '{"title":"Attestation","number":"x","issuedAt":"2026-01-01","header":[],"paragraphs":["x"]}'::jsonb
    FROM "Officer" o WHERE o."badgeNumber" LIKE 'LD%' AND random() < 0.15`);
  await c.query(`
    INSERT INTO "DisciplinaryCase"(id,number,"officerId","stationId",facts,"factsDate",status,"updatedAt")
    SELECT 'dc_' || o.id, 'DIS-LOAD-' || row_number() OVER (), o.id, o."stationId", 'Faits de charge pour mesure de performance', current_date - 20, 'OPEN', now()
    FROM "Officer" o WHERE o."badgeNumber" LIKE 'LD%' AND random() < 0.02`);
  lap("leave, trainings, transfers, documents, disciplinary files");
  await c.query(`ANALYZE`);
  const counts = (await c.query(`SELECT (SELECT count(*) FROM "Officer") officers, (SELECT count(*) FROM "Station") stations, (SELECT count(*) FROM "AttendanceRecord") attendance, (SELECT count(*) FROM "LeaveRequest") leaves, (SELECT count(*) FROM "Training") trainings, (SELECT count(*) FROM "TransferRequest") transfers, (SELECT count(*) FROM "HrDocument") documents, (SELECT count(*) FROM "DisciplinaryCase") discipline`)).rows[0];
  console.log("dataset:", counts);
  await c.end();
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[hr-loadgen] failed:", e);
    process.exit(1);
  });

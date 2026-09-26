/**
 * Traffic offences and fines (SIGPN-T) — live dev server + seed.
 *   npx tsx --test tests/integration/traffic.test.ts
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- loose JSON shape of API responses */
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
const PLATE = `TD-${RUN.toUpperCase()}-ZZ`;
const CNI = `CNI${RUN}${Math.floor(Math.random() * 9000 + 1000)}`;

async function keyFor(username: string) {
  const key = `pms_tr${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing — run npm run db:seed`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'tr-test',$3,$4)`, [`apikey_tr_${username}_${RUN}`, u.rows[0].id, `tr${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
type Json = { data?: any; error?: { code: string; message: string }; meta?: any };
async function api(key: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as Json;
  return { res, json };
}
const now = () => new Date(Date.now() - 60_000).toISOString();

before(async () => {
  for (const u of ["control.cs1", "traffic.cs1", "traffic.supervisor", "finance.central", "readonly.traffic", "desk.cs1", "chief.cs1", "chief.arr5", "admin", "auditor"]) keys[u] = await keyFor(u);
  const cs1 = await pool.query(`SELECT id FROM "Station" WHERE code='CS-01'`);
  ids.cs1 = cs1.rows[0].id;
  for (const code of ["TRF-043", "TRF-016", "TRF-009", "TRF-002", "TRF-039"]) {
    const v = await pool.query(`SELECT id FROM "TrafficViolation" WHERE code=$1`, [code]);
    ids[code] = v.rows[0].id;
  }
  await pool.query(`DELETE FROM "SystemSetting" WHERE key IN ('traffic.allow_partial_payment','traffic.payment_deadline_days')`);
});
after(async () => {
  await pool.query(`DELETE FROM "SystemSetting" WHERE key IN ('traffic.allow_partial_payment','traffic.payment_deadline_days')`);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='tr-test' AND "keyPrefix"=$1`, [`tr${RUN}`]);
  await pool.end();
});

test("catalogue: 82 offences imported verbatim (67 road, 7 cycles, 8 moto-taxis); amounts and délits as in the source", async () => {
  const r = await api(keys["readonly.traffic"], "GET", "/api/v1/traffic/violations");
  assert.equal(r.res.status, 200);
  assert.equal(r.json.meta.summary.total, 82);
  const cats = Object.fromEntries(r.json.meta.summary.byCategory.map((c: { code: string; count: number }) => [c.code, c.count]));
  assert.deepEqual(cats, { ROAD: 67, CYCLE_MOTORCYCLE: 7, MOTO_TAXI: 8 });
  const byName = (n: string) => r.json.data.find((v: { name: string }) => v.name === n);
  assert.equal(byName("Excès de vitesse").fineAmountFcfa, 25000);
  assert.equal(byName("Arrêt interdit").fineAmountFcfa, 2200, "the source says 2 200 for this 3ème-classe offence: kept as is");
  assert.equal(byName("Défaut d’assurance").fineAmountFcfa, null, "délit: no forfaitaire amount");
  assert.equal(byName("Défaut d’assurance").fineAmountText, "Interdiction d’arbitrer");
  assert.equal(byName("Défait de la licence spéciale de transport SMT").category.code, "MOTO_TAXI", "source typo « Défait » kept");
});

test("permissions: read-only, desk and finance roles cannot record a control; control agent and traffic officer can", async () => {
  const body = { controlledAt: now(), location: "Avenue Charles de Gaulle, N'Djamena", plateNumber: PLATE, vehicleType: "CAR", violationIds: [] };
  for (const u of ["readonly.traffic", "desk.cs1", "finance.central", "auditor"]) assert.equal((await api(keys[u], "POST", "/api/v1/traffic/controls", body)).res.status, 403, u);
  assert.equal((await api(keys["control.cs1"], "GET", "/api/v1/traffic/controls")).res.status, 200);
});

test("compliant control: recorded without PV or fine", async () => {
  const r = await api(keys["control.cs1"], "POST", "/api/v1/traffic/controls", { controlledAt: now(), location: "Rond-point de la Paix", plateNumber: `TD-OK${RUN}-AA`.toUpperCase(), vehicleType: "CAR", driverFirstName: "Amina", driverLastName: `Conforme${RUN}`, observations: "Documents en règle" });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  assert.match(r.json.data.control.number, /^CTL-\d{4}-\d{5}$/);
  assert.equal(r.json.data.ticket, null);
  assert.equal(r.json.data.fine, null);
});

test("control with two offences: PV issued, automatic fine = sum of the flat amounts, sealed, numbered", async () => {
  const r = await api(keys["control.cs1"], "POST", "/api/v1/traffic/controls", {
    controlledAt: now(),
    location: "Route de Farcha, N'Djamena",
    latitude: 12.1348,
    longitude: 15.0557,
    driverFirstName: "Moussa",
    driverLastName: `Contrevenant${RUN}`,
    driverCni: CNI,
    licenseNumber: `PC-${RUN}-1`,
    licenseCategory: "B",
    plateNumber: PLATE,
    vehicleType: "CAR",
    vehicleMake: "Toyota",
    vehicleModel: "Corolla",
    vehicleColor: "Gris",
    violationIds: [ids["TRF-043"], ids["TRF-016"]],
    observations: "Vitesse relevée au cinémomètre.",
  });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  const d = r.json.data;
  assert.match(d.ticket.number, /^PV-\d{4}-\d{6}$/);
  assert.match(d.fine.number, /^AMD-\d{4}-\d{6}$/);
  assert.equal(d.ticket.totalFineFcfa, 25000 + 3600, "Excès de vitesse (4ème, 25 000) + ceinture (3ème, 3 600)");
  assert.equal(d.fine.amountFcfa, 28600);
  assert.equal(d.ticket.hasNonSettleableOffence, false);
  ids.control = d.control.id;
  ids.ticket = d.ticket.id;
  ids.fine = d.fine.id;
  ids.token = d.ticket.verificationToken;
  const detail = await api(keys["control.cs1"], "GET", `/api/v1/traffic/tickets/${ids.ticket}`);
  assert.equal(detail.res.status, 200);
  assert.equal(detail.json.data.sealValid, true);
  assert.equal(detail.json.data.offences.length, 2);
  assert.equal(detail.json.data.signature, undefined, "the HMAC seal is never exposed by the API");
  assert.equal(detail.json.data.fine.status, "TO_PAY");
  const person = await pool.query(`SELECT p.id FROM "Person" p JOIN "PersonIdentifier" i ON i."personId"=p.id WHERE i.type='NATIONAL_ID' AND i.value=$1`, [CNI]);
  assert.equal(person.rowCount, 1, "the driver was registered once, with the CNI as identifier");
  ids.person = person.rows[0].id;
});

test("no duplicate person: a second control with the same CNI reuses the registered driver", async () => {
  const r = await api(keys["control.cs1"], "POST", "/api/v1/traffic/controls", { controlledAt: now(), location: "Pont de Chagoua", driverFirstName: "Autre", driverLastName: "Nom", driverCni: CNI, plateNumber: PLATE, vehicleType: "CAR", violationIds: [ids["TRF-002"]] });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  const c = await pool.query(`SELECT "driverPersonId" FROM "TrafficControl" WHERE id=$1`, [r.json.data.control.id]);
  assert.equal(c.rows[0].driverPersonId, ids.person);
  assert.equal(r.json.data.fine.amountFcfa, 2200, "Arrêt interdit — the source amount is applied exactly");
  ids.control2 = r.json.data.control.id;
  ids.ticket2 = r.json.data.ticket.id;
  ids.fine2 = r.json.data.fine.id;
});

test("délit only: PV without flat fine (« Interdiction d'arbitrer »), supervisors are alerted", async () => {
  const r = await api(keys["traffic.cs1"], "POST", "/api/v1/traffic/controls", { controlledAt: now(), location: "Marché de Dembé", driverFirstName: "Hassan", driverLastName: `Sansassurance${RUN}`, plateNumber: `TD-DL${RUN}-BB`.toUpperCase(), vehicleType: "PICKUP", violationIds: [ids["TRF-009"]] });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  assert.equal(r.json.data.ticket.totalFineFcfa, 0);
  assert.equal(r.json.data.ticket.hasNonSettleableOffence, true);
  assert.equal(r.json.data.fine, null, "no fine is created for a délit");
  ids.ticketDelit = r.json.data.ticket.id;
  const n = await pool.query(`SELECT count(*)::int AS n FROM "Notification" n JOIN "User" u ON u.id=n."userId" WHERE n.title='PV comportant un délit' AND n.body LIKE $1`, [`%${r.json.data.ticket.number}%`]);
  assert.ok(n.rows[0].n >= 1, "a supervisor of the station was notified");
});

test("validation: unknown offence, future date, and a PV with no identification are refused", async () => {
  const base = { location: "Test", vehicleType: "CAR" };
  assert.equal((await api(keys["control.cs1"], "POST", "/api/v1/traffic/controls", { ...base, controlledAt: now(), plateNumber: PLATE, violationIds: ["nope"] })).res.status, 422);
  assert.equal((await api(keys["control.cs1"], "POST", "/api/v1/traffic/controls", { ...base, controlledAt: new Date(Date.now() + 86_400_000).toISOString(), plateNumber: PLATE, violationIds: [] })).res.status, 422);
  assert.equal((await api(keys["control.cs1"], "POST", "/api/v1/traffic/controls", { ...base, controlledAt: now(), violationIds: [ids["TRF-043"]] })).res.status, 422, "neither driver nor vehicle identified");
});

test("PDF: the PV is generated as a PDF (with QR code), printing is audited", async () => {
  const res = await fetch(`${BASE}/api/v1/traffic/tickets/${ids.ticket}/pdf`, { headers: { authorization: `Bearer ${keys["control.cs1"]}` } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /application\/pdf/);
  const buf = Buffer.from(await res.arrayBuffer());
  assert.equal(buf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(buf.length > 4000, "a real document, not an empty page");
  const audit = await pool.query(`SELECT count(*)::int AS n FROM "AuditLog" WHERE action='TRAFFIC_TICKET_PDF' AND "entityId"=$1`, [ids.ticket]);
  assert.ok(audit.rows[0].n >= 1);
});

test("public QR verification: authentic PV, masked identity; unknown token 404; tampering is detected", async () => {
  const res = await fetch(`${BASE}/api/v1/public/verify/pv/${ids.token}`);
  assert.equal(res.status, 200);
  const j = (await res.json()) as Json;
  assert.equal(j.data.sealValid, true);
  assert.equal(j.data.totalFineFcfa, 28600);
  assert.ok(!JSON.stringify(j.data).includes(`Contrevenant${RUN}`), "the family name must not appear in clear");
  assert.ok(!JSON.stringify(j.data).includes(CNI));
  assert.equal((await fetch(`${BASE}/api/v1/public/verify/pv/${"x".repeat(24)}`)).status, 404);
  await pool.query(`UPDATE "TrafficTicket" SET "totalFineFcfa"=1 WHERE id=$1`, [ids.ticket]);
  const tampered = (await (await fetch(`${BASE}/api/v1/public/verify/pv/${ids.token}`)).json()) as Json;
  assert.equal(tampered.data.sealValid, false, "an altered PV no longer verifies");
  await pool.query(`UPDATE "TrafficTicket" SET "totalFineFcfa"=28600 WHERE id=$1`, [ids.ticket]);
  assert.equal(((await (await fetch(`${BASE}/api/v1/public/verify/pv/${ids.token}`)).json()) as Json).data.sealValid, true);
});

test("scope: another commissariat gets 404 on the control, the PV and the fine; the finance manager (province) sees them", async () => {
  for (const path of [`controls/${ids.control}`, `tickets/${ids.ticket}`, `fines/${ids.fine}`]) {
    assert.equal((await api(keys["chief.arr5"], "GET", `/api/v1/traffic/${path}`)).res.status, 404, path);
    assert.equal((await api(keys["finance.central"], "GET", `/api/v1/traffic/${path}`)).res.status, 200, path);
  }
});

test("payment: only the finance role records it; reference required for mobile money; no overpayment, no partial payment by default", async () => {
  const pay = (k: string, body: object) => api(keys[k], "POST", `/api/v1/traffic/fines/${ids.fine}/payments`, body);
  assert.equal((await pay("control.cs1", { amountFcfa: 28600, method: "CASH" })).res.status, 403);
  assert.equal((await pay("traffic.supervisor", { amountFcfa: 28600, method: "CASH" })).res.status, 403);
  assert.equal((await pay("finance.central", { amountFcfa: 28600, method: "MOBILE_MONEY" })).res.status, 422, "mobile money needs a transaction reference");
  assert.equal((await pay("finance.central", { amountFcfa: 30000, method: "CASH" })).res.status, 422, "cannot exceed the balance");
  const partial = await pay("finance.central", { amountFcfa: 10000, method: "CASH" });
  assert.equal(partial.res.status, 422, "partial payment is off unless an administrator enables it");
  const ok = await pay("finance.central", { amountFcfa: 28600, method: "MOBILE_MONEY", provider: "Airtel Money", transactionReference: `AM${RUN}0001`, paymentPoint: "Régie centrale" });
  assert.equal(ok.res.status, 201, JSON.stringify(ok.json));
  assert.match(ok.json.data.receipt.number, /^REC-\d{4}-\d{6}$/);
  assert.equal(ok.json.data.fine.status, "PAID");
  assert.equal(ok.json.data.fine.remainingFcfa, 0);
  ids.payment = ok.json.data.payment.id;
  ids.receipt = ok.json.data.receipt.id;
  ids.receiptToken = (await pool.query(`SELECT "verificationToken" FROM "TrafficReceipt" WHERE id=$1`, [ids.receipt])).rows[0].verificationToken;
  const again = await pay("finance.central", { amountFcfa: 28600, method: "CASH" });
  assert.equal(again.res.status, 409, "a paid fine accepts no further payment");
  const dup = await api(keys["finance.central"], "POST", `/api/v1/traffic/fines/${ids.fine2}/payments`, { amountFcfa: 2200, method: "MOBILE_MONEY", transactionReference: `AM${RUN}0001` });
  assert.equal(dup.res.status, 409, "the same transaction reference cannot be booked twice");
});

test("receipt: PDF with QR code and public verification", async () => {
  const res = await fetch(`${BASE}/api/v1/traffic/receipts/${ids.receipt}/pdf`, { headers: { authorization: `Bearer ${keys["finance.central"]}` } });
  assert.equal(res.status, 200);
  assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
  const v = (await (await fetch(`${BASE}/api/v1/public/verify/receipt/${ids.receiptToken}`)).json()) as Json;
  assert.equal(v.data.amountFcfa, 28600);
  assert.equal(v.data.fineStatus, "PAID");
});

test("a PV whose fine is paid cannot be cancelled; voiding the payment re-opens the fine; the receipt stays in the register", async () => {
  assert.equal((await api(keys["traffic.supervisor"], "PATCH", `/api/v1/traffic/tickets/${ids.ticket}`, { op: "cancel", reason: "Erreur de saisie du contrôle." })).res.status, 409);
  assert.equal((await api(keys["traffic.supervisor"], "PATCH", `/api/v1/traffic/payments/${ids.payment}`, { op: "void", reason: "Paiement mal saisi." })).res.status, 403, "voiding needs traffic:payment_void");
  const voided = await api(keys["finance.central"], "PATCH", `/api/v1/traffic/payments/${ids.payment}`, { op: "void", reason: "Référence de transaction saisie par erreur." });
  assert.equal(voided.res.status, 200, JSON.stringify(voided.json));
  const fine = await api(keys["finance.central"], "GET", `/api/v1/traffic/fines/${ids.fine}`);
  assert.equal(fine.json.data.status, "TO_PAY");
  assert.equal(fine.json.data.amountPaidFcfa, 0);
  assert.equal(fine.json.data.payments[0].status, "VOIDED");
  assert.equal((await pool.query(`SELECT count(*)::int AS n FROM "TrafficReceipt" WHERE id=$1`, [ids.receipt])).rows[0].n, 1);
});

test("optional partial payment (administrative setting): partial then balance, fine goes PARTIALLY_PAID then PAID", async () => {
  await pool.query(`INSERT INTO "SystemSetting"(key,value,"updatedAt") VALUES ('traffic.allow_partial_payment','true'::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value='true'::jsonb`);
  const p1 = await api(keys["finance.central"], "POST", `/api/v1/traffic/fines/${ids.fine}/payments`, { amountFcfa: 10000, method: "CASH" });
  assert.equal(p1.res.status, 201, JSON.stringify(p1.json));
  assert.equal(p1.json.data.fine.status, "PARTIALLY_PAID");
  assert.equal(p1.json.data.fine.remainingFcfa, 18600);
  const p2 = await api(keys["finance.central"], "POST", `/api/v1/traffic/fines/${ids.fine}/payments`, { amountFcfa: 18600, method: "CASH" });
  assert.equal(p2.json.data.fine.status, "PAID");
  await pool.query(`DELETE FROM "SystemSetting" WHERE key='traffic.allow_partial_payment'`);
});

test("fine status: contest (reason required) blocks payment; reinstating reopens it; cancelling the PV cancels the fine", async () => {
  const st = (k: string, status: string, note?: string) => api(keys[k], "PATCH", `/api/v1/traffic/fines/${ids.fine2}`, { op: "status", status, note });
  assert.equal((await st("finance.central", "PAID")).res.status, 409, "PAID is never set by hand");
  assert.equal((await st("traffic.supervisor", "CONTESTED")).res.status, 422, "a reason is required");
  assert.equal((await st("control.cs1", "CONTESTED", "Le conducteur conteste.")).res.status, 403);
  assert.equal((await st("traffic.supervisor", "CONTESTED", "Le conducteur conteste le lieu de l'infraction.")).res.status, 200);
  assert.equal((await api(keys["finance.central"], "POST", `/api/v1/traffic/fines/${ids.fine2}/payments`, { amountFcfa: 2200, method: "CASH" })).res.status, 409, "no payment while contested");
  assert.equal((await st("traffic.supervisor", "TO_PAY", "Contestation rejetée après examen.")).res.status, 200);
  assert.equal((await api(keys["traffic.supervisor"], "PATCH", `/api/v1/traffic/tickets/${ids.ticket2}`, { op: "cancel", reason: "PV établi sur le mauvais véhicule." })).res.status, 200);
  const fine = await api(keys["finance.central"], "GET", `/api/v1/traffic/fines/${ids.fine2}`);
  assert.equal(fine.json.data.status, "CANCELLED");
  assert.equal((await api(keys["finance.central"], "POST", `/api/v1/traffic/fines/${ids.fine2}/payments`, { amountFcfa: 2200, method: "CASH" })).res.status, 409);
});

test("integrity at database level: no deletion of PV / fines / payments, receipts and offence lines are append-only, no overpayment", async () => {
  await assert.rejects(pool.query(`DELETE FROM "TrafficTicket" WHERE id=$1`, [ids.ticket]), /protected|DELETE/i);
  await assert.rejects(pool.query(`DELETE FROM "TrafficFine" WHERE id=$1`, [ids.fine]), /protected|DELETE/i);
  await assert.rejects(pool.query(`DELETE FROM "TrafficPayment" WHERE id=$1`, [ids.payment]), /protected|DELETE/i);
  await assert.rejects(pool.query(`UPDATE "TrafficReceipt" SET "amountFcfa"=1 WHERE id=$1`, [ids.receipt]), /append-only/i);
  await assert.rejects(pool.query(`UPDATE "TrafficTicketOffence" SET name='x' WHERE "ticketId"=$1`, [ids.ticket]), /append-only/i);
  await assert.rejects(pool.query(`UPDATE "TrafficFine" SET "amountPaidFcfa"="amountFcfa"+1 WHERE id=$1`, [ids.fine]), /traffic_fine_amounts_ck|check/i);
});

test("evidence photo: uploaded to the control, served only inside the scope of the control", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const fd = new FormData();
  fd.set("file", new File([png], `preuve-${RUN}.png`, { type: "image/png" }));
  fd.set("caption", "Plaque relevée");
  fd.set("latitude", "12.13");
  fd.set("longitude", "15.05");
  const up = await fetch(`${BASE}/api/v1/traffic/controls/${ids.control}/evidence`, { method: "POST", headers: { authorization: `Bearer ${keys["control.cs1"]}` }, body: fd });
  assert.equal(up.status, 201, await up.clone().text());
  const detail = await api(keys["chief.cs1"], "GET", `/api/v1/traffic/controls/${ids.control}`);
  const docId = detail.json.data.evidence[0].documentId as string;
  assert.ok(docId);
  const dl = await fetch(`${BASE}/api/v1/documents/${docId}/download`, { headers: { authorization: `Bearer ${keys["chief.cs1"]}` } });
  assert.equal(dl.status, 200);
  assert.equal((await fetch(`${BASE}/api/v1/documents/${docId}/download`, { headers: { authorization: `Bearer ${keys["chief.arr5"]}` } })).status, 404);
  const bad = new FormData();
  bad.set("file", new File(["MZ"], "virus.exe", { type: "application/x-msdownload" }));
  const rej = await fetch(`${BASE}/api/v1/traffic/controls/${ids.control}/evidence`, { method: "POST", headers: { authorization: `Bearer ${keys["control.cs1"]}` }, body: bad });
  assert.equal(rej.status, 422, "executables are refused");
});

test("wanted persons: a control on a vehicle attached to an active wanted notice raises an alert", async () => {
  const w = await pool.query(`SELECT id FROM "WantedPerson" WHERE status='ACTIVE' LIMIT 1`);
  assert.ok(w.rowCount, "seed has an active wanted notice");
  const admin = await pool.query(`SELECT id FROM "User" WHERE username='admin'`);
  const hitPlate = `TD-WT${RUN}-CC`.toUpperCase();
  await pool.query(`INSERT INTO "WantedVehicle"(id,"wantedPersonId","plateNumber","addedById") VALUES ($1,$2,$3,$4)`, [`wv_${RUN}`, w.rows[0].id, hitPlate, admin.rows[0].id]);
  try {
    const r = await api(keys["control.cs1"], "POST", "/api/v1/traffic/controls", { controlledAt: now(), location: "Poste de contrôle Nord", plateNumber: hitPlate, vehicleType: "PICKUP", violationIds: [] });
    assert.equal(r.res.status, 201, JSON.stringify(r.json));
    assert.equal(r.json.data.wantedHits.length, 1);
    assert.equal(r.json.data.wantedHits[0].via, "VEHICLE");
  } finally {
    await pool.query(`DELETE FROM "WantedVehicle" WHERE id=$1`, [`wv_${RUN}`]);
  }
});

test("cases: a PV can open a case (cases:create needed), once", async () => {
  assert.equal((await api(keys["control.cs1"], "POST", `/api/v1/traffic/tickets/${ids.ticketDelit}/case`, {})).res.status, 403);
  const c = await api(keys["chief.cs1"], "POST", `/api/v1/traffic/tickets/${ids.ticketDelit}/case`, {});
  assert.equal(c.res.status, 201, JSON.stringify(c.json));
  assert.match(c.json.data.number, /^CASE-\d{4}-\d{5}$/);
  assert.equal((await api(keys["chief.cs1"], "POST", `/api/v1/traffic/tickets/${ids.ticketDelit}/case`, {})).res.status, 409);
});

test("search: by PV number, plate, driver, CNI (exact), offence, officer and payment status", async () => {
  const s = (qs: string) => api(keys["chief.cs1"], "GET", `/api/v1/traffic/search?${qs}`);
  const pv = (await api(keys["chief.cs1"], "GET", `/api/v1/traffic/tickets/${ids.ticket}`)).json.data.number as string;
  assert.ok((await s(`pv=${pv}`)).json.data.some((x: { ticket: { number: string } | null }) => x.ticket?.number === pv));
  assert.ok((await s(`plate=${encodeURIComponent(PLATE)}`)).json.meta.total >= 2);
  assert.ok((await s(`driver=Contrevenant${RUN}`)).json.meta.total >= 1);
  assert.equal((await s(`cni=${CNI}`)).json.meta.total >= 1, true);
  assert.equal((await s(`cni=${CNI.slice(0, 6)}`)).json.meta.total, 0, "no partial CNI matching");
  assert.ok((await s(`violation=${encodeURIComponent("Excès de vitesse")}`)).json.meta.total >= 1);
  assert.ok((await s(`fineStatus=PAID`)).json.meta.total >= 1);
  const v = await api(keys["control.cs1"], "GET", `/api/v1/traffic/vehicles?plate=${encodeURIComponent(PLATE)}`);
  assert.equal(v.json.data[0].plateNumber, PLATE, "vehicle found directly by registration number");
});

test("dashboard: figures are computed from the database inside the scope; CSV export needs traffic:export", async () => {
  const s = await api(keys["chief.cs1"], "GET", "/api/v1/traffic/stats");
  assert.equal(s.res.status, 200, JSON.stringify(s.json));
  const k = s.json.data.kpi;
  assert.ok(k.controls >= 5 && k.tickets >= 2 && k.offences >= 3);
  assert.ok(k.paidFcfa >= 28600 && k.totalFinesFcfa >= k.paidFcfa);
  assert.equal(k.remainingFcfa, k.totalFinesFcfa - k.paidFcfa);
  assert.ok(s.json.data.topOffences.length > 0 && s.json.data.monthly.fines.length === 12);
  const nat = await api(keys["admin"], "GET", "/api/v1/traffic/stats");
  assert.ok(nat.json.data.kpi.controls >= k.controls, "national scope sees at least the station figures");
  const csv = await fetch(`${BASE}/api/v1/traffic/stats?format=csv`, { headers: { authorization: `Bearer ${keys["chief.cs1"]}` } });
  assert.equal(csv.status, 200);
  assert.match(await csv.text(), /Indicateurs/);
  assert.equal((await fetch(`${BASE}/api/v1/traffic/stats?format=csv`, { headers: { authorization: `Bearer ${keys["readonly.traffic"]}` } })).status, 403);
});

test("audit: every modification is traceable (control, PV, fine, payment, void, cancel, status)", async () => {
  const a = await pool.query(`SELECT array_agg(DISTINCT action) AS a FROM "AuditLog" WHERE module='traffic' AND at > (now() AT TIME ZONE 'UTC') - interval '60 minutes'`);
  const actions = new Set(a.rows[0].a as string[]);
  for (const x of ["TRAFFIC_CONTROL_CREATED", "TRAFFIC_TICKET_ISSUED", "TRAFFIC_FINE_CREATED", "TRAFFIC_PAYMENT_RECORDED", "TRAFFIC_PAYMENT_VOIDED", "TRAFFIC_TICKET_CANCELLED", "TRAFFIC_FINE_CONTESTED", "TRAFFIC_EVIDENCE_ADDED", "TRAFFIC_WANTED_HIT", "TRAFFIC_CASE_OPENED"]) assert.ok(actions.has(x), `missing audit action ${x} in ${[...actions].join(",")}`);
});

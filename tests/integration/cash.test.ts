/**
 * Field revenue: cash register → closing → deposit → reconciliation (SIGPN-T) — live dev server + seed.
 *   npx tsx --test tests/integration/cash.test.ts
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
const ids: Record<string, any> = {};
const CASH = "/api/v1/traffic/cash";

async function keyFor(username: string) {
  const key = `pms_cs${RUN}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `demo user ${username} missing — run npm run db:seed`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'cash-test',$3,$4)`, [`apikey_cs_${username}_${RUN}`, u.rows[0].id, `cs${RUN}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
type Json = { data?: any; error?: { code: string; message: string }; meta?: any };
async function api(key: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as Json;
  return { res, json };
}
async function raw(key: string, path: string) {
  return fetch(`${BASE}${path}`, { headers: { authorization: `Bearer ${key}` } });
}
const now = () => new Date(Date.now() - 60_000).toISOString();
let seq = 0;
const AMOUNT: Record<string, number> = { "TRF-043": 25000, "TRF-016": 3600, "TRF-002": 2200 };

/** Records a control with one offence (traffic officer, so the collecting agent keeps its own write budget) and returns the resulting fine. */
async function newFine(code: keyof typeof AMOUNT, agent = "traffic.cs1") {
  const r = await api(keys[agent], "POST", "/api/v1/traffic/controls", { controlledAt: now(), location: "Avenue Charles de Gaulle, N'Djamena", plateNumber: `TD-C${RUN}${++seq}-ZZ`.toUpperCase(), vehicleType: "CAR", violationIds: [ids[code]] });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  assert.equal(r.json.data.fine.amountFcfa, AMOUNT[code]);
  return r.json.data.fine as { id: string; number: string; amountFcfa: number };
}
const pay = (agent: string, fineId: string, body: Record<string, unknown>) => api(keys[agent], "POST", `/api/v1/traffic/fines/${fineId}/payments`, body);

async function openRegister(agent = "control.cs2") {
  const r = await api(keys[agent], "POST", `${CASH}/registers`, { openingBalanceFcfa: 0 });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  return r.json.data as { id: string; number: string };
}
async function closeRegister(agent: string, id: string) {
  const r = await api(keys[agent], "PATCH", `${CASH}/registers/${id}`, { op: "close", notes: "clôture de test" });
  assert.equal(r.res.status, 200, JSON.stringify(r.json));
  return r.json.data as { closureId: string; closure: string; collection: string | null; collectedFcfa: number; paymentsCount: number };
}
async function collectionOf(registerId: string) {
  const c = await pool.query(`SELECT id, status, "collectedFcfa", "depositedFcfa", "validatedFcfa" FROM "TrafficRevenueCollection" WHERE "registerId"=$1`, [registerId]);
  return c.rows[0] as { id: string; status: string; collectedFcfa: number; depositedFcfa: number; validatedFcfa: number };
}
const bank = { method: "BANK", slipNumber: `BV-${RUN}`, reference: `BQ-${RUN}-0001`, recipient: "Banque commerciale (test)" };

before(async () => {
  for (const u of ["control.cs2", "traffic.cs1", "unit.head", "finance.central", "traffic.supervisor", "police.admin", "readonly.traffic", "auditor"]) keys[u] = await keyFor(u);
  for (const code of Object.keys(AMOUNT)) {
    const v = await pool.query(`SELECT id FROM "TrafficViolation" WHERE code=$1`, [code]);
    ids[code] = v.rows[0].id;
  }
  // a previous interrupted run may have left the test agent with an open register
  await pool.query(`UPDATE "TrafficCashRegister" SET status='CLOSED' WHERE status='OPEN' AND "agentId" = (SELECT id FROM "User" WHERE username='control.cs2')`);
  await pool.query(`DELETE FROM "SystemSetting" WHERE key = 'traffic.allow_partial_deposit'`);
});
after(async () => {
  await pool.query(`DELETE FROM "SystemSetting" WHERE key = 'traffic.allow_partial_deposit'`);
  await pool.query(`DELETE FROM "ApiKey" WHERE name='cash-test' AND "keyPrefix"=$1`, [`cs${RUN}`]);
  await pool.end();
});

test("permissions: only field agents open a register; unit head, finance, supervisor, admin and read-only cannot", async () => {
  for (const u of ["unit.head", "finance.central", "traffic.supervisor", "police.admin", "readonly.traffic", "auditor"]) assert.equal((await api(keys[u], "POST", `${CASH}/registers`, {})).res.status, 403, u);
  assert.equal((await api(keys["readonly.traffic"], "GET", `${CASH}/registers`)).res.status, 403, "read-only has no cash access at all");
  assert.equal((await api(keys["unit.head"], "GET", `${CASH}/registers`)).res.status, 200);
  assert.equal((await api(keys["police.admin"], "GET", `${CASH}/registers`)).res.status, 200, "the administrator can look, not operate");
});

test("a field agent cannot collect without an open register", async () => {
  ids.fineA = await newFine("TRF-043");
  const r = await pay("control.cs2", ids.fineA.id, { amountFcfa: 25000, method: "CASH" });
  assert.equal(r.res.status, 409, JSON.stringify(r.json));
  assert.match(r.json.error?.message ?? "", /Open your cash register/);
});

test("scenario: open → collect (cash, electronic, mobile money) → void → close → daily statement", async () => {
  const reg = await openRegister();
  ids.reg = reg;
  assert.match(reg.number, /^CSH-\d{4}-\d{6}$/);
  assert.equal((await api(keys["control.cs2"], "POST", `${CASH}/registers`, {})).res.status, 409, "a single open register per agent");

  // the amount of the fine comes from the official table: a partial amount is refused while partial payment is disabled
  assert.equal((await pay("control.cs2", ids.fineA.id, { amountFcfa: 20000, method: "CASH" })).res.status, 422);
  const cash = await pay("control.cs2", ids.fineA.id, { amountFcfa: 25000, method: "CASH", paymentPoint: "Avenue Charles de Gaulle" });
  assert.equal(cash.res.status, 201, JSON.stringify(cash.json));
  assert.equal(cash.json.data.fine.status, "PAID");
  ids.receiptA = cash.json.data.receipt;
  ids.payA = cash.json.data.payment.id;
  assert.equal((await pay("control.cs2", ids.fineA.id, { amountFcfa: 25000, method: "CASH" })).res.status, 409, "the same fine cannot be paid twice");

  const fineB = await newFine("TRF-016");
  assert.equal((await pay("control.cs2", fineB.id, { amountFcfa: 3600, method: "ELECTRONIC" })).res.status, 422, "reference mandatory for electronic payments");
  const el = await pay("control.cs2", fineB.id, { amountFcfa: 3600, method: "ELECTRONIC", provider: "TPE (test)", transactionReference: `EL-${RUN}-1` });
  assert.equal(el.res.status, 201, JSON.stringify(el.json));
  const dup = await pay("control.cs2", (await newFine("TRF-016")).id, { amountFcfa: 3600, method: "ELECTRONIC", transactionReference: `EL-${RUN}-1` });
  assert.equal(dup.res.status, 409, "the same transaction reference cannot be recorded twice");

  const fineC = await newFine("TRF-002");
  const mm = await pay("control.cs2", fineC.id, { amountFcfa: 2200, method: "MOBILE_MONEY", provider: "Airtel Money (simulé)", transactionReference: `MM-${RUN}-1` });
  assert.equal(mm.res.status, 201, JSON.stringify(mm.json));
  let g = await api(keys["control.cs2"], "GET", `${CASH}/registers/${reg.id}`);
  assert.equal(g.json.data.totals.collected, 25000 + 3600 + 2200, "every payment was added to the register automatically");
  assert.equal(g.json.data.totals.cash, 25000);
  assert.equal(g.json.data.totals.mobileMoney, 2200);

  // void needs a reason; the voided amount leaves the register
  const noReason = await api(keys["control.cs2"], "PATCH", `/api/v1/traffic/payments/${mm.json.data.payment.id}`, { op: "void", reason: "trop" });
  assert.equal(noReason.res.status, 422);
  const voided = await api(keys["control.cs2"], "PATCH", `/api/v1/traffic/payments/${mm.json.data.payment.id}`, { op: "void", reason: "Paiement Mobile Money saisi par erreur (test)" });
  assert.equal(voided.res.status, 200, JSON.stringify(voided.json));
  g = await api(keys["control.cs2"], "GET", `${CASH}/registers/${reg.id}`);
  assert.equal(g.json.data.totals.collected, 25000 + 3600);
  assert.equal(g.json.data.totals.mobileMoney, 0);

  // unit head and finance cannot close somebody else's register
  assert.equal((await api(keys["unit.head"], "PATCH", `${CASH}/registers/${reg.id}`, { op: "close" })).res.status, 403);
  assert.equal((await api(keys["traffic.cs1"], "PATCH", `${CASH}/registers/${reg.id}`, { op: "close" })).res.status, 404, "another agent cannot close it either");
  const closed = await closeRegister("control.cs2", reg.id);
  assert.equal(closed.collectedFcfa, 28600);
  assert.equal(closed.paymentsCount, 2);
  ids.closure = closed;
  const st = await api(keys["control.cs2"], "GET", `${CASH}/closures/${closed.closureId}`);
  assert.equal(st.json.data.cashFcfa, 25000);
  assert.equal(st.json.data.electronicFcfa, 3600);
  assert.equal(st.json.data.mobileMoneyFcfa, 0);
  assert.equal(st.json.data.amountToDepositFcfa, 28600);
  assert.equal(st.json.data.receiptNumbers.length, 2);
  const pdf = await raw(keys["control.cs2"], `${CASH}/closures/${closed.closureId}/pdf`);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  const col = await collectionOf(reg.id);
  assert.equal(col.collectedFcfa, 28600);
  ids.col = col.id;
});

test("closed register: no new payment, no void, no modification — even straight in the database", async () => {
  const fine = await newFine("TRF-002");
  const r = await pay("control.cs2", fine.id, { amountFcfa: 2200, method: "CASH" });
  assert.equal(r.res.status, 409, "no open register");
  const v = await api(keys["control.cs2"], "PATCH", `/api/v1/traffic/payments/${ids.payA}`, { op: "void", reason: "Tentative de correction après clôture" });
  assert.equal(v.res.status, 409, JSON.stringify(v.json));
  assert.match(v.json.error?.message ?? "", /closed/);
  // database guard: a closed register accepts no transaction and its closing statement is frozen
  await assert.rejects(pool.query(`INSERT INTO "TrafficCashTransaction"(id,"registerId","paymentId","amountFcfa",method) SELECT 'x_${RUN}', $1, p.id, 100, 'CASH' FROM "TrafficPayment" p WHERE NOT EXISTS (SELECT 1 FROM "TrafficCashTransaction" t WHERE t."paymentId"=p.id) LIMIT 1`, [ids.reg.id]), /not open|violates|check/i);
  await assert.rejects(pool.query(`UPDATE "TrafficDailyClosure" SET "collectedFcfa" = 1 WHERE id=$1`, [ids.closure.closureId]), /immutable|append|forbidden|not allowed/i);
  await assert.rejects(pool.query(`UPDATE "TrafficCashTransaction" SET "voidedAt" = now() WHERE "registerId"=$1`, [ids.reg.id]), /not open|immutable/i);
});

test("anti-fraud: a payment can be counted once; financial records cannot be deleted", async () => {
  await assert.rejects(pool.query(`INSERT INTO "TrafficCashTransaction"(id,"registerId","paymentId","amountFcfa",method) VALUES ('dup_${RUN}', (SELECT id FROM "TrafficCashRegister" WHERE status='OPEN' LIMIT 1), $1, 25000, 'CASH')`, [ids.payA]), /unique|duplicate|violates|open/i);
  for (const table of ["TrafficCashRegister", "TrafficCashTransaction", "TrafficRevenueCollection", "TrafficDailyClosure"]) await assert.rejects(pool.query(`DELETE FROM "${table}" WHERE "id" IN (SELECT id FROM "${table}" LIMIT 1)`), /forbid|not allowed|cannot|immutable/i, table);
  await assert.rejects(pool.query(`DELETE FROM "TrafficPayment" WHERE id=$1`, [ids.payA]), /forbid|not allowed|cannot/i);
});

test("deposit rules: cannot exceed the register, slip and reference required, shortfall must be explained", async () => {
  const dep = (agent: string, body: Record<string, unknown>) => api(keys[agent], "POST", `${CASH}/deposits`, { collectionId: ids.col, ...body });
  assert.equal((await dep("control.cs2", { ...bank, amountDepositedFcfa: 28601 })).res.status, 422, "a deposit cannot exceed the available amount");
  assert.equal((await dep("control.cs2", { method: "BANK", amountDepositedFcfa: 28600, reference: `BQ-${RUN}-0001` })).res.status, 422, "slip number required for a bank deposit");
  assert.equal((await dep("control.cs2", { method: "MOBILE_MONEY", amountDepositedFcfa: 28600 })).res.status, 422, "reference required for mobile money");
  assert.equal((await dep("control.cs2", { ...bank, amountDepositedFcfa: 20000 })).res.status, 422, "a shortfall needs an explanation");
  assert.equal((await dep("readonly.traffic", { ...bank, amountDepositedFcfa: 28600 })).res.status, 403);
  assert.equal((await dep("traffic.cs1", { ...bank, amountDepositedFcfa: 28600 })).res.status, 404, "another agent cannot deposit this collection");
});

test("scenario: deposit → slip (PDF, QR) → verify → validate (four eyes) → reconciliation → definitive closing", async () => {
  const r = await api(keys["control.cs2"], "POST", `${CASH}/deposits`, { collectionId: ids.col, ...bank, amountDepositedFcfa: 28600 });
  assert.equal(r.res.status, 201, JSON.stringify(r.json));
  ids.dep = r.json.data;
  assert.match(r.json.data.number, /^VRS-\d{4}-\d{6}$/);
  assert.match(r.json.data.slipNumber, /^BRD-\d{4}-\d{6}$/);
  const pdf = await raw(keys["control.cs2"], `${CASH}/deposits/${ids.dep.id}/pdf`);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  const d = await api(keys["control.cs2"], "GET", `${CASH}/deposits/${ids.dep.id}`);
  assert.equal(d.json.data.status, "SUBMITTED");
  assert.equal(d.json.data.items.length, 2, "the deposit lists the payments it covers (PV → fine → payment → receipt → deposit)");
  const token = d.json.data.slip.verificationToken;
  const pub = await fetch(`${BASE}/api/v1/public/verify/deposit/${token}`);
  assert.equal(pub.status, 200);
  const pj = (await pub.json()) as Json;
  assert.equal(pj.data.deposit.amountDepositedFcfa, 28600);
  assert.ok(!JSON.stringify(pj).includes("contentHash") && !JSON.stringify(pj).includes("plate"), "the public check never exposes hashes or plates");
  assert.equal((await fetch(`${BASE}/api/v1/public/verify/deposit/does-not-exist`)).status, 404);
  assert.equal((await pool.query(`SELECT status FROM "TrafficCashRegister" WHERE id=$1`, [ids.reg.id])).rows[0].status, "PENDING_DEPOSIT");

  // roles and separation of duties
  const patch = (agent: string, op: string, note?: string) => api(keys[agent], "PATCH", `${CASH}/deposits/${ids.dep.id}`, { op, note });
  assert.equal((await patch("control.cs2", "verify")).res.status, 403, "the agent cannot verify their own deposit");
  assert.equal((await patch("unit.head", "validate")).res.status, 403, "the unit head cannot validate definitively");
  assert.equal((await patch("police.admin", "validate")).res.status, 403, "the administrator cannot silently validate money");
  assert.equal((await patch("finance.central", "validate")).res.status, 409, "validation needs a verified deposit");
  assert.equal((await patch("unit.head", "verify")).res.status, 200);
  assert.equal((await pool.query(`SELECT status FROM "TrafficCashRegister" WHERE id=$1`, [ids.reg.id])).rows[0].status, "DEPOSITED");
  assert.equal((await patch("finance.central", "validate")).res.status, 200);
  const col = await collectionOf(ids.reg.id);
  assert.equal(col.validatedFcfa, 28600);
  const rec = await pool.query(`SELECT status, "gapFcfa", "collectedFcfa", "validatedFcfa" FROM "TrafficReconciliation" WHERE "collectionId"=$1`, [ids.col]);
  assert.equal(rec.rows[0].status, "CONFORME");
  assert.equal(rec.rows[0].gapFcfa, 0);

  const fin = (agent: string, op: string, note?: string) => api(keys[agent], "PATCH", `${CASH}/collections/${ids.col}`, { op, note });
  assert.equal((await fin("unit.head", "finalize")).res.status, 403);
  assert.equal((await fin("finance.central", "finalize", "Rapprochement conforme (test)")).res.status, 200);
  assert.equal((await fin("finance.central", "finalize")).res.status, 409, "a definitive closing cannot be repeated");
  assert.equal((await pool.query(`SELECT status FROM "TrafficCashRegister" WHERE id=$1`, [ids.reg.id])).rows[0].status, "VALIDATED");
  assert.equal((await patch("finance.central", "reject", "Rejet tardif du versement validé")).res.status, 409, "a validated deposit cannot be rejected");
  await assert.rejects(pool.query(`DELETE FROM "TrafficDeposit" WHERE id=$1`, [ids.dep.id]), /forbid|not allowed|cannot/i, "a validated deposit cannot be deleted");
  await assert.rejects(pool.query(`UPDATE "TrafficDepositReceipt" SET number='X' WHERE "depositId"=$1`, [ids.dep.id]), /immutable|append|forbid|not allowed/i, "the slip is append-only");
});

test("scenario: shortfall → gap to justify → discrepancy sheet → justification → validation → definitive closing", async () => {
  const reg = await openRegister();
  const f1 = await newFine("TRF-043");
  const f2 = await newFine("TRF-016");
  assert.equal((await pay("control.cs2", f1.id, { amountFcfa: 25000, method: "CASH" })).res.status, 201);
  assert.equal((await pay("control.cs2", f2.id, { amountFcfa: 3600, method: "CASH" })).res.status, 201);
  await closeRegister("control.cs2", reg.id);
  const col = await collectionOf(reg.id);
  const d = await api(keys["control.cs2"], "POST", `${CASH}/deposits`, { collectionId: col.id, ...bank, reference: `BQ-${RUN}-0002`, slipNumber: `BV-${RUN}-2`, amountDepositedFcfa: 26600, observations: "Manquant de 2 000 FCFA constaté à la remise (test)." });
  assert.equal(d.res.status, 201, JSON.stringify(d.json));
  assert.equal((await api(keys["unit.head"], "PATCH", `${CASH}/deposits/${d.json.data.id}`, { op: "verify" })).res.status, 200);
  assert.equal((await api(keys["finance.central"], "PATCH", `${CASH}/deposits/${d.json.data.id}`, { op: "validate" })).res.status, 200);
  const rec = await pool.query(`SELECT status, "gapFcfa" FROM "TrafficReconciliation" WHERE "collectionId"=$1`, [col.id]);
  assert.equal(rec.rows[0].status, "GAP_TO_JUSTIFY");
  assert.equal(rec.rows[0].gapFcfa, 2000, "gap = collected − validated, never deleted automatically");
  const disc = await pool.query(`SELECT id, number, status, "amountFcfa" FROM "TrafficCashDiscrepancy" WHERE "collectionId"=$1`, [col.id]);
  assert.equal(disc.rowCount, 1);
  assert.equal(disc.rows[0].amountFcfa, 2000);
  assert.equal(disc.rows[0].status, "OPEN");
  const did = disc.rows[0].id;
  const fin = (op: string) => api(keys["finance.central"], "PATCH", `${CASH}/collections/${col.id}`, { op, note: "Clôture avec écart justifié (test)" });
  assert.equal((await fin("finalize")).res.status, 409, "the gap must be justified and validated first");
  const dp = (agent: string, body: Record<string, unknown>) => api(keys[agent], "PATCH", `${CASH}/discrepancies/${did}`, body);
  assert.equal((await dp("control.cs2", { op: "justify", reason: "Erreur de comptage", text: "x" })).res.status, 422, "a real justification is required");
  assert.equal((await dp("control.cs2", { op: "validate" })).res.status, 403, "the agent cannot validate their own discrepancy");
  assert.equal((await dp("control.cs2", { op: "justify", reason: "Erreur de comptage", text: "Deux billets de 1 000 FCFA se sont collés lors du comptage (test)." })).res.status, 200);
  assert.equal((await dp("finance.central", { op: "reject", text: "Justification insuffisante, joindre une attestation." })).res.status, 200);
  assert.equal((await dp("control.cs2", { op: "justify", reason: "Erreur de comptage", text: "Attestation du chef de poste jointe au dossier (test)." })).res.status, 200);
  assert.equal((await dp("finance.central", { op: "validate" })).res.status, 200);
  const v = await pool.query(`SELECT status, "validatedById", "validatedAt" FROM "TrafficCashDiscrepancy" WHERE id=$1`, [did]);
  assert.equal(v.rows[0].status, "VALIDATED");
  assert.ok(v.rows[0].validatedById && v.rows[0].validatedAt, "validator and date recorded");
  assert.equal((await fin("finalize")).res.status, 200);
  const done = await pool.query(`SELECT status, "gapFcfa" FROM "TrafficReconciliation" WHERE "collectionId"=$1`, [col.id]);
  assert.equal(done.rows[0].status, "VALIDATED");
  assert.equal(done.rows[0].gapFcfa, 2000, "the gap stays on record");
});

test("scenario: deposit rejected → re-submitted (new attempt) → validated", async () => {
  const reg = await openRegister();
  const f = await newFine("TRF-043");
  assert.equal((await pay("control.cs2", f.id, { amountFcfa: 25000, method: "CASH" })).res.status, 201);
  await closeRegister("control.cs2", reg.id);
  const col = await collectionOf(reg.id);
  const first = await api(keys["control.cs2"], "POST", `${CASH}/deposits`, { collectionId: col.id, ...bank, reference: `BQ-${RUN}-0003`, slipNumber: `BV-${RUN}-3`, amountDepositedFcfa: 25000 });
  assert.equal(first.res.status, 201);
  assert.equal((await api(keys["control.cs2"], "POST", `${CASH}/deposits`, { collectionId: col.id, ...bank, amountDepositedFcfa: 25000 })).res.status, 409, "one deposit at a time when partial deposits are off");
  assert.equal((await api(keys["unit.head"], "PATCH", `${CASH}/deposits/${first.json.data.id}`, { op: "reject", note: "court" })).res.status, 422, "reason of at least 10 characters");
  assert.equal((await api(keys["unit.head"], "PATCH", `${CASH}/deposits/${first.json.data.id}`, { op: "reject", note: "Bordereau illisible, représenter la pièce." })).res.status, 200);
  let c = await collectionOf(reg.id);
  assert.equal(c.depositedFcfa, 0, "a rejected deposit does not count");
  assert.equal((await pool.query(`SELECT status FROM "TrafficCashRegister" WHERE id=$1`, [reg.id])).rows[0].status, "CLOSED");
  const second = await api(keys["control.cs2"], "POST", `${CASH}/deposits`, { collectionId: col.id, ...bank, reference: `BQ-${RUN}-0004`, slipNumber: `BV-${RUN}-4`, amountDepositedFcfa: 25000 });
  assert.equal(second.res.status, 201, JSON.stringify(second.json));
  const g = await api(keys["control.cs2"], "GET", `${CASH}/deposits/${second.json.data.id}`);
  assert.equal(g.json.data.attempt, 2);
  assert.equal(g.json.data.previousDepositId, first.json.data.id);
  // justification requested → answered → back to submitted
  assert.equal((await api(keys["unit.head"], "PATCH", `${CASH}/deposits/${second.json.data.id}`, { op: "request_justification", note: "Préciser la banque destinataire." })).res.status, 200);
  assert.equal((await api(keys["control.cs2"], "PATCH", `${CASH}/deposits/${second.json.data.id}`, { op: "respond", note: "Banque commerciale, agence centrale (test)." })).res.status, 200);
  assert.equal((await api(keys["unit.head"], "PATCH", `${CASH}/deposits/${second.json.data.id}`, { op: "verify" })).res.status, 200);
  assert.equal((await api(keys["finance.central"], "PATCH", `${CASH}/deposits/${second.json.data.id}`, { op: "validate" })).res.status, 200);
  c = await collectionOf(reg.id);
  assert.equal(c.validatedFcfa, 25000);
});

test("partial deposit (only when administratively enabled): two deposits cover the collection, never more", async () => {
  await pool.query(`INSERT INTO "SystemSetting"(key,value,description,"updatedAt") VALUES ('traffic.allow_partial_deposit','true'::jsonb,'test',now()) ON CONFLICT (key) DO UPDATE SET value='true'::jsonb`);
  const reg = await openRegister();
  const f1 = await newFine("TRF-043");
  const f2 = await newFine("TRF-016");
  assert.equal((await pay("control.cs2", f1.id, { amountFcfa: 25000, method: "CASH" })).res.status, 201);
  assert.equal((await pay("control.cs2", f2.id, { amountFcfa: 3600, method: "CASH" })).res.status, 201);
  await closeRegister("control.cs2", reg.id);
  const col = await collectionOf(reg.id);
  const d1 = await api(keys["control.cs2"], "POST", `${CASH}/deposits`, { collectionId: col.id, ...bank, reference: `BQ-${RUN}-0005`, slipNumber: `BV-${RUN}-5`, amountDepositedFcfa: 20000 });
  assert.equal(d1.res.status, 201, JSON.stringify(d1.json));
  assert.equal((await api(keys["control.cs2"], "POST", `${CASH}/deposits`, { collectionId: col.id, ...bank, reference: `BQ-${RUN}-0006`, slipNumber: `BV-${RUN}-6`, amountDepositedFcfa: 9000 })).res.status, 422, "only 8 600 FCFA remain");
  const d2 = await api(keys["control.cs2"], "POST", `${CASH}/deposits`, { collectionId: col.id, ...bank, reference: `BQ-${RUN}-0007`, slipNumber: `BV-${RUN}-7`, amountDepositedFcfa: 8600 });
  assert.equal(d2.res.status, 201, JSON.stringify(d2.json));
  assert.equal((await collectionOf(reg.id)).status, "DEPOSITED");
  await pool.query(`DELETE FROM "SystemSetting" WHERE key = 'traffic.allow_partial_deposit'`);
});

test("blocked register: no collection until unblocked (unit head cannot block, finance can)", async () => {
  const reg = await openRegister();
  assert.equal((await api(keys["unit.head"], "PATCH", `${CASH}/registers/${reg.id}`, { op: "block", reason: "Contrôle de caisse en cours" })).res.status, 403);
  assert.equal((await api(keys["finance.central"], "PATCH", `${CASH}/registers/${reg.id}`, { op: "block", reason: "Contrôle de caisse en cours" })).res.status, 200);
  const f = await newFine("TRF-002");
  const r = await pay("control.cs2", f.id, { amountFcfa: 2200, method: "CASH" });
  assert.equal(r.res.status, 409);
  assert.match(r.json.error?.message ?? "", /blocked/);
  assert.equal((await api(keys["finance.central"], "PATCH", `${CASH}/registers/${reg.id}`, { op: "unblock", reason: "Contrôle terminé, RAS" })).res.status, 200);
  assert.equal((await pay("control.cs2", f.id, { amountFcfa: 2200, method: "CASH" })).res.status, 201);
  await closeRegister("control.cs2", reg.id);
});

test("dashboard, reports (12), search and CSV/PDF exports", async () => {
  const s = await api(keys["finance.central"], "GET", `${CASH}/stats`);
  assert.equal(s.res.status, 200, JSON.stringify(s.json));
  const k = s.json.data.kpi;
  assert.ok(k.collectedTotal >= 28600 && k.depositedTotal >= 28600 && k.validatedTotal >= 28600);
  assert.ok(k.collectedTotal >= k.depositedTotal, "collected and deposited are never confused");
  assert.equal(k.remainingToDeposit, Math.max(0, k.collectedTotal - k.depositedTotal));
  assert.ok(k.discrepanciesTotal >= 2, "seeded and test discrepancies are counted");
  assert.ok(s.json.data.monthly.length >= 12);
  assert.equal((await api(keys["traffic.supervisor"], "GET", `${CASH}/stats`)).res.status, 200, "the supervisor reads the statistics");
  assert.equal((await api(keys["control.cs2"], "GET", `${CASH}/stats`)).res.status, 403, "a field agent has no dashboard");
  const csv = await raw(keys["finance.central"], `${CASH}/stats?format=csv`);
  assert.match(csv.headers.get("content-type") ?? "", /text\/csv/);

  for (const kind of ["daily", "weekly", "monthly", "by_agent", "by_unit", "by_commissariat", "by_province", "deposits", "discrepancies", "collected_vs_deposited", "by_method", "unpaid_fines"]) {
    const r = await api(keys["finance.central"], "GET", `${CASH}/reports/${kind}`);
    assert.equal(r.res.status, 200, `${kind}: ${JSON.stringify(r.json).slice(0, 200)}`);
    assert.ok(Array.isArray(r.json.data.rows) && r.json.data.columns.length >= 3, kind);
  }
  const byAgent = await api(keys["finance.central"], "GET", `${CASH}/reports/by_agent`);
  const row = byAgent.json.data.rows.find((x: any) => x.label.includes("Idriss"));
  assert.ok(row && row.collected >= row.validated, "report by agent: collected, deposited, validated and gap are separate columns");
  assert.equal((await raw(keys["finance.central"], `${CASH}/reports/deposits?format=pdf`)).headers.get("content-type"), "application/pdf");
  assert.match((await raw(keys["finance.central"], `${CASH}/reports/monthly?format=csv`)).headers.get("content-type") ?? "", /text\/csv/);
  assert.equal((await api(keys["control.cs2"], "GET", `${CASH}/reports/daily`)).res.status, 403);

  const q = await api(keys["finance.central"], "GET", `${CASH}/search?q=${encodeURIComponent(ids.receiptA.number)}`);
  assert.equal(q.json.data.payments.length, 1);
  assert.equal(q.json.data.payments[0].payment.receipt.number, ids.receiptA.number);
  const byRef = await api(keys["finance.central"], "GET", `${CASH}/search?q=${encodeURIComponent(`EL-${RUN}-1`)}`);
  assert.equal(byRef.json.data.payments.length, 1);
  const bySlip = await api(keys["finance.central"], "GET", `${CASH}/search?q=${encodeURIComponent(ids.dep.slipNumber)}`);
  assert.ok(bySlip.json.data.deposits.length >= 1);
  const own = await api(keys["control.cs2"], "GET", `${CASH}/search?q=${encodeURIComponent(ids.receiptA.number)}`);
  assert.equal(own.json.data.payments.length, 1, "a field agent finds their own payments");
  const others = await api(keys["traffic.cs1"], "GET", `${CASH}/search?q=${encodeURIComponent(ids.receiptA.number)}`);
  assert.equal(others.json.data.payments.length, 0, "…but not the payments of another agent");
});

test("audit: every financial event is recorded with user, role, IP, old and new value and the operation reference", async () => {
  const rows = await pool.query(`SELECT action, "actorLabel", "entityLabel", before, after, "ipAddress" FROM "AuditLog" WHERE module='traffic_cash' ORDER BY "at" DESC LIMIT 800`);
  const actions = new Set(rows.rows.map((r: any) => r.action));
  for (const a of ["TRAFFIC_CASH_REGISTER_OPENED", "TRAFFIC_CASH_REGISTER_CLOSED", "TRAFFIC_CASH_REGISTER_BLOCKED", "TRAFFIC_CASH_REGISTER_UNBLOCKED", "TRAFFIC_CASH_DEPOSIT_CREATED", "TRAFFIC_CASH_DEPOSIT_VERIFIED", "TRAFFIC_CASH_DEPOSIT_VALIDATED", "TRAFFIC_CASH_DEPOSIT_REJECTED", "TRAFFIC_CASH_DEPOSIT_JUSTIFICATION_REQUESTED", "TRAFFIC_CASH_DEPOSIT_JUSTIFIED", "TRAFFIC_CASH_RECONCILED", "TRAFFIC_CASH_RECONCILIATION_VALIDATED", "TRAFFIC_CASH_DISCREPANCY_CREATED", "TRAFFIC_CASH_DISCREPANCY_JUSTIFIED", "TRAFFIC_CASH_DISCREPANCY_VALIDATED", "TRAFFIC_CASH_DISCREPANCY_REJECTED", "TRAFFIC_CASH_STATEMENT_PDF", "TRAFFIC_CASH_SLIP_PDF"]) assert.ok(actions.has(a), `missing audit action ${a}`);
  const validated = rows.rows.find((r: any) => r.action === "TRAFFIC_CASH_DEPOSIT_VALIDATED");
  assert.equal(validated.after.role, "TRAFFIC_PAYMENT_MANAGER", "role recorded");
  assert.match(validated.actorLabel, /finance\.central/);
  assert.ok(validated.before && validated.before.status === "VERIFIED" && validated.after.status === "VALIDATED", "old and new value");
  assert.ok(validated.entityLabel.startsWith("VRS-"), "operation reference");
  const pay = await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action='TRAFFIC_PAYMENT_RECORDED' AND after->>'cashRegisterId' IS NOT NULL`);
  assert.ok(pay.rows[0].n >= 5, "payments booked in a register are audited with the register");
  // the audit page (finance) is reachable for roles that hold audit:view
  assert.equal((await pool.query(`SELECT 1 FROM "Role" r JOIN "RolePermission" rp ON rp."roleId"=r.id JOIN "Permission" p ON p.id=rp."permissionId" WHERE r.code='POLICE_ADMIN' AND p.code IN ('cash:collect','cash:deposit_validate','cash:deposit_create','cash:reconcile','cash:register')`)).rowCount, 0, "the administrator holds no permission to operate on financial records");
});

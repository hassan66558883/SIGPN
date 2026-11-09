/**
 * Online payment of fines — live dev server (TRAFFIC_ONLINE_PROVIDER=sandbox) + seeded database:
 *   npx tsx --test tests/integration/online-payments.test.ts
 * Consumes a few payable fines of the dev database (they end up PAID). Temporary API keys are inserted directly (removed at the end).
 */
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash, createHmac } from "node:crypto";
import { Pool } from "pg";

const BASE = process.env.PMS_URL ?? "http://localhost:3300";
const SECRET = process.env.ONLINE_PAYMENT_WEBHOOK_SECRET ?? "sandbox-development-secret";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: "-c timezone=UTC" });
const RUN = Date.now().toString(36);
const keys: Record<string, string> = {};

async function keyFor(username: string): Promise<string> {
  const key = `pms_it${RUN.slice(-4)}_${randomBytes(32).toString("base64url")}`;
  const u = await pool.query(`SELECT id FROM "User" WHERE username=$1`, [username]);
  assert.ok(u.rowCount, `${username} exists`);
  await pool.query(`INSERT INTO "ApiKey"(id,"userId",name,"keyPrefix","keyHash") VALUES ($1,$2,'integration',$3,$4)`, [`apikey_op_${username}_${RUN}`, u.rows[0].id, `it${RUN.slice(-4)}`, createHash("sha256").update(key).digest("hex")]);
  return key;
}
async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as { data?: any; error?: { code: string; message: string } };
  return { status: res.status, data: json.data, error: json.error };
}
const staff = async (who: string, path: string, method = "GET") => {
  const res = await fetch(`${BASE}${path}`, { method, headers: { authorization: `Bearer ${keys[who]}` } });
  const json = (await res.json().catch(() => ({}))) as { data?: any; meta?: any };
  return { status: res.status, data: json.data, meta: json.meta };
};
/** What the sandbox operator would send: HMAC-SHA256 over `${timestamp}.${body}`. */
function signed(body: object, ts = Date.now()) {
  const raw = JSON.stringify(body);
  return { raw, headers: { "x-timestamp": String(ts), "x-signature": createHmac("sha256", SECRET).update(`${ts}.${raw}`).digest("hex") } };
}

type F = { id: string; pv: string; plate: string; amount: number };
let fines: F[] = [];
const dbFine = async (id: string) => (await pool.query(`SELECT status, "amountPaidFcfa" paid FROM "TrafficFine" WHERE id=$1`, [id])).rows[0] as { status: string; paid: number };

before(async () => {
  keys.admin = await keyFor("police.admin");
  const r = await pool.query(
    `SELECT f.id, t.number pv, t."plateNumber" plate, f."amountFcfa" amount FROM "TrafficFine" f JOIN "TrafficTicket" t ON t.id=f."ticketId"
     WHERE f.status='TO_PAY' AND f."amountPaidFcfa"=0 AND t.status='ISSUED' AND t."plateNumber" IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM "TrafficOnlinePayment" o WHERE o."fineId"=f.id) ORDER BY f."createdAt" DESC LIMIT 5`,
  );
  assert.ok(r.rows.length >= 5, "five payable fines are needed in the dev database");
  fines = r.rows;
});
after(async () => {
  await pool.query(`DELETE FROM "ApiKey" WHERE name='integration' AND "keyPrefix"=$1`, [`it${RUN.slice(-4)}`]);
  await pool.end();
});

test("lookup: same refusal for an unknown PV and a wrong plate; the right pair shows the amount", async () => {
  const f = fines[0];
  const wrongPlate = await post("/api/v1/public/fines/lookup", { pvNumber: f.pv, plate: "ZZ-000-ZZ" });
  const unknown = await post("/api/v1/public/fines/lookup", { pvNumber: "PV-NOPE-000000", plate: f.plate });
  assert.equal(wrongPlate.status, 404);
  assert.equal(unknown.status, 404);
  assert.equal(wrongPlate.error?.message, unknown.error?.message, "no oracle on the PV number");
  const ok = await post("/api/v1/public/fines/lookup", { pvNumber: f.pv.toLowerCase(), plate: f.plate.toLowerCase().replace(/-/g, " ") });
  assert.equal(ok.status, 200, "case, spaces and dashes in the plate do not matter");
  assert.equal(ok.data.remainingFcfa, f.amount);
  assert.equal(ok.data.payable, true);
  assert.ok(ok.data.methods.includes("MOBILE_MONEY"));
  assert.equal(JSON.stringify(ok.data).includes("officer"), false, "nothing about the officer or the driver");
});

test("a payment is only started, never settled, by the payer; a second attempt is refused while one is pending", async () => {
  const f = fines[0];
  const bad = await post("/api/v1/public/fines/pay", { pvNumber: f.pv, plate: f.plate, method: "MOBILE_MONEY", phone: "12" });
  assert.equal(bad.status, 422, "mobile money needs a phone number");
  const start = await post("/api/v1/public/fines/pay", { pvNumber: f.pv, plate: f.plate, method: "MOBILE_MONEY", phone: "+235 66 12 34 56" });
  assert.equal(start.status, 201);
  assert.equal(start.data.status, "PENDING");
  assert.ok(start.data.number && start.data.accessCode && start.data.instructions);
  assert.deepEqual(await dbFine(f.id), { status: "TO_PAY", paid: 0 }, "the fine is untouched until the operator confirms");
  const again = await post("/api/v1/public/fines/pay", { pvNumber: f.pv, plate: f.plate, method: "MOBILE_MONEY", phone: "66123456" });
  assert.equal(again.status, 409, "no double charge");
  const row = (await pool.query(`SELECT "payerPhoneMasked" m, "accessHash" h FROM "TrafficOnlinePayment" WHERE number=$1`, [start.data.number])).rows[0];
  assert.match(row.m, /^\*+3456$/, "only the masked phone is kept");
  assert.notEqual(row.h, start.data.accessCode, "the access code is stored hashed");
  const wrongCode = await post("/api/v1/public/fines/pay/status", { number: start.data.number, code: "not-the-code-at-all" });
  assert.equal(wrongCode.status, 404);
  const st = await post("/api/v1/public/fines/pay/status", { number: start.data.number, code: start.data.accessCode });
  assert.equal(st.data.status, "PENDING");
  assert.equal(st.data.receipt, null);
  // leave it pending for the webhook tests below
  (fines[0] as F & { pay?: unknown }).pay = start.data;
});

test("the operator notification: bad signature, stale timestamp and unknown payment are not accepted", async () => {
  const f = fines[0] as F & { pay: { number: string } };
  const ref = (await pool.query(`SELECT "providerReference" r FROM "TrafficOnlinePayment" WHERE number=$1`, [f.pay.number])).rows[0].r as string;
  const evt = { eventId: `e-${RUN}-1`, reference: ref, status: "SUCCESS", amountFcfa: f.amount };
  const tampered = signed(evt);
  const forged = await post("/api/v1/webhooks/payments", tampered.raw.replace("SUCCESS", "FAILED"), tampered.headers);
  assert.equal(forged.status, 401, "body altered after signing");
  const none = await post("/api/v1/webhooks/payments", tampered.raw);
  assert.equal(none.status, 401, "no signature");
  const old = signed(evt, Date.now() - 3600_000);
  assert.equal((await post("/api/v1/webhooks/payments", old.raw, old.headers)).status, 401, "replay of an old signed message");
  const wrongKey = createHmac("sha256", "another-secret-entirely").update(`${Date.now()}.${tampered.raw}`).digest("hex");
  assert.equal((await post("/api/v1/webhooks/payments", tampered.raw, { "x-timestamp": String(Date.now()), "x-signature": wrongKey })).status, 401);
  assert.deepEqual(await dbFine(f.id), { status: "TO_PAY", paid: 0 }, "still nothing credited");
  const unknown = signed({ eventId: `e-${RUN}-u`, reference: "SBX-unknown", status: "SUCCESS", amountFcfa: 1000 });
  const u = await post("/api/v1/webhooks/payments", unknown.raw, unknown.headers);
  assert.equal(u.status, 200);
  assert.equal(u.data.result, "unknown_reference");
});

test("operator confirms: the fine is paid once, the receipt exists, a replayed notification changes nothing", async () => {
  const f = fines[0] as F & { pay: { number: string; accessCode: string } };
  const ref = (await pool.query(`SELECT "providerReference" r FROM "TrafficOnlinePayment" WHERE number=$1`, [f.pay.number])).rows[0].r as string;
  const n = signed({ eventId: `e-${RUN}-ok`, reference: ref, status: "SUCCESS", amountFcfa: f.amount });
  const r1 = await post("/api/v1/webhooks/payments", n.raw, n.headers);
  assert.equal(r1.status, 200);
  assert.equal(r1.data.result, "succeeded");
  const replay = await post("/api/v1/webhooks/payments", n.raw, signed(JSON.parse(n.raw)).headers);
  assert.equal(replay.data.result, "duplicate");
  const second = signed({ eventId: `e-${RUN}-ok2`, reference: ref, status: "SUCCESS", amountFcfa: f.amount });
  assert.equal((await post("/api/v1/webhooks/payments", second.raw, second.headers)).data.result, "ignored", "another event for a settled payment");
  assert.deepEqual(await dbFine(f.id), { status: "PAID", paid: f.amount });
  const pays = (await pool.query(`SELECT p.method, p."transactionReference" ref, p."paymentPoint" pt, r.number rn FROM "TrafficPayment" p JOIN "TrafficReceipt" r ON r."paymentId"=p.id WHERE p."fineId"=$1 AND p."paymentPoint"='online'`, [f.id])).rows;
  assert.equal(pays.length, 1, "exactly one payment and one receipt");
  assert.equal(pays[0].method, "MOBILE_MONEY");
  assert.equal(pays[0].ref, ref);
  assert.equal(pays[0].pt, "online");
  const st = await post("/api/v1/public/fines/pay/status", { number: f.pay.number, code: f.pay.accessCode });
  assert.equal(st.data.status, "SUCCEEDED");
  assert.ok(st.data.receipt?.verificationToken, "the payer receives the receipt");
  const verify = await fetch(`${BASE}/api/v1/public/verify/receipt/${st.data.receipt.verificationToken}`);
  assert.equal(verify.status, 200, "and it verifies publicly");
  const again = await post("/api/v1/public/fines/pay", { pvNumber: f.pv, plate: f.plate, method: "MOBILE_MONEY", phone: "66123456" });
  assert.equal(again.status, 409, "a paid fine cannot be paid again");
  const look = await post("/api/v1/public/fines/lookup", { pvNumber: f.pv, plate: f.plate });
  assert.equal(look.data.payable, false);
  const author = (await pool.query(`SELECT u.username, u.status FROM "TrafficPayment" p JOIN "User" u ON u.id=p."receivedById" WHERE p."fineId"=$1`, [f.id])).rows[0];
  assert.deepEqual(author, { username: "system.online-payments", status: "DISABLED" }, "authored by the disabled gateway account");
});

test("operator refuses: the fine stays payable and the payer may try again", async () => {
  const f = fines[1];
  const start = await post("/api/v1/public/fines/pay", { pvNumber: f.pv, plate: f.plate, method: "ELECTRONIC" });
  assert.equal(start.status, 201);
  const sim = await post("/api/v1/public/fines/pay/sandbox", { number: start.data.number, code: start.data.accessCode, outcome: "FAILED" });
  assert.equal(sim.data.result, "failed");
  const st = await post("/api/v1/public/fines/pay/status", { number: start.data.number, code: start.data.accessCode });
  assert.equal(st.data.status, "FAILED");
  assert.deepEqual(await dbFine(f.id), { status: "TO_PAY", paid: 0 });
  const retry = await post("/api/v1/public/fines/pay", { pvNumber: f.pv, plate: f.plate, method: "ELECTRONIC" });
  assert.equal(retry.status, 201, "a failed attempt does not block a new one");
  const ok = await post("/api/v1/public/fines/pay/sandbox", { number: retry.data.number, code: retry.data.accessCode, outcome: "SUCCESS" });
  assert.equal(ok.data.result, "succeeded");
  assert.equal((await dbFine(f.id)).status, "PAID");
});

test("the amount reported by the operator must match: otherwise nothing is credited and a refund is flagged", async () => {
  const f = fines[2];
  const start = await post("/api/v1/public/fines/pay", { pvNumber: f.pv, plate: f.plate, method: "MOBILE_MONEY", phone: "99887766" });
  const ref = (await pool.query(`SELECT "providerReference" r FROM "TrafficOnlinePayment" WHERE number=$1`, [start.data.number])).rows[0].r as string;
  const n = signed({ eventId: `e-${RUN}-mm`, reference: ref, status: "SUCCESS", amountFcfa: f.amount - 500 });
  assert.equal((await post("/api/v1/webhooks/payments", n.raw, n.headers)).data.result, "failed");
  assert.deepEqual(await dbFine(f.id), { status: "TO_PAY", paid: 0 }, "not credited");
  const list = await staff("admin", "/api/v1/traffic/online-payments?refund=1&pageSize=100");
  assert.equal(list.status, 200);
  const mine = (list.data as { number: string; failureReason: string }[]).find((x) => x.number === start.data.number);
  assert.ok(mine && mine.failureReason.startsWith("REFUND_REQUIRED"), "staff see money taken and not credited");
  assert.ok(list.meta.refundRequired >= 1);
});

test("fine settled at the counter while the payer was confirming: the online money is flagged for refund, never double-credited", async () => {
  const f = fines[3];
  const start = await post("/api/v1/public/fines/pay", { pvNumber: f.pv, plate: f.plate, method: "BANK_TRANSFER" });
  assert.equal(start.status, 201);
  await pool.query(`UPDATE "TrafficFine" SET status='PAID', "amountPaidFcfa"="amountFcfa", "paidAt"=now() WHERE id=$1`, [f.id]); // paid at a counter
  const sim = await post("/api/v1/public/fines/pay/sandbox", { number: start.data.number, code: start.data.accessCode, outcome: "SUCCESS" });
  assert.equal(sim.data.result, "failed");
  const row = (await pool.query(`SELECT status, "failureReason" r FROM "TrafficOnlinePayment" WHERE number=$1`, [start.data.number])).rows[0];
  assert.equal(row.status, "FAILED");
  assert.match(row.r, /^REFUND_REQUIRED/);
  assert.equal((await pool.query(`SELECT count(*)::int n FROM "TrafficPayment" WHERE "fineId"=$1`, [f.id])).rows[0].n, (await pool.query(`SELECT count(*)::int n FROM "TrafficPayment" WHERE "fineId"=$1 AND "paymentPoint" IS DISTINCT FROM 'online'`, [f.id])).rows[0].n, "no online payment was recorded");
});

test("staff: the list needs a session or key and the right permission; payments are audited", async () => {
  assert.equal((await fetch(`${BASE}/api/v1/traffic/online-payments`)).status, 401);
  const list = await staff("admin", "/api/v1/traffic/online-payments?pageSize=50");
  assert.equal(list.status, 200);
  assert.ok(list.data.length >= 4);
  assert.ok(list.data.every((x: Record<string, unknown>) => !("accessHash" in x)), "the access hash never leaves the server");
  const pending = (await post("/api/v1/public/fines/pay", { pvNumber: fines[4].pv, plate: fines[4].plate, method: "MOBILE_MONEY", phone: "66000111" })).data;
  const id = (await pool.query(`SELECT id FROM "TrafficOnlinePayment" WHERE number=$1`, [pending.number])).rows[0].id;
  const chk = await staff("admin", `/api/v1/traffic/online-payments/${id}/check`, "POST");
  assert.equal(chk.status, 200);
  assert.equal(chk.data.status, "PENDING", "the sandbox has nothing to add");
  const audited = (await pool.query(`SELECT count(*)::int n FROM "AuditLog" WHERE action IN ('TRAFFIC_ONLINE_PAYMENT_STARTED','TRAFFIC_ONLINE_PAYMENT_REFUND_REQUIRED','TRAFFIC_ONLINE_PAYMENT_FAILED','TRAFFIC_ONLINE_PAYMENT_CHECKED') AND "at" > now() - interval '10 minutes'`)).rows[0].n;
  assert.ok(audited >= 5, `started, failed, refund and check are in the audit log (${audited})`);
  // clean up: leave no pending attempt blocking the last fine
  await pool.query(`UPDATE "TrafficOnlinePayment" SET status='FAILED', "failureReason"='test cleanup' WHERE id=$1`, [id]);
});

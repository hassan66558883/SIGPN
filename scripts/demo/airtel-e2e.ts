/**
 * End-to-end check of the Airtel Money chain against the LIVE app and a local MOCK of the Airtel Open API.
 *   1. start the app with the mock as its Airtel:  AIRTEL_BASE_URL=http://127.0.0.1:4010 AIRTEL_CLIENT_ID=cid AIRTEL_CLIENT_SECRET=sec
 *      TRAFFIC_ONLINE_PROVIDER=airtel,sandbox ONLINE_PAYMENT_WEBHOOK_SECRET=<16+ chars>  npm run dev
 *   2. npx tsx scripts/demo/airtel-e2e.ts
 * Consumes two payable fines of the dev database. Proves the application chain; it does NOT prove Airtel's real sandbox.
 */
import "dotenv/config";
import http from "node:http";
import { Pool } from "pg";

const BASE = process.env.PMS_URL ?? "http://localhost:3300";
const KEY = process.env.ONLINE_PAYMENT_WEBHOOK_SECRET ?? "";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const status: Record<string, string> = {};

const mock = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const body = raw ? JSON.parse(raw) : null;
    const send = (c: number, o: unknown) => (res.writeHead(c, { "content-type": "application/json" }), res.end(JSON.stringify(o)));
    if (req.url === "/auth/oauth2/token") return send(200, { access_token: "tok", expires_in: 180 });
    if (req.url === "/merchant/v2/payments/") {
      status[body.transaction.id] = "TIP";
      return send(200, { data: { transaction: { id: body.transaction.id, status: "TIP" } }, status: { code: "200", success: true } });
    }
    const m = /^\/standard\/v1\/payments\/([^/]+)$/.exec(req.url ?? "");
    if (m) return send(200, { data: { transaction: { id: m[1], status: status[m[1]] ?? "TIP" } }, status: { code: "200", success: true } });
    send(404, {});
  });
});

let failures = 0;
const check = (ok: boolean, what: string, extra?: unknown) => {
  console.log(`${ok ? "OK  " : "FAIL"} ${what}${ok || extra === undefined ? "" : ` — ${JSON.stringify(extra)}`}`);
  if (!ok) failures++;
};
const post = async (path: string, body: unknown) => {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });
  return { status: res.status, data: ((await res.json().catch(() => ({}))) as { data?: any }).data };
};
const fineState = async (pv: string) => (await pool.query(`SELECT f.status, f."amountPaidFcfa" paid FROM "TrafficFine" f JOIN "TrafficTicket" t ON t.id=f."ticketId" WHERE t.number=$1`, [pv])).rows[0];

async function main() {
  await new Promise<void>((r) => mock.listen(4010, "127.0.0.1", r));
  const fines = (await pool.query(`SELECT t.number pv, t."plateNumber" plate, f."amountFcfa" a FROM "TrafficFine" f JOIN "TrafficTicket" t ON t.id=f."ticketId" WHERE f.status='TO_PAY' AND f."amountPaidFcfa"=0 AND t.status='ISSUED' AND t."plateNumber" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "TrafficOnlinePayment" o WHERE o."fineId"=f.id) ORDER BY f."createdAt" DESC LIMIT 2`)).rows;
  const [f1, f2] = fines;
  const look = await post("/api/v1/public/fines/lookup", { pvNumber: f1.pv, plate: f1.plate });
  check(look.status === 200 && look.data.operators.some((o: any) => o.code === "airtel"), "lookup offers Airtel Money", look.data?.operators);

  const start = await post("/api/v1/public/fines/pay", { pvNumber: f1.pv, plate: f1.plate, method: "MOBILE_MONEY", provider: "airtel", phone: "+235 66 12 34 56" });
  check(start.status === 201, "payment started at Airtel (USSD push)", start);
  const ref = (await pool.query(`SELECT "providerReference" r, provider p FROM "TrafficOnlinePayment" WHERE number=$1`, [start.data.number])).rows[0];
  check(ref.p === "airtel" && ref.r === start.data.number.toUpperCase() || ref.p === "airtel", "stored with provider airtel", ref);

  const cb = (id: string, code: string) => JSON.stringify({ transaction: { id, status_code: code, message: "x", airtel_money_id: "MP1" } });
  check((await post(`/api/v1/webhooks/payments/airtel`, cb(ref.r, "TS"))).status === 401, "callback without the secret key is refused");
  check((await post(`/api/v1/webhooks/payments/airtel?key=${"z".repeat(KEY.length)}`, cb(ref.r, "TS"))).status === 401, "callback with a wrong key is refused");

  const early = await post(`/api/v1/webhooks/payments/airtel?key=${KEY}`, cb(ref.r, "TS"));
  check(early.data?.result === "pending", "callback claims TS but Airtel still says in progress: nothing credited", early.data);
  check((await fineState(f1.pv)).status === "TO_PAY", "fine untouched");

  status[ref.r] = "TS";
  const lie = await post(`/api/v1/webhooks/payments/airtel?key=${KEY}`, cb(ref.r, "TF"));
  check(lie.data?.result === "succeeded", "outcome comes from the status query, not from the callback body", lie.data);
  const st = await fineState(f1.pv);
  check(st.status === "PAID" && st.paid === f1.a, "fine PAID for the full amount", st);
  const again = await post(`/api/v1/webhooks/payments/airtel?key=${KEY}`, cb(ref.r, "TF"));
  check(["duplicate", "ignored"].includes(again.data?.result), "repeat callback changes nothing", again.data);
  const n = (await pool.query(`SELECT count(*)::int n FROM "TrafficPayment" p JOIN "TrafficFine" f ON f.id=p."fineId" JOIN "TrafficTicket" t ON t.id=f."ticketId" WHERE t.number=$1 AND p."paymentPoint"='online'`, [f1.pv])).rows[0].n;
  check(n === 1, "exactly one payment recorded", n);

  // callback lost: the payer's own status poll asks Airtel
  const s2 = await post("/api/v1/public/fines/pay", { pvNumber: f2.pv, plate: f2.plate, method: "MOBILE_MONEY", provider: "airtel", phone: "66123457" });
  const r2 = (await pool.query(`SELECT "providerReference" r FROM "TrafficOnlinePayment" WHERE number=$1`, [s2.data.number])).rows[0].r;
  status[r2] = "TS";
  const poll = await post("/api/v1/public/fines/pay/status", { number: s2.data.number, code: s2.data.accessCode });
  check(poll.data?.status === "SUCCEEDED" && !!poll.data?.receipt, "no callback: the status poll settles it from Airtel", poll.data);
  check((await fineState(f2.pv)).status === "PAID", "second fine PAID");

  console.log(failures ? `\n${failures} FAILED` : "\nAll good (against the mock, not Airtel itself).");
}
main()
  .catch((e) => {
    console.error(e);
    failures++;
  })
  .finally(async () => {
    mock.close();
    await pool.end();
    process.exit(failures ? 1 : 0);
  });

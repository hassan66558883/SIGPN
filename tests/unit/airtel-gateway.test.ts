/**
 * The Airtel Money adapter against a local MOCK of the Airtel Open API (OAuth2, collection, status). This proves the adapter speaks the
 * documented shape and refuses what it must refuse; it does NOT prove Airtel's real sandbox accepts it (that needs merchant credentials).
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { airtelCallbackBody, airtelGateway, airtelMsisdn, type AirtelConfig } from "../../src/server/traffic/airtel-gateway";

type Seen = { method: string; url: string; headers: http.IncomingHttpHeaders; body: any };
const seen: Seen[] = [];
const status: Record<string, string> = {}; // transaction id -> Airtel status code the mock answers
let tokenCalls = 0;
let server: http.Server;
let cfg: AirtelConfig;

before(async () => {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : null;
      seen.push({ method: req.method!, url: req.url!, headers: req.headers, body });
      const send = (code: number, obj: unknown) => {
        res.writeHead(code, { "content-type": "application/json" });
        res.end(JSON.stringify(obj));
      };
      if (req.url === "/auth/oauth2/token") {
        tokenCalls++;
        return body?.client_id === "cid" && body?.client_secret === "sec" && body?.grant_type === "client_credentials" ? send(200, { access_token: "tok-123", expires_in: 180, token_type: "bearer" }) : send(401, { error: "invalid_client" });
      }
      if (req.headers.authorization !== "Bearer tok-123") return send(401, { error: "unauthorized" });
      if (req.url === "/merchant/v2/payments/" && req.method === "POST") {
        if (body?.subscriber?.msisdn === "11111111") return send(200, { status: { code: "400", success: false, message: "Invalid subscriber" } });
        status[body.transaction.id] = "TIP";
        return send(200, { data: { transaction: { id: body.transaction.id, status: "TIP" } }, status: { code: "200", message: "Success", success: true } });
      }
      const m = /^\/standard\/v1\/payments\/([^/]+)$/.exec(req.url!);
      if (m && req.method === "GET") return status[m[1]] ? send(200, { data: { transaction: { id: m[1], status: status[m[1]], message: "msg" } }, status: { code: "200", success: true } }) : send(404, { status: { success: false } });
      send(404, {});
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  cfg = { baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, clientId: "cid", clientSecret: "sec", country: "TD", currency: "XAF", callbackKey: "k".repeat(24) };
});
after(() => server.close());

test("msisdn: digits only, without the Chad calling code", () => {
  assert.equal(airtelMsisdn("+235 66 12 34 56"), "66123456");
  assert.equal(airtelMsisdn("00235 66-12-34-56"), "66123456");
  assert.equal(airtelMsisdn("66123456"), "66123456");
});

test("initiate: OAuth token, then a collection with country/currency headers and our order number as the transaction id", async () => {
  const g = airtelGateway(cfg);
  const r = await g.initiate({ orderNumber: "OPY-2026-000001", amountFcfa: 25000, method: "MOBILE_MONEY", payerPhone: "+235 66123456" });
  assert.equal(r.providerReference, "OPY-2026-000001");
  const pay = seen.find((s) => s.url === "/merchant/v2/payments/")!;
  assert.equal(pay.headers["x-country"], "TD");
  assert.equal(pay.headers["x-currency"], "XAF");
  assert.equal(pay.headers.authorization, "Bearer tok-123");
  assert.deepEqual(pay.body.subscriber, { country: "TD", currency: "XAF", msisdn: "66123456" });
  assert.equal(pay.body.transaction.amount, 25000);
  assert.equal(pay.body.transaction.id, "OPY-2026-000001");
  await g.initiate({ orderNumber: "OPY-2026-000002", amountFcfa: 1000, method: "MOBILE_MONEY", payerPhone: "66123456" });
  assert.equal(tokenCalls, 1, "the token is reused until it expires");
});

test("initiate: refused by Airtel, bad credentials and a missing number are clean business errors", async () => {
  const g = airtelGateway(cfg);
  await assert.rejects(g.initiate({ orderNumber: "OPY-X-1", amountFcfa: 1000, method: "MOBILE_MONEY", payerPhone: "11111111" }), /could not start/);
  await assert.rejects(g.initiate({ orderNumber: "OPY-X-2", amountFcfa: 1000, method: "MOBILE_MONEY", payerPhone: null }), /number is required/);
  await assert.rejects(airtelGateway({ ...cfg, clientSecret: "wrong" }).initiate({ orderNumber: "OPY-X-3", amountFcfa: 1000, method: "MOBILE_MONEY", payerPhone: "66123456" }), /authentication/);
});

test("status query: TS = success, TF/TE = failed, TIP or unknown = not settled yet", async () => {
  const g = airtelGateway(cfg);
  await g.initiate({ orderNumber: "OPY-Q-1", amountFcfa: 1000, method: "MOBILE_MONEY", payerPhone: "66123456" });
  assert.equal(await g.queryStatus("OPY-Q-1"), null, "in progress");
  status["OPY-Q-1"] = "TS";
  assert.equal((await g.queryStatus("OPY-Q-1"))?.outcome, "SUCCESS");
  status["OPY-Q-1"] = "TF";
  assert.equal((await g.queryStatus("OPY-Q-1"))?.outcome, "FAILED");
  status["OPY-Q-1"] = "TE";
  assert.equal((await g.queryStatus("OPY-Q-1"))?.outcome, "FAILED");
  status["OPY-Q-1"] = "TA";
  assert.equal(await g.queryStatus("OPY-Q-1"), null, "ambiguous: wait");
  assert.equal(await g.queryStatus("OPY-UNKNOWN"), null);
});

test("callback: only the secret in the URL authenticates it, and its body never decides the outcome", () => {
  const g = airtelGateway(cfg);
  const body = airtelCallbackBody("OPY-C-1", "TS");
  const n = g.verifyNotification(body, new Headers(), new URLSearchParams({ key: cfg.callbackKey }));
  assert.equal(n.reference, "OPY-C-1");
  assert.equal(n.outcome, "FAILED", "a placeholder: the service replaces it by the answer to a status query");
  assert.ok(g.confirmByQuery);
  assert.throws(() => g.verifyNotification(body, new Headers(), new URLSearchParams()), /invalid key/);
  assert.throws(() => g.verifyNotification(body, new Headers(), new URLSearchParams({ key: "x".repeat(24) })), /invalid key/);
  assert.throws(() => g.verifyNotification("not json", new Headers(), new URLSearchParams({ key: cfg.callbackKey })), /not JSON/);
  assert.throws(() => g.verifyNotification("{}", new Headers(), new URLSearchParams({ key: cfg.callbackKey })), /unexpected content/);
});

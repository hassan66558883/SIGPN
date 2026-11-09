import { timingSafeEqual } from "node:crypto";
import { BusinessError } from "@/server/errors";
import type { GatewayNotification, GatewayOutcome, OnlineGateway } from "@/server/traffic/online-gateway";

/**
 * Airtel Money Open API (collections, "USSD push"): the payer receives a prompt on their phone and enters their PIN.
 *
 * Built from the public description of the API (OAuth2 client credentials; POST /merchant/v2/payments/; GET /standard/v1/payments/{id};
 * status TS = success, TF = failed, TE = expired, TIP/TA = still in progress), and exercised here only against a local mock of it.
 * IT HAS NOT YET RUN AGAINST AIRTEL'S OWN SANDBOX: that needs the merchant's client id/secret. Check field names and the country /
 * currency headers against the contract and the UAT environment before going live.
 *
 * Security model: the callback is only a TRIGGER. Its authenticity is checked by a secret in the callback URL (`?key=`), and the
 * outcome is never taken from its body: the application asks Airtel for the transaction status (server to server, with its OAuth
 * token) and credits the fine on that answer alone (`confirmByQuery`).
 */
export type AirtelConfig = { baseUrl: string; clientId: string; clientSecret: string; country: string; currency: string; callbackKey: string; timeoutMs?: number };

const HOSTS = { uat: "https://openapiuat.airtel.africa", prod: "https://openapi.airtel.africa" } as const;

export function airtelConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AirtelConfig {
  const clientId = env.AIRTEL_CLIENT_ID;
  const clientSecret = env.AIRTEL_CLIENT_SECRET;
  const callbackKey = env.ONLINE_PAYMENT_WEBHOOK_SECRET;
  if (!clientId || !clientSecret) throw new BusinessError("Airtel Money is not configured: AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET are required.", "STATE");
  if (!callbackKey || callbackKey.length < 16) throw new BusinessError("ONLINE_PAYMENT_WEBHOOK_SECRET (at least 16 characters) is required for Airtel callbacks.", "STATE");
  const baseUrl = env.AIRTEL_BASE_URL || HOSTS[env.AIRTEL_ENV === "prod" ? "prod" : "uat"];
  return { baseUrl: baseUrl.replace(/\/+$/, ""), clientId, clientSecret, country: env.AIRTEL_COUNTRY || "TD", currency: env.AIRTEL_CURRENCY || "XAF", callbackKey };
}

/** Local number as Airtel expects it: digits only, without the country calling code (235 for Chad). */
export function airtelMsisdn(raw: string, callingCode = "235"): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith(callingCode) && d.length > callingCode.length + 6) d = d.slice(callingCode.length);
  return d;
}

const STATUS: Record<string, GatewayOutcome | null> = { TS: "SUCCESS", TF: "FAILED", TE: "FAILED", TIP: null, TA: null };

export function airtelGateway(cfg: AirtelConfig): OnlineGateway {
  let token: { value: string; until: number } | null = null;

  async function http(path: string, init: RequestInit & { auth?: boolean } = {}) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs ?? 15_000);
    try {
      const res = await fetch(`${cfg.baseUrl}${path}`, { ...init, signal: ctl.signal, headers: { "content-type": "application/json", accept: "*/*", ...(init.headers as Record<string, string>) } });
      const text = await res.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        /* not JSON */
      }
      return { ok: res.ok, status: res.status, json: json as Record<string, any> | null };
    } finally {
      clearTimeout(timer);
    }
  }

  async function bearer(): Promise<string> {
    if (token && token.until > Date.now() + 30_000) return token.value;
    const r = await http("/auth/oauth2/token", { method: "POST", body: JSON.stringify({ client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: "client_credentials" }) });
    const value = r.json?.access_token;
    if (!r.ok || typeof value !== "string") throw new BusinessError("Airtel Money refused the authentication.", "STATE");
    token = { value, until: Date.now() + (Number(r.json?.expires_in) || 180) * 1000 };
    return value;
  }
  const headers = async () => ({ authorization: `Bearer ${await bearer()}`, "X-Country": cfg.country, "X-Currency": cfg.currency });

  return {
    name: "airtel",
    label: "Airtel Money",
    methods: ["MOBILE_MONEY"],
    confirmByQuery: true,

    async initiate(input) {
      if (!input.payerPhone) throw new BusinessError("The Airtel Money number is required.", "VALIDATION", { phone: "required" });
      const msisdn = airtelMsisdn(input.payerPhone);
      const r = await http("/merchant/v2/payments/", {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({
          reference: input.orderNumber,
          subscriber: { country: cfg.country, currency: cfg.currency, msisdn },
          transaction: { amount: input.amountFcfa, country: cfg.country, currency: cfg.currency, id: input.orderNumber },
        }),
      });
      const ok = r.ok && (r.json?.status?.success === true || String(r.json?.status?.code) === "200");
      if (!ok) throw new BusinessError("Airtel Money could not start the payment.", "STATE");
      // We name the transaction ourselves (our order number), so that is the reference the callback and the status query carry.
      return { providerReference: input.orderNumber, instructions: "Validez le paiement sur votre téléphone Airtel Money en saisissant votre code PIN." };
    },

    verifyNotification(rawBody, _headers, query) {
      const key = query.get("key") ?? "";
      const a = Buffer.from(key);
      const b = Buffer.from(cfg.callbackKey);
      if (a.length !== b.length || !timingSafeEqual(a, b)) throw new BusinessError("Notification rejected: invalid key.", "VALIDATION");
      let body: { transaction?: { id?: unknown; status_code?: unknown } };
      try {
        body = JSON.parse(rawBody);
      } catch {
        throw new BusinessError("Notification rejected: not JSON.", "VALIDATION");
      }
      const id = body.transaction?.id;
      if (typeof id !== "string" || !id) throw new BusinessError("Notification rejected: unexpected content.", "VALIDATION");
      // The body is only a pointer to the transaction: the outcome comes from the status query, not from here.
      return { eventId: `${id}:${String(body.transaction?.status_code ?? "?")}`.slice(0, 120), reference: id.slice(0, 120), outcome: "FAILED", amountFcfa: undefined };
    },

    async queryStatus(providerReference) {
      const r = await http(`/standard/v1/payments/${encodeURIComponent(providerReference)}`, { method: "GET", headers: await headers() });
      if (!r.ok) return null;
      const code = String(r.json?.data?.transaction?.status ?? "");
      const outcome = STATUS[code];
      if (!outcome) return null; // in progress, ambiguous or unknown: not settled yet
      return { eventId: `${providerReference}:${code}`, reference: providerReference, outcome, amountFcfa: undefined, reason: outcome === "FAILED" ? String(r.json?.data?.transaction?.message ?? "Refused by Airtel Money.").slice(0, 200) : undefined };
    },
  };
}

/** Used by tests that need to forge what Airtel would post to the callback URL. */
export function airtelCallbackBody(transactionId: string, statusCode: string) {
  return JSON.stringify({ transaction: { id: transactionId, message: statusCode === "TS" ? "Paid" : "Failed", status_code: statusCode, airtel_money_id: "MP000000.0000.A00000" } });
}

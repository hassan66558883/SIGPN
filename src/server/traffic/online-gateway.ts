import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { TrafficPaymentMethod } from "@/generated/prisma/client";
import { BusinessError } from "@/server/errors";
import { randomToken } from "@/server/crypto";
import { airtelConfigFromEnv, airtelGateway } from "@/server/traffic/airtel-gateway";

/**
 * Online payment gateway: the contract between the application and an operator (mobile money, card processor, bank).
 *
 * The application never settles a fine on the payer's word. It asks the gateway to start a payment (`initiate`), then waits for the
 * operator's confirmation, which reaches it by a SIGNED notification (`verifyNotification`) or by a status query (`queryStatus`).
 * A real operator is one more implementation of {@link OnlineGateway}, selected with TRAFFIC_ONLINE_PROVIDER; nothing else changes.
 * Only the `sandbox` implementation exists today: it behaves like an operator (asynchronous, signed notifications) so that the whole
 * chain can be run and tested, but it moves no money.
 */
export type GatewayOutcome = "SUCCESS" | "FAILED";
/** `amountFcfa` is absent when the operator does not report it (Airtel): the amount is then the one we asked for. */
export type GatewayNotification = { eventId: string; reference: string; outcome: GatewayOutcome; amountFcfa?: number; reason?: string };
export type GatewayInitiated = { providerReference: string; instructions: string };

export interface OnlineGateway {
  readonly name: string;
  /** What the payer sees when choosing an operator. */
  readonly label: string;
  /** true: a notification is only a trigger; the outcome is read from `queryStatus`, never from the notification body. */
  readonly confirmByQuery?: boolean;
  /** Methods this operator can collect. */
  readonly methods: readonly TrafficPaymentMethod[];
  initiate(input: { orderNumber: string; amountFcfa: number; method: TrafficPaymentMethod; payerPhone: string | null }): Promise<GatewayInitiated>;
  /** Checks the authenticity of a notification (signature, freshness) and returns its content. Throws when it cannot be trusted. */
  verifyNotification(rawBody: string, headers: Headers, query: URLSearchParams): GatewayNotification;
  /** Asks the operator where a payment stands. `null`: the operator does not know (yet). */
  queryStatus(providerReference: string): Promise<GatewayNotification | null>;
}

const TOLERANCE_MS = 5 * 60_000;

export function webhookSecret(): string {
  const s = process.env.ONLINE_PAYMENT_WEBHOOK_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") throw new BusinessError("ONLINE_PAYMENT_WEBHOOK_SECRET (at least 16 characters) is required.", "STATE");
  return "sandbox-development-secret"; // development and tests only
}

/** Signature scheme of the sandbox operator (and the model for a real one): HMAC-SHA256 over `${timestamp}.${body}`, hex. */
export function signNotification(rawBody: string, timestamp: number = Date.now()): { signature: string; timestamp: string } {
  const ts = String(timestamp);
  return { timestamp: ts, signature: createHmac("sha256", webhookSecret()).update(`${ts}.${rawBody}`).digest("hex") };
}

function sameHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}

const sandboxGateway: OnlineGateway = {
  name: "sandbox",
  label: "Simulation (sans argent réel)",
  methods: ["MOBILE_MONEY", "ELECTRONIC", "BANK_TRANSFER"],
  async initiate(input) {
    return {
      providerReference: `SBX-${randomToken(9)}`,
      instructions: input.method === "MOBILE_MONEY" ? "Confirmez le paiement sur votre téléphone (simulation : aucun argent n'est prélevé)." : "Finalisez le paiement auprès de votre établissement (simulation : aucun argent n'est prélevé).",
    };
  },
  verifyNotification(rawBody, headers) {
    const signature = headers.get("x-signature") ?? "";
    const timestamp = headers.get("x-timestamp") ?? "";
    const ts = Number(timestamp);
    if (!signature || !Number.isFinite(ts) || Math.abs(Date.now() - ts) > TOLERANCE_MS) throw new BusinessError("Notification rejected: signature or timestamp missing, or too old.", "VALIDATION");
    const expected = createHmac("sha256", webhookSecret()).update(`${timestamp}.${rawBody}`).digest("hex");
    if (!sameHex(signature, expected)) throw new BusinessError("Notification rejected: invalid signature.", "VALIDATION");
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new BusinessError("Notification rejected: not JSON.", "VALIDATION");
    }
    const b = body as Partial<{ eventId: unknown; reference: unknown; status: unknown; amountFcfa: unknown; reason: unknown }>;
    if (typeof b.eventId !== "string" || !b.eventId || typeof b.reference !== "string" || !b.reference || (b.status !== "SUCCESS" && b.status !== "FAILED") || !Number.isInteger(b.amountFcfa)) {
      throw new BusinessError("Notification rejected: unexpected content.", "VALIDATION");
    }
    return { eventId: b.eventId.slice(0, 120), reference: b.reference.slice(0, 120), outcome: b.status, amountFcfa: b.amountFcfa as number, reason: typeof b.reason === "string" ? b.reason.slice(0, 200) : undefined };
  },
  async queryStatus() {
    return null; // the sandbox keeps no ledger: it only ever answers through its notifications
  },
};

/** Operators enabled in this deployment: TRAFFIC_ONLINE_PROVIDER is `off` (default) or a comma list such as `airtel` or `airtel,sandbox`. */
export function listOnlineGateways(): OnlineGateway[] {
  const wanted = (process.env.TRAFFIC_ONLINE_PROVIDER || "off").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const out: OnlineGateway[] = [];
  for (const w of wanted) {
    if (w === "off") continue;
    if (w === "sandbox") {
      if (process.env.NODE_ENV === "production" && process.env.ALLOW_SANDBOX_PAYMENTS !== "yes") throw new BusinessError("The sandbox payment provider is not allowed in production.", "STATE");
      out.push(sandboxGateway);
    } else if (w === "airtel") out.push(airtelGateway(airtelConfigFromEnv()));
    else throw new BusinessError(`Online payment provider "${w}" is not configured in this deployment.`, "STATE");
  }
  return out;
}

/** One operator by name (the one a payment was started with), or null when it is no longer enabled. */
export function getOnlineGateway(name?: string): OnlineGateway | null {
  const all = listOnlineGateways();
  return name ? (all.find((g) => g.name === name) ?? null) : (all[0] ?? null);
}

/** Used by the public layer: a refusal is a clean "not available". */
export function requireOnlineGateway(name?: string): OnlineGateway {
  const g = getOnlineGateway(name);
  if (!g) throw new BusinessError("Online payment is not available at the moment. Please pay at a police payment point.", "STATE");
  return g;
}

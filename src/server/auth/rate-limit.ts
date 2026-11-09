import { RateLimitError } from "@/server/errors";

/**
 * In-process sliding-window rate limiter. Complements the Nginx zones and the
 * database-backed account lockout (which survives restarts and multiple instances).
 */
type Bucket = { hits: number[] };
const g = globalThis as unknown as { pmsRate?: Map<string, Bucket> };
const store = (g.pmsRate ??= new Map<string, Bucket>());

let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of store) {
    b.hits = b.hits.filter((t) => now - t < 3_600_000);
    if (b.hits.length === 0) store.delete(k);
  }
}

export const LIMITS = {
  loginIp: { limit: 100, windowMs: 15 * 60_000 },
  loginIdentifier: { limit: 20, windowMs: 15 * 60_000 },
  mfa: { limit: 10, windowMs: 10 * 60_000 },
  passwordReset: { limit: 5, windowMs: 60 * 60_000 },
  api: { limit: 240, windowMs: 60_000 },
  apiWrite: { limit: 60, windowMs: 60_000 },
  // The payment operator notifications: signed, so cheap to refuse, and a burst of them is normal (not shared with the public forms).
  webhook: { limit: 600, windowMs: 60_000 },
  // The public fine-payment routes: their own per-IP and per-PV buckets (publicFine, publicPay...) do the real limiting.
  payApi: { limit: 240, windowMs: 60_000 },
  upload: { limit: 30, windowMs: 60_000 },
  // Per client IP (behind a trusted proxy). Overridable for load tests / demonstrations: PUBLIC_SUBMIT_LIMIT, PUBLIC_TRACK_LIMIT.
  publicSubmit: { limit: Number(process.env.PUBLIC_SUBMIT_LIMIT) || 5, windowMs: 60 * 60_000 },
  publicTrack: { limit: Number(process.env.PUBLIC_TRACK_LIMIT) || 10, windowMs: 15 * 60_000 },
  publicTrackRef: { limit: 8, windowMs: 60 * 60_000 },
  // Online payment of a fine: looking a fine up (per IP, and per PV number), starting a payment (per IP), following one (per IP).
  publicFine: { limit: Number(process.env.PUBLIC_FINE_LIMIT) || 20, windowMs: 15 * 60_000 },
  publicFinePv: { limit: 10, windowMs: 60 * 60_000 },
  publicPay: { limit: Number(process.env.PUBLIC_PAY_LIMIT) || 10, windowMs: 60 * 60_000 },
  publicPayStatus: { limit: 120, windowMs: 15 * 60_000 },
} as const;
export type LimitKey = keyof typeof LIMITS;

/** Throws RateLimitError when the (bucket, key) pair exceeded its limit. */
export function enforceRateLimit(bucket: LimitKey, key: string | null | undefined): void {
  const def = LIMITS[bucket];
  const now = Date.now();
  sweep(now);
  const k = `${bucket}:${key ?? "anon"}`;
  const b = store.get(k) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < def.windowMs);
  if (b.hits.length >= def.limit) {
    const retry = Math.ceil((def.windowMs - (now - b.hits[0])) / 1000);
    store.set(k, b);
    throw new RateLimitError(Math.max(1, retry));
  }
  b.hits.push(now);
  store.set(k, b);
}

/** Clears a key (e.g. after successful login). */
export function resetRateLimit(bucket: LimitKey, key: string | null | undefined) {
  store.delete(`${bucket}:${key ?? "anon"}`);
}

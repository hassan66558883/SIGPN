/**
 * Security audit, lot 7 — the rules of an API key, as pure functions.
 * Decision 13: a key always expires and is rotated at least every 90 days; it never carries a sensitive permission.
 */
export const API_KEY_MAX_DAYS_DEFAULT = 90;

/** The validity requested for a new key: mandatory, between 1 day and the maximum. Null = refused. */
export function keyExpiryDays(requested: number | null | undefined, maxDays: number = API_KEY_MAX_DAYS_DEFAULT): number | null {
  if (requested === null || requested === undefined || !Number.isFinite(requested)) return null;
  const days = Math.floor(requested);
  return days >= 1 && days <= maxDays ? days : null;
}

/** A key older than the maximum validity is refused whatever its own expiry says (legacy keys without one included). */
export function keyTooOld(createdAt: Date, now: number = Date.now(), maxDays: number = API_KEY_MAX_DAYS_DEFAULT): boolean {
  return now - createdAt.getTime() > maxDays * 86_400_000;
}

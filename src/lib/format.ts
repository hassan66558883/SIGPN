import type { Locale } from "@/lib/i18n";

// Gregorian calendar + Western (Latin) digits: standard for Chadian government systems even in Arabic.
const INTL: Record<Locale, string> = { fr: "fr-FR", ar: "ar-TD-u-ca-gregory-nu-latn" };
const cache = new Map<string, Intl.DateTimeFormat>();

function dtf(locale: Locale, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(opts)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(INTL[locale] ?? INTL.fr, opts);
    cache.set(key, f);
  }
  return f;
}

function asDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const x = typeof v === "string" ? new Date(v) : v;
  return Number.isNaN(x.getTime()) ? null : x;
}

export function fmtDateTime(v: Date | string | null | undefined, locale: Locale = "fr"): string {
  const d = asDate(v);
  return d ? dtf(locale, { dateStyle: "medium", timeStyle: "short" }).format(d) : "—";
}

export function fmtDate(v: Date | string | null | undefined, locale: Locale = "fr"): string {
  const d = asDate(v);
  return d ? dtf(locale, { dateStyle: "medium" }).format(d) : "—";
}

/** "2026-09" → « sept. 26 » (short month + 2-digit year). */
export function fmtMonthKey(key: string, locale: Locale = "fr"): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return dtf(locale, { month: "short", year: "2-digit" }).format(new Date(y, m - 1, 1));
}

export function fmtNumber(v: number | null | undefined, locale: Locale = "fr"): string {
  return v === null || v === undefined ? "—" : new Intl.NumberFormat(INTL[locale] ?? INTL.fr).format(v);
}

export function fmtBytes(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (v < 1024) return `${v} B`;
  const units = ["KB", "MB", "GB"];
  let n = v / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

export function fmtRelative(v: Date | string | null | undefined, locale: Locale = "fr"): string {
  const d = asDate(v);
  if (!d) return "—";
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(INTL[locale] ?? INTL.fr, { numeric: "auto" });
  if (abs < 60_000) return locale === "fr" ? "à l'instant" : "just now";
  if (abs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  return rtf.format(Math.round(diffMs / 86_400_000), "day");
}

/** yyyy-MM-ddTHH:mm for datetime-local inputs (local time). */
export function toInputDateTime(v: Date | null | undefined): string {
  if (!v) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}T${pad(v.getHours())}:${pad(v.getMinutes())}`;
}

export function toInputDate(v: Date | null | undefined): string {
  if (!v) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
}

export function initials(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function truncate(s: string | null | undefined, n = 80): string {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

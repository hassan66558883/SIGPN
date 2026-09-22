/**
 * Lightweight internationalization. French is the default and reference language;
 * Arabic is the second language (RTL — see `dir` handling in the root layout). Keys are
 * flat dotted strings, values may contain `{placeholders}`.
 */
import { fr } from "./fr";
import { ar } from "./ar";

export const LOCALES = ["fr", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "pms_lang";
export const RTL_LOCALES: readonly Locale[] = ["ar"];
export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export type MessageKey = keyof typeof fr;
export type Messages = Record<MessageKey, string>;

const DICTS: Record<Locale, Messages> = { fr, ar };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function getMessages(locale: Locale): Messages {
  return DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
}

export type Vars = Record<string, string | number | null | undefined>;

export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
}

export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const dict = getMessages(locale);
  const value = dict[key] ?? DICTS[DEFAULT_LOCALE][key] ?? key;
  return interpolate(value, vars);
}

export type TFunction = (key: MessageKey, vars?: Vars) => string;

export function makeT(locale: Locale): TFunction {
  return (key, vars) => translate(locale, key, vars);
}

export const LOCALE_NAMES: Record<Locale, string> = { fr: "Français", ar: "العربية" };

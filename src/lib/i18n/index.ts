/**
 * Lightweight internationalization. French is the default and reference language;
 * English is the second language. Keys are flat dotted strings, values may contain
 * `{placeholders}`.
 */
import { fr } from "./fr";
import { en } from "./en";

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "pms_lang";

export type MessageKey = keyof typeof fr;
export type Messages = Record<MessageKey, string>;

const DICTS: Record<Locale, Messages> = { fr, en };

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

export const LOCALE_NAMES: Record<Locale, string> = { fr: "Français", en: "English" };

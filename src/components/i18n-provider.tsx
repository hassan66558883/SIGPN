"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, interpolate, type Locale, type MessageKey, type Messages, type TFunction, type Vars } from "@/lib/i18n";
import { translateMessage } from "@/lib/i18n/errors";

type Ctx = { locale: Locale; messages: Messages };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(I18nContext)?.locale ?? DEFAULT_LOCALE;
}

export function useT(): TFunction {
  const ctx = useContext(I18nContext);
  return (key: MessageKey, vars?: Vars) => interpolate(ctx?.messages[key] ?? key, vars);
}

/** Translates server-produced messages (errors/success) that are written in English in the service layer. */
export function useMessageTranslator(): (message: string | undefined) => string | undefined {
  const locale = useLocale();
  return (message) => (message ? translateMessage(message, locale) : message);
}

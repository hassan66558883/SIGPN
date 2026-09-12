import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, makeT, type Locale, type TFunction } from "@/lib/i18n";

/** Locale of the current request: the `pms_lang` cookie if valid, otherwise French (always the default). */
export const getLocale = cache(async (): Promise<Locale> => {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
});

export async function getT(): Promise<TFunction> {
  return makeT(await getLocale());
}

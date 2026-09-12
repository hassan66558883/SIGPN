"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";
import { env } from "@/server/env";

/** Stores the UI language preference (cookie, 1 year). Not sensitive; no audit needed. */
export async function setLocaleAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "");
  if (!isLocale(locale)) return;
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, { httpOnly: true, sameSite: "lax", path: "/", secure: env.isProduction, maxAge: 365 * 86_400 });
  revalidatePath("/", "layout");
}

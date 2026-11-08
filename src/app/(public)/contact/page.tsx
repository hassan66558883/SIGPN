import type { Metadata } from "next";
import { getLocale, getT } from "@/server/i18n";
import { PublicForm } from "../public-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("pub.form.contactTitle") };
}

export default async function ContactPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-extrabold text-ink">{t("pub.form.contactTitle")}</h1>
      <PublicForm kind="CONTACT" locale={locale === "ar" ? "ar" : "fr"} stations={[]} />
    </div>
  );
}

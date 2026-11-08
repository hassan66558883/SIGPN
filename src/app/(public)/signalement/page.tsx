import type { Metadata } from "next";
import { publicStations } from "@/server/public/service";
import { getLocale, getT } from "@/server/i18n";
import { PublicForm } from "../public-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("pub.form.reportTitle") };
}

export default async function ReportPage() {
  const [t, locale, stations] = await Promise.all([getT(), getLocale(), publicStations()]);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-extrabold text-ink">{t("pub.form.reportTitle")}</h1>
      <PublicForm kind="REPORT" locale={locale === "ar" ? "ar" : "fr"} stations={stations.map((s) => ({ id: s.id, name: `${s.name} — ${s.region.name}` }))} />
    </div>
  );
}

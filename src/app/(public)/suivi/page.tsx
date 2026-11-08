import type { Metadata } from "next";
import { getT } from "@/server/i18n";
import { TrackForm } from "../public-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("pub.track.title") };
}

export default async function TrackPage() {
  const t = await getT();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-extrabold text-ink">{t("pub.track.title")}</h1>
      <TrackForm />
    </div>
  );
}

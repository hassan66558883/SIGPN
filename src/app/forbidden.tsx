import Link from "next/link";
import { getT } from "@/server/i18n";

export default async function Forbidden() {
  const t = await getT();
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="max-w-md rounded-xl border border-danger/30 bg-danger-soft p-8 text-center">
        <p className="text-5xl font-black text-danger">403</p>
        <h1 className="mt-2 text-lg font-bold text-danger">{t("err403.title")}</h1>
        <p className="mt-2 text-sm text-ink">{t("err403.body")}</p>
        <Link href="/dashboard" className="mt-5 inline-block rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white">
          {t("err403.back")}
        </Link>
      </div>
    </div>
  );
}

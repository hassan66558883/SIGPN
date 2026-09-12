import Link from "next/link";
import { getT } from "@/server/i18n";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="max-w-md rounded-xl border border-line bg-white p-8 text-center">
        <p className="text-5xl font-black text-navy">404</p>
        <h1 className="mt-2 text-lg font-bold">{t("err404.title")}</h1>
        <p className="mt-2 text-sm text-slate">{t("err404.body")}</p>
        <Link href="/dashboard" className="mt-5 inline-block rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white">
          {t("nav.dashboard")}
        </Link>
      </div>
    </div>
  );
}

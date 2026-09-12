import Link from "next/link";
import { getT } from "@/server/i18n";

export default async function Unauthorized() {
  const t = await getT();
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="max-w-md rounded-xl border border-line bg-white p-8 text-center">
        <p className="text-5xl font-black text-navy">401</p>
        <h1 className="mt-2 text-lg font-bold">{t("err401.title")}</h1>
        <p className="mt-2 text-sm text-slate">{t("err401.body")}</p>
        <Link href="/login" className="mt-5 inline-block rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white">
          {t("err401.signIn")}
        </Link>
      </div>
    </div>
  );
}

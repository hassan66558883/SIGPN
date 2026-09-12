"use client";

import Link from "next/link";
import { useT } from "@/components/i18n-provider";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="max-w-md rounded-xl border border-line bg-white p-8 text-center">
        <p className="text-5xl font-black text-navy">500</p>
        <h1 className="mt-2 text-lg font-bold">{t("err500.title")}</h1>
        <p className="mt-2 text-sm text-slate">{t("err500.body")}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={reset} className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-mist">
            {t("err500.retry")}
          </button>
          <Link href="/dashboard" className="rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white">
            {t("nav.dashboard")}
          </Link>
        </div>
      </div>
    </div>
  );
}

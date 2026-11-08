import type { Metadata } from "next";
import Link from "next/link";
import { publicNews } from "@/server/public/service";
import { getLocale, getT } from "@/server/i18n";
import { fmtDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("pub.news.title") };
}

export default async function NewsPage() {
  const [t, locale, news] = await Promise.all([getT(), getLocale(), publicNews()]);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold text-ink">{t("pub.news.title")}</h1>
      {news.length === 0 ? <p className="text-sm text-slate">{t("pub.news.empty")}</p> : (
        <ul className="space-y-4">
          {news.map((n) => (
            <li key={n.id} className="rounded-xl border border-line bg-card p-5">
              <Link href={`/actualites/${n.id}`} className="text-lg font-bold text-ink hover:underline">{n.title}</Link>
              <p className="mt-1 text-sm text-slate">{n.summary}</p>
              <p className="mt-2 text-xs text-slate">{fmtDate(n.publishedAt, locale)}{n.isDemo ? ` · ${t("pub.news.demo")}` : ""}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

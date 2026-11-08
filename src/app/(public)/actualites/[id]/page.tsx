import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicNews } from "@/server/public/service";
import { getLocale, getT } from "@/server/i18n";
import { fmtDate } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/actualites/[id]">): Promise<Metadata> {
  const { id } = await params;
  const [n] = await publicNews({ id, take: 1 });
  return { title: n?.title ?? (await getT())("pub.news.title") };
}

export default async function NewsItemPage({ params }: PageProps<"/actualites/[id]">) {
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  const [n] = await publicNews({ id, take: 1 });
  if (!n) notFound();
  return (
    <article className="mx-auto max-w-3xl space-y-3">
      <Link href="/actualites" className="text-sm font-semibold text-gold hover:underline">← {t("pub.news.back")}</Link>
      <h1 className="text-3xl font-extrabold text-ink">{n.title}</h1>
      <p className="text-xs text-slate">{fmtDate(n.publishedAt, locale)}{n.isDemo ? ` · ${t("pub.news.demo")}` : ""}</p>
      <div className="whitespace-pre-line text-base leading-relaxed text-ink">{n.body}</div>
    </article>
  );
}

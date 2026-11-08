import type { Metadata } from "next";
import Link from "next/link";
import type { MessageKey } from "@/lib/i18n";
import { prisma } from "@/server/db";
import { publicNews, publicWanted } from "@/server/public/service";
import { getLocale, getT } from "@/server/i18n";
import { fmtDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("pub.brand") };
}

const SERVICES: { href: string; title: MessageKey; text: MessageKey; icon: string }[] = [
  { href: "/plaintes", title: "pub.svc.complaint", text: "pub.svc.complaintText", icon: "✉" },
  { href: "/signalement", title: "pub.svc.report", text: "pub.svc.reportText", icon: "⚠" },
  { href: "/suivi", title: "pub.svc.track", text: "pub.svc.trackText", icon: "⌕" },
  { href: "/commissariats", title: "pub.svc.stations", text: "pub.svc.stationsText", icon: "⌂" },
  { href: "/avis-de-recherche", title: "pub.svc.wanted", text: "pub.svc.wantedText", icon: "⚑" },
  { href: "/contact", title: "pub.svc.contact", text: "pub.svc.contactText", icon: "☎" },
];

export default async function PublicHome() {
  const [t, locale, news, wanted, emergency] = await Promise.all([
    getT(),
    getLocale(),
    publicNews({ take: 3 }),
    publicWanted({ take: 3 }),
    // Never invented: shown only if the administration configured it.
    prisma.systemSetting.findUnique({ where: { key: "public.emergency_number" }, select: { value: true } }),
  ]);
  const emergencyNumber = typeof emergency?.value === "string" ? emergency.value : null;
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-line bg-card px-6 py-10 sm:px-10">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">{t("pub.brandSub")}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">{t("pub.home.title")}</h1>
        <p className="mt-3 max-w-2xl text-base text-slate">{t("pub.home.lead")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/plaintes" className="rounded-md bg-gold px-5 py-2.5 text-sm font-bold text-navy hover:brightness-110">{t("pub.nav.complaint")}</Link>
          <Link href="/suivi" className="rounded-md border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-mist-2">{t("pub.nav.track")}</Link>
        </div>
      </section>

      <div role="note" className="rounded-md border border-warning bg-warning-soft px-4 py-3 text-sm text-warning">
        <p className="font-semibold">{t("pub.home.emergency")}</p>
        {emergencyNumber ? <p className="mt-1 text-lg font-extrabold">{t("pub.home.emergencyNumber")} : {emergencyNumber}</p> : null}
      </div>

      <section aria-labelledby="svc">
        <h2 id="svc" className="mb-4 text-lg font-bold text-ink">{t("pub.home.services")}</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="block h-full rounded-xl border border-line bg-card p-5 transition hover:border-gold">
                <span aria-hidden className="text-2xl text-gold">{s.icon}</span>
                <span className="mt-2 block text-base font-bold text-ink">{t(s.title)}</span>
                <span className="mt-1 block text-sm text-slate">{t(s.text)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="news">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="news" className="text-lg font-bold text-ink">{t("pub.home.latestNews")}</h2>
            <Link href="/actualites" className="text-sm font-semibold text-gold hover:underline">{t("pub.home.seeAll")}</Link>
          </div>
          {news.length === 0 ? <p className="text-sm text-slate">{t("pub.news.empty")}</p> : (
            <ul className="space-y-3">
              {news.map((n) => (
                <li key={n.id} className="rounded-xl border border-line bg-card p-4">
                  <Link href={`/actualites/${n.id}`} className="font-bold text-ink hover:underline">{n.title}</Link>
                  <p className="mt-1 text-sm text-slate">{n.summary}</p>
                  <p className="mt-1 text-xs text-slate">{fmtDate(n.publishedAt, locale)}{n.isDemo ? ` · ${t("pub.news.demo")}` : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="wanted">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="wanted" className="text-lg font-bold text-ink">{t("pub.home.latestWanted")}</h2>
            <Link href="/avis-de-recherche" className="text-sm font-semibold text-gold hover:underline">{t("pub.home.seeAll")}</Link>
          </div>
          {wanted.length === 0 ? <p className="text-sm text-slate">{t("pub.wanted.empty")}</p> : (
            <ul className="space-y-3">
              {wanted.map((w) => (
                <li key={w.id} className="rounded-xl border border-line bg-card p-4">
                  <p className="font-bold text-ink">{w.name}</p>
                  <p className="text-sm text-slate">{w.offense}</p>
                  <p className="mt-1 text-xs text-slate">{t(`pub.wanted.kind.${w.kind}` as MessageKey)} · {w.reference}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate">{t("pub.wanted.lead")}</p>
        </section>
      </div>
    </div>
  );
}

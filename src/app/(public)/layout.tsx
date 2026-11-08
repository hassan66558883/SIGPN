import Link from "next/link";
import type { MessageKey } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocale, getT } from "@/server/i18n";

const LINKS: { href: string; key: MessageKey }[] = [
  { href: "/plaintes", key: "pub.nav.complaint" },
  { href: "/signalement", key: "pub.nav.report" },
  { href: "/suivi", key: "pub.nav.track" },
  { href: "/commissariats", key: "pub.nav.stations" },
  { href: "/avis-de-recherche", key: "pub.nav.wanted" },
  { href: "/actualites", key: "pub.nav.news" },
  { href: "/contact", key: "pub.nav.contact" },
];

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-gold focus:px-3 focus:py-2 focus:text-navy">
        {t("pub.nav.home")}
      </a>
      <header className="border-b border-line bg-navy">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="h-10 w-10" />
            <span>
              <span className="block text-base font-extrabold leading-tight text-white">{t("pub.brand")}</span>
              <span className="block text-[10px] uppercase tracking-widest text-gold">{t("pub.brandSub")}</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher current={locale} dark label="Langue" />
            <Link href="/login" className="rounded-md border border-gold px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold hover:text-navy">
              {t("pub.nav.staff")}
            </Link>
          </div>
        </div>
        <nav aria-label="Principal" className="border-t border-line/60">
          <ul className="mx-auto flex max-w-6xl flex-wrap gap-x-5 gap-y-1 px-4 py-2 text-sm">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/85 hover:text-gold">
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-line bg-navy px-4 py-5 text-xs text-slate">
        <div className="mx-auto max-w-6xl space-y-1">
          <p>{t("pub.footer.legal")}</p>
          <p>{t("pub.footer.privacy")}</p>
        </div>
      </footer>
    </div>
  );
}

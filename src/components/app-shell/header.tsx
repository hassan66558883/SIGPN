import Link from "next/link";
import { logoutAction } from "@/server/auth/actions";
import type { Actor } from "@/server/auth/dal";
import { MobileNav, type SidebarSection } from "@/components/app-shell/sidebar";
import { Badge } from "@/components/ui";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocale, getT } from "@/server/i18n";
import { roleName } from "@/lib/i18n/catalog";
import { env } from "@/server/env";

export async function Header({ actor, unreadCount, sections }: { actor: Actor; unreadCount: number; sections: SidebarSection[] }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const ini = `${actor.firstName[0] ?? ""}${actor.lastName[0] ?? ""}`.toUpperCase();
  return (
    <>
      {env.demoMode ? (
        <div className="no-print bg-warning px-3 py-1 text-center text-[11px] font-bold uppercase tracking-widest text-white" role="status">
          {t("demo.banner")}
        </div>
      ) : null}
    <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-white/95 px-3 backdrop-blur sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav sections={sections} />
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden" aria-label={t("nav.dashboard")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <span className="hidden text-sm font-bold text-navy sm:inline">{t("app.short")}</span>
        </Link>
        <span className="hidden text-xs text-slate md:inline">
          {actor.stationName ?? actor.regionName ?? t("common.national")} · <Badge tone="info">{roleName(actor.roleCode, actor.roleName, locale)}</Badge>
        </span>
      </div>
      <div className="flex items-center gap-1 sm:gap-3">
        <LanguageSwitcher current={locale} label={t("common.language")} />
        <Link href="/notifications" className="relative rounded-md p-2 text-slate hover:bg-mist hover:text-ink" title={t("notif.title")} aria-label={t("header.notifications", { n: unreadCount })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {unreadCount > 0 ? <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{unreadCount}</span> : null}
        </Link>
        <Link href="/account" className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-mist" title={t("header.myAccount")}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">{ini}</span>
          <span className="hidden text-start sm:block">
            <span className="block text-sm font-semibold leading-tight text-ink">{actor.fullName}</span>
            <span className="block text-[11px] leading-tight text-slate">{actor.username}</span>
          </span>
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-slate hover:bg-mist hover:text-ink">
            {t("header.signOut")}
          </button>
        </form>
      </div>
    </header>
    </>
  );
}

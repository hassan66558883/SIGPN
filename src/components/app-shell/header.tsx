import Link from "next/link";
import { logoutAction } from "@/server/auth/actions";
import type { Actor } from "@/server/auth/dal";
import { MobileNav, type SidebarSection } from "@/components/app-shell/sidebar";
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
    <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-3 bg-navy px-3 text-white shadow-md sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <MobileNav sections={sections} />
        <Link href="/dashboard" className="flex items-center gap-3" aria-label={t("nav.dashboard")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emblem.png" alt="" className="h-11 w-11 shrink-0 object-contain" />
          <span className="hidden max-w-[10rem] text-[13px] font-extrabold uppercase leading-tight tracking-wide sm:block">{t("app.tagline")}</span>
          <svg aria-hidden className="hidden h-6 w-9 shrink-0 rounded-sm shadow sm:block" viewBox="0 0 30 20">
            <rect width="10" height="20" fill="#002664" />
            <rect x="10" width="10" height="20" fill="#FECB00" />
            <rect x="20" width="10" height="20" fill="#C60C30" />
          </svg>
        </Link>
        <div className="hidden min-w-0 border-s border-white/20 ps-4 xl:block">
          <p className="text-xl font-extrabold leading-tight">{t("app.short")}</p>
          <p className="truncate text-sm text-white/80">{t("app.name")}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-3">
        <LanguageSwitcher current={locale} label={t("common.language")} />
        <Link href="/notifications" className="relative rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white" title={t("notif.title")} aria-label={t("header.notifications", { n: unreadCount })}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {unreadCount > 0 ? <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{unreadCount}</span> : null}
        </Link>
        <Link href="/account" className="flex items-center gap-2.5 rounded-md px-2 py-1 hover:bg-white/10" title={t("header.myAccount")}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue text-sm font-bold text-white ring-2 ring-white/30">{ini}</span>
          <span className="hidden text-start md:block">
            <span className="block text-sm font-bold leading-tight text-white">{actor.fullName}</span>
            <span className="block max-w-[14rem] truncate text-xs leading-tight text-white/75">
              {actor.stationName ?? actor.regionName ?? t("common.national")} · {roleName(actor.roleCode, actor.roleName, locale)}
            </span>
          </span>
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="rounded-md border border-white/25 px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-white/10 hover:text-white">
            {t("header.signOut")}
          </button>
        </form>
      </div>
    </header>
    </>
  );
}

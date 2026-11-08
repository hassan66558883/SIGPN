import { getLocale, getT } from "@/server/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

/** Public shell for QR-code verification pages: no navigation, no session, minimal data. */
export default async function VerifyLayout({ children }: LayoutProps<"/verify">) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return (
    <div className="min-h-screen bg-mist">
      <header className="bg-brand text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/emblem.png" alt="" className="h-10 w-10 shrink-0 object-contain" />
            <div>
              <p className="text-lg font-bold leading-tight">{t("app.short")}</p>
              <p className="max-w-xs text-[10px] font-semibold uppercase leading-snug tracking-wide text-white/80">{t("app.name")}</p>
            </div>
          </div>
          <LanguageSwitcher current={locale} dark label={t("common.language")} />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-2xl px-4 pb-8 text-center text-[11px] text-slate">{t("traffic.verify.footer")}</footer>
    </div>
  );
}

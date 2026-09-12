import { getLocale, getT } from "@/server/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <section className="bg-brand flex flex-col justify-between p-8 text-white lg:w-1/2 lg:p-14">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="h-12 w-12" />
            <div>
              <p className="text-lg font-bold leading-tight">{t("app.name")}</p>
              <p className="text-xs uppercase tracking-widest text-gold">{t("auth.platform")}</p>
            </div>
          </div>
          <LanguageSwitcher current={locale} dark label={t("common.language")} />
        </div>
        <div className="my-10 max-w-md lg:my-0">
          <h2 className="text-2xl font-bold leading-snug lg:text-3xl">{t("auth.hero")}</h2>
          <ul className="mt-6 space-y-2 text-sm text-white/80">
            <li>{t("auth.bullet1")}</li>
            <li>{t("auth.bullet2")}</li>
            <li>{t("auth.bullet3")}</li>
          </ul>
        </div>
        <p className="text-[11px] text-white/50">{t("auth.notice")}</p>
      </section>
      <section className="flex flex-1 items-center justify-center bg-mist p-6 sm:p-10">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">{children}</div>
      </section>
    </div>
  );
}

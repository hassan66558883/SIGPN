import { getLocale, getT } from "@/server/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

/**
 * Shared frame of the sign-in pages (login, second factor, password reset). Restricted to authorised internal police personnel.
 * Left: institutional photograph supplied by the client (hidden on small screens). Right: the official emblem above the form card.
 */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <section aria-hidden className="login-hero" />
      <section className="bg-brand flex flex-1 flex-col p-6 sm:p-10">
        <div className="flex justify-end">
          <LanguageSwitcher current={locale} dark label={t("common.language")} />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-6">
          <div className="relative w-full max-w-md" style={{ marginTop: 70 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/emblem.png"
              alt="Direction Générale de la Police Nationale du Tchad"
              width={124}
              height={124}
              style={{ position: "absolute", top: -70, left: "50%", marginLeft: -62, zIndex: 1 }}
            />
            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8" style={{ paddingTop: 72 }}>
              <div className="mb-6 text-center">
                <p className="text-4xl font-extrabold leading-tight text-navy">
                  SIGPN-<span className="text-gold">T</span>
                </p>
                <p className="mt-1 text-base font-semibold text-navy">{t("auth.erp")}</p>
                <div className="mx-auto mt-3 flex overflow-hidden rounded" style={{ height: 4, width: 160 }} aria-hidden>
                  <span style={{ flex: 1, background: "#002664" }} />
                  <span style={{ flex: 1, background: "#FECB00" }} />
                  <span style={{ flex: 1, background: "#C60C30" }} />
                </div>
                <p className="mt-3 text-sm text-slate">{t("auth.tagline")}</p>
              </div>
              {children}
              <p className="mt-6 border-t border-line pt-4 text-center text-xs text-slate">{t("auth.restricted")}</p>
            </div>
          </div>
          <p className="mt-6 max-w-md text-center text-[11px] text-slate">{t("auth.notice")}</p>
        </div>
      </section>
    </div>
  );
}

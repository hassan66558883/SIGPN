import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLocale } from "@/server/i18n";
import { getMessages, isRtl } from "@/lib/i18n";
import { I18nProvider } from "@/components/i18n-provider";

export const metadata: Metadata = {
  title: { default: "SIGPN-T", template: "%s · SIGPN-T" },
  description: "SIGPN-T — Système Intégré de Gestion Numérique de la Police Nationale du Tchad : plaintes, affaires, enquêtes, pièces à conviction, arrestations, mandats, opérations, personnel, parc et infractions routières.",
  robots: { index: false, follow: false },
  icons: { icon: "/emblem.png" },
};

export const viewport: Viewport = { themeColor: "#0f2a4a", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"} className="h-full">
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale} messages={getMessages(locale)}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

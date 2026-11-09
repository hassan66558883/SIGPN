import { can, canAny, requireActor } from "@/server/auth/dal";
import { unreadCount } from "@/server/admin/queries";
import { NAVIGATION } from "@/lib/navigation";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Header } from "@/components/app-shell/header";
import { getT } from "@/server/i18n";
import { env } from "@/server/env";
import { AlertWatcher } from "@/components/app-shell/alert-watcher";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const actor = await requireActor({ allowPending: true });
  const [unread, t] = await Promise.all([unreadCount(actor), getT()]);
  const sections = NAVIGATION.map((s) => ({
    title: s.titleKey ? t(s.titleKey) : null,
    items: s.items.filter((i) => !i.planned && (can(actor, i.permission) || (i.anyOf && canAny(actor, i.anyOf)))).map(({ href, labelKey, icon }) => ({ href, label: t(labelKey), icon })),
  })).filter((s) => s.items.length > 0);
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      {!env.mfa.enforced ? (
        <div role="alert" className="no-print bg-danger px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-white">
          {t("app.mfaOff")}
        </div>
      ) : null}
      <Header actor={actor} unreadCount={unread} sections={sections} />
      <div className="flex min-h-0 flex-1">
        <Sidebar sections={sections} />
        <div className="theme-light flex min-w-0 flex-1 flex-col">
          {can(actor, "alerts:view") ? <AlertWatcher /> : null}
          <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
          <footer className="no-print border-t border-line px-4 py-3 text-xs text-slate lg:px-8">{t("app.footer")}</footer>
        </div>
      </div>
    </div>
  );
}

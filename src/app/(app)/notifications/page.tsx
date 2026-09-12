import type { Metadata } from "next";
import Link from "next/link";
import { requireActor } from "@/server/auth/dal";
import { listNotifications } from "@/server/admin/queries";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { markAllReadAction, markReadAction } from "@/server/notifications-actions";
import { fmtDateTime } from "@/lib/format";
import { NOTIFICATION_KIND, labelOf } from "@/lib/labels";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("notif.title") };
}

export default async function NotificationsPage() {
  const actor = await requireActor();
  const [items, t, locale] = await Promise.all([listNotifications(actor, { take: 100 }), getT(), getLocale()]);
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={t("notif.eyebrow")}
        title={t("notif.title")}
        subtitle={t("notif.unread", { n: unread })}
        actions={
          unread ? (
            <ActionButton action={markAllReadAction} variant="secondary" size="sm">
              {t("notif.markAll")}
            </ActionButton>
          ) : null
        }
      />
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("notif.none")}</EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((n) => {
              const k = labelOf(NOTIFICATION_KIND, n.kind, locale);
              return (
                <li key={n.id} className={`flex flex-wrap items-start justify-between gap-3 px-4 py-3 ${n.readAt ? "" : "bg-info-soft/30"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={k.tone}>{k.label}</Badge>
                      <p className="font-semibold text-ink">{n.title}</p>
                    </div>
                    <p className="mt-0.5 text-sm text-slate">{n.body}</p>
                    <p className="mt-0.5 text-xs text-slate">
                      {fmtDateTime(n.createdAt, locale)}
                      {n.href ? (
                        <>
                          {" · "}
                          <Link href={n.href} className="font-semibold text-blue hover:underline">
                            {t("common.open")}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  {!n.readAt ? (
                    <ActionButton action={markReadAction} fields={{ id: n.id }} variant="ghost" size="xs">
                      {t("notif.markRead")}
                    </ActionButton>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

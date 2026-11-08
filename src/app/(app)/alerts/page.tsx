import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { listInbox } from "@/server/alerts/service";
import { prisma } from "@/server/db";
import { Alert, Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { getRequestContext } from "@/server/request-context";
import { DANGER_LEVEL, labelOf } from "@/lib/labels";
import type { Tone } from "@/lib/labels";
import type { MessageKey } from "@/lib/i18n";
import { ReceiptButtons } from "./alerts-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("alerts.title") };
}

const KIND_TONE: Record<string, Tone> = { PUBLISHED: "danger", UPDATED: "warning", SUSPENDED: "warning", REACTIVATED: "danger", WITHDRAWN: "success", EXPIRED: "neutral", CLOSED: "success" };
const STATUS_TONE: Record<string, Tone> = { PENDING: "danger", DELIVERED: "warning", READ: "info", ACKNOWLEDGED: "success", FAILED: "danger" };

export default async function AlertsPage() {
  const actor = await requirePermission("alerts:view");
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const inbox = await listInbox(actor, { limit: 100 }, await getRequestContext());
  const unit = actor.stationId ? await prisma.station.findUnique({ where: { id: actor.stationId }, select: { code: true, name: true } }) : null;
  const canAck = actor.permissions.has("alerts:ack");
  return (
    <div>
      <PageHeader eyebrow={t("alerts.eyebrow")} title={t("alerts.title")} subtitle={`${t("alerts.subtitle")}${unit ? ` · ${unit.code} ${unit.name}` : ""}`} actions={actor.permissions.has("alerts:supervise") ? <Link href="/alerts/supervision" className="text-sm font-semibold text-gold hover:underline">{t("nav.alerts.supervision")} →</Link> : undefined} />
      {inbox.offline ? <Alert tone="warning" className="mb-4">{t("alerts.offlineNotice")}</Alert> : null}
      {inbox.items.length === 0 ? (
        <EmptyState>{t("alerts.empty")}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {inbox.items.map((d) => {
            const a = d.alert;
            const p = a.payload as { person?: { name?: string }; offense?: string; unit?: string; instruction?: string };
            const dl = labelOf(DANGER_LEVEL, a.priority, locale);
            return (
              <li key={d.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={KIND_TONE[a.kind] ?? "neutral"}>{t(`alerts.kind.${a.kind}` as MessageKey)}</Badge>
                        <Badge tone={dl.tone}>{dl.label}</Badge>
                        {a.isSimulation ? <Badge tone="violet">{t("alerts.simulation")}</Badge> : null}
                        <Badge tone={STATUS_TONE[d.status] ?? "neutral"}>{t(`alerts.status.${d.status}` as MessageKey)}</Badge>
                      </div>
                      <Link href={`/alerts/${a.id}`} className="mt-2 block text-base font-bold text-ink hover:underline">
                        {p.person?.name ?? a.title}
                      </Link>
                      <p className="text-sm text-slate">{p.offense ?? ""}</p>
                      <p className="mt-1 text-xs text-slate">
                        {a.number} · {p.unit ?? ""} · {fmtDateTime(a.createdAt, locale)}
                      </p>
                      {p.instruction ? <p className="mt-2 text-xs font-semibold text-gold">{p.instruction}</p> : null}
                    </div>
                    <ReceiptButtons id={a.id} status={d.status} canAck={canAck} />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { supervisionAlertDetail } from "@/server/alerts/service";
import { NotFoundError } from "@/server/errors";
import { Badge, Card, PageHeader, Table } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import type { Tone } from "@/lib/labels";
import type { MessageKey } from "@/lib/i18n";
import { RemindButton } from "../../alerts-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("sup.detail") };
}

const STATUS_TONE: Record<string, Tone> = { PENDING: "danger", DELIVERED: "warning", READ: "info", ACKNOWLEDGED: "success", FAILED: "danger" };

export default async function SupervisionDetailPage({ params }: PageProps<"/alerts/supervision/[id]">) {
  const actor = await requirePermission("alerts:supervise");
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  let r;
  try {
    r = await supervisionAlertDetail(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const { alert, deliveries } = r;
  const unfinished = deliveries.some((d) => d.status !== "ACKNOWLEDGED" && d.status !== "FAILED");
  return (
    <div className="space-y-4">
      <PageHeader eyebrow={t("alerts.eyebrow")} title={alert.number} subtitle={`${t(`alerts.kind.${alert.kind}` as MessageKey)} · ${fmtDateTime(alert.createdAt, locale)}`} breadcrumbs={[{ href: "/alerts/supervision", label: t("sup.title") }, { label: alert.number }]} actions={unfinished ? <RemindButton id={alert.id} /> : undefined} />
      <Card title={t("sup.detail")} padded={false}>
        <Table className="responsive-table">
          <thead>
            <tr>
              <th>{t("sup.unit")}</th>
              <th>{t("sup.status")}</th>
              <th>{t("sup.col.received")}</th>
              <th>{t("sup.col.read")}</th>
              <th>{t("sup.col.acked")}</th>
              <th>{t("sup.attempts")}</th>
              <th>{t("sup.escalation")}</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id}>
                <td data-label={t("sup.unit")}>
                  <span className="font-semibold text-ink">{d.station.code}</span> <span className="text-slate">{d.station.name}</span>
                  <div className="text-xs text-slate">{d.station.region.name} · {d.online ? "● " + t("sup.online") : "○ " + t("sup.offline")}</div>
                </td>
                <td data-label={t("sup.status")}><Badge tone={STATUS_TONE[d.status] ?? "neutral"}>{t(`alerts.status.${d.status}` as MessageKey)}</Badge></td>
                <td data-label={t("sup.col.received")} className="text-xs">{d.deliveredAt ? fmtDateTime(d.deliveredAt, locale) : "—"}</td>
                <td data-label={t("sup.col.read")} className="text-xs">{d.readAt ? fmtDateTime(d.readAt, locale) : "—"}</td>
                <td data-label={t("sup.col.acked")} className="text-xs">{d.ackAt ? fmtDateTime(d.ackAt, locale) : "—"}</td>
                <td data-label={t("sup.attempts")} className="tabular-nums">{d.attempts}</td>
                <td data-label={t("sup.escalation")} className="tabular-nums">{d.escalationLevel || "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

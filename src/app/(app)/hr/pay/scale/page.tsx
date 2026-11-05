import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { payScale } from "@/server/hr/pay";
import { Alert, Badge, Card, PageHeader, Table } from "@/components/ui";
import { PAY_APPROVAL, labelOf } from "@/lib/labels";
import { fmtFcfa } from "@/lib/traffic-format";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { DecideForm, ScaleRequestForm } from "../pay-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.pay.scale") };
}

export default async function PayScalePage() {
  const actor = await requirePermission("hr:pay_view");
  const [rows, t, locale] = await Promise.all([payScale(actor), getT(), getLocale()]);
  const canManage = actor.permissions.has("hr:pay_manage");
  const canValidate = actor.permissions.has("hr:pay_validate");
  return (
    <div>
      <PageHeader eyebrow={t("hr.pay.title")} title={t("hr.pay.scale")} subtitle={t("hr.pay.scaleHint")} breadcrumbs={[{ href: "/hr/pay", label: t("hr.pay.title") }, { label: t("hr.pay.scale") }]} />
      <Alert tone="info" className="mb-4">
        {t("hr.pay.fourEyes")}
      </Alert>
      <Card padded={false} className="mb-4">
        <Table>
          <thead>
            <tr>
              <th>{t("hr.col.rank")}</th>
              <th>{t("hr.pay.monthlyBase")}</th>
              <th>{t("hr.pay.effectiveFrom")}</th>
              <th>{t("hr.pay.pendingChanges")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.rank.id}>
                <td data-label={t("hr.col.rank")}>
                  {r.rank.name}
                  <span className="block font-mono text-[11px] text-slate">{r.rank.code}</span>
                </td>
                <td data-label={t("hr.pay.monthlyBase")} className="font-mono">
                  {r.current ? fmtFcfa(r.current.amount) : <Badge tone="danger">{t("hr.pay.noScale")}</Badge>}
                  {r.upcoming.map((u) => (
                    <span key={u.id} className="block text-xs text-slate">
                      {fmtDate(u.effectiveFrom, locale)} → {fmtFcfa(u.amount)}
                    </span>
                  ))}
                </td>
                <td data-label={t("hr.pay.effectiveFrom")} className="text-xs">
                  {r.current ? fmtDate(r.current.effectiveFrom, locale) : "—"}
                </td>
                <td data-label={t("hr.pay.pendingChanges")} className="min-w-[260px] space-y-2">
                  {r.pending.map((p) => (
                    <div key={p.id} className="text-xs">
                      <Badge tone={labelOf(PAY_APPROVAL, p.status, locale).tone}>{labelOf(PAY_APPROVAL, p.status, locale).label}</Badge> {fmtFcfa(p.amount)} · {fmtDate(p.effectiveFrom, locale)} <span className="text-slate">({p.createdBy?.username})</span>
                      {canValidate && p.createdById !== actor.id ? <DecideForm id={p.id} kind="scale" /> : null}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      {canManage ? (
        <Card title={t("hr.pay.requestChange")}>
          <ScaleRequestForm ranks={rows.map((r) => ({ value: r.rank.id, label: r.rank.name }))} />
        </Card>
      ) : null}
    </div>
  );
}

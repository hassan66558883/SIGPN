import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { paySummary } from "@/server/hr/pay";
import { Alert, Badge, ButtonLink, Card, EmptyState, PageHeader, StatCard, Table } from "@/components/ui";
import { PAY_RUN_STATUS, labelOf } from "@/lib/labels";
import { fmtFcfa } from "@/lib/traffic-format";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { GenerateRunForm } from "./pay-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.pay.title") };
}

export default async function PayHubPage() {
  const actor = await requirePermission("hr:pay_view");
  const [s, t, locale] = await Promise.all([paySummary(actor), getT(), getLocale()]);
  const last = s.runs[0];
  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return (
    <div>
      <PageHeader
        eyebrow={t("hr.section")}
        title={t("hr.pay.title")}
        subtitle={t("hr.pay.subtitle")}
        actions={
          <>
            <ButtonLink href="/hr/pay/scale" variant="secondary" size="sm">{t("hr.pay.scale")}</ButtonLink>
            <ButtonLink href="/hr/pay/components" variant="secondary" size="sm">{t("hr.pay.components")}</ButtonLink>
            <ButtonLink href="/hr/pay/elements" variant="secondary" size="sm">{t("hr.pay.elements")}</ButtonLink>
          </>
        }
      />
      <Alert tone="warning" className="mb-4">
        {t("hr.pay.confidential")}
      </Alert>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("hr.pay.lastNet")} value={last ? fmtFcfa(last.totalNet) : "—"} hint={last ? `${last.period} · ${t("hr.pay.officersN", { n: last.officers })}` : t("hr.pay.noRun")} tone="success" />
        <StatCard label={t("hr.pay.lastGross")} value={last ? fmtFcfa(last.totalGross) : "—"} />
        <StatCard label={t("hr.pay.pendingScale")} value={s.pendingScale} tone={s.pendingScale ? "warning" : "neutral"} href="/hr/pay/scale" />
        <StatCard label={t("hr.pay.pendingElements")} value={s.pendingElements} tone={s.pendingElements ? "warning" : "neutral"} href="/hr/pay/elements?status=PENDING" />
      </div>
      {actor.permissions.has("hr:pay_manage") ? (
        <Card title={t("hr.pay.generateTitle")} className="mb-4">
          <p className="mb-3 text-xs text-slate">{t("hr.pay.generateHint")}</p>
          <GenerateRunForm defaultPeriod={period} />
        </Card>
      ) : null}
      <Card title={t("hr.pay.runs")} padded={false}>
        {s.runs.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("hr.pay.noRun")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("hr.pay.period")}</th>
                <th>{t("hr.transfers.col.status")}</th>
                <th>{t("hr.pay.officers")}</th>
                <th>{t("hr.pay.gross")}</th>
                <th>{t("hr.pay.net")}</th>
                <th>{t("hr.pay.excluded")}</th>
              </tr>
            </thead>
            <tbody>
              {s.runs.map((r) => {
                const st = labelOf(PAY_RUN_STATUS, r.status, locale);
                return (
                  <tr key={r.id}>
                    <td data-label={t("hr.pay.period")} className="font-mono">
                      <Link href={`/hr/pay/runs/${r.id}`} className="font-semibold text-blue hover:underline">
                        {r.period}
                      </Link>
                    </td>
                    <td data-label={t("hr.transfers.col.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {r.exportCount ? <span className="ms-1 text-xs text-slate">{t("hr.pay.exportedN", { n: r.exportCount })}</span> : null}
                    </td>
                    <td data-label={t("hr.pay.officers")}>{r.officers}</td>
                    <td data-label={t("hr.pay.gross")}>{fmtFcfa(r.totalGross)}</td>
                    <td data-label={t("hr.pay.net")}>{fmtFcfa(r.totalNet)}</td>
                    <td data-label={t("hr.pay.excluded")} className="text-xs text-slate">
                      {t("hr.pay.excludedDetail", { s: r.excludedNoScale, t: r.excludedStatus })}
                      <span className="block">{fmtDateTime(r.createdAt, locale)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

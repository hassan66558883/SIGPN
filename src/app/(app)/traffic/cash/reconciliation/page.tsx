import type { Metadata } from "next";
import Link from "next/link";
import type { TrafficReconciliationStatus } from "@/generated/prisma/client";
import { listReconciliations } from "@/server/traffic/cash-queries";
import { Badge, Button, Card, EmptyState, PageHeader, Pagination, Select, StatCard, Table } from "@/components/ui";
import { CASH_RECONCILIATION_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { CashTabs, qsBuilder, requireCash, str } from "../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.nav.reconciliation") };
}

export default async function ReconciliationPage({ searchParams }: PageProps<"/traffic/cash/reconciliation">) {
  const actor = await requireCash(["cash:view"]);
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status) as TrafficReconciliationStatus | undefined, page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize, sums } = await listReconciliations(actor, filter);
  return (
    <div>
      <PageHeader eyebrow={t("cash.eyebrow")} title={t("cash.nav.reconciliation")} subtitle={t("cash.rec.subtitle", { n: total })} />
      <CashTabs actor={actor} current="/traffic/cash/reconciliation" t={t} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label={t("cash.kpi.collected")} value={<span className="text-2xl">{fmtFcfa(sums.collected)}</span>} tone="success" />
        <StatCard label={t("cash.kpi.validated")} value={<span className="text-2xl">{fmtFcfa(sums.validated)}</span>} tone="info" />
        <StatCard label={t("cash.kpi.gap")} value={<span className="text-2xl">{fmtFcfa(sums.gap)}</span>} hint={t("cash.rec.gapHint")} tone={sums.gap > 0 ? "warning" : "success"} />
      </div>
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("cash.rec.searchPh")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("cash.allStatuses")} options={optionsOf(CASH_RECONCILIATION_STATUS, locale)} aria-label={t("cash.col.status")} />
          <Button type="submit">{t("common.filter")}</Button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("cash.rec.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("cash.rec.number")}</th>
                <th>{t("cash.col.collection")}</th>
                <th>{t("cash.col.agent")}</th>
                <th>{t("cash.col.closed")}</th>
                <th className="text-end">{t("cash.col.collected")}</th>
                <th className="text-end">{t("cash.col.validated")}</th>
                <th className="text-end">{t("cash.kpi.gap")}</th>
                <th>{t("cash.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const st = labelOf(CASH_RECONCILIATION_STATUS, r.status, locale);
                return (
                  <tr key={r.id}>
                    <td data-label={t("cash.rec.number")} className="font-mono font-semibold">
                      {r.number}
                    </td>
                    <td data-label={t("cash.col.collection")}>
                      <Link href={`/traffic/cash/collections/${r.collection.id}`} className="font-mono text-blue hover:underline">
                        {r.collection.number}
                      </Link>
                    </td>
                    <td data-label={t("cash.col.agent")} className="text-xs">
                      {r.collection.agent.firstName} {r.collection.agent.lastName}
                      <span className="block text-slate">{r.collection.station.name}</span>
                    </td>
                    <td data-label={t("cash.col.closed")} className="text-xs">
                      {fmtDate(r.collection.periodTo, locale)}
                    </td>
                    <td data-label={t("cash.col.collected")} className="text-end tabular-nums">
                      {fmtFcfa(r.collectedFcfa)}
                    </td>
                    <td data-label={t("cash.col.validated")} className="text-end tabular-nums">
                      {fmtFcfa(r.validatedFcfa)}
                    </td>
                    <td data-label={t("cash.kpi.gap")} className={`text-end font-semibold tabular-nums ${r.gapFcfa > 0 ? "text-warning" : "text-success"}`}>
                      {fmtFcfa(r.gapFcfa)}
                    </td>
                    <td data-label={t("cash.col.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <div className="px-4 pb-3">
          <Pagination page={page} pageSize={pageSize} total={total} hrefFor={qsBuilder("/traffic/cash/reconciliation", p)} t={t} />
        </div>
      </Card>
    </div>
  );
}

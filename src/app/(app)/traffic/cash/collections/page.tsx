import type { Metadata } from "next";
import Link from "next/link";
import { listCollections } from "@/server/traffic/cash-queries";
import { Badge, Button, Card, EmptyState, PageHeader, Pagination, Select, StatCard, Table } from "@/components/ui";
import { CASH_COLLECTION_STATUS, CASH_RECONCILIATION_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { CASH_ANY, CashTabs, day, qsBuilder, requireCash, str } from "../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.nav.collections") };
}

export default async function CollectionsPage({ searchParams }: PageProps<"/traffic/cash/collections">) {
  const actor = await requireCash(CASH_ANY);
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status), from: day(str(p.from)), to: day(str(p.to)), page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize, sumCollected, sumDeposited, sumValidated } = await listCollections(actor, filter);
  return (
    <div>
      <PageHeader eyebrow={t("cash.eyebrow")} title={t("cash.nav.collections")} subtitle={t("cash.col.subtitle", { n: total })} />
      <CashTabs actor={actor} current="/traffic/cash/collections" t={t} />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <StatCard label={t("cash.kpi.collected")} value={<span className="text-2xl">{fmtFcfa(sumCollected)}</span>} tone="success" />
        <StatCard label={t("cash.kpi.deposited")} value={<span className="text-2xl">{fmtFcfa(sumDeposited)}</span>} tone="info" />
        <StatCard label={t("cash.kpi.validated")} value={<span className="text-2xl">{fmtFcfa(sumValidated)}</span>} tone="success" />
        <StatCard label={t("cash.kpi.remaining")} value={<span className="text-2xl">{fmtFcfa(Math.max(0, sumCollected - sumDeposited))}</span>} tone="warning" />
      </div>
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("cash.reg.searchPh")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("cash.allStatuses")} options={optionsOf(CASH_COLLECTION_STATUS, locale)} aria-label={t("cash.col.status")} />
          <Button type="submit">{t("common.filter")}</Button>
          <input type="date" name="from" defaultValue={str(p.from) ?? ""} className="input" aria-label={t("traffic.filter.from")} />
          <input type="date" name="to" defaultValue={str(p.to) ?? ""} className="input" aria-label={t("traffic.filter.to")} />
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("cash.col.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("cash.col.collection")}</th>
                <th>{t("cash.col.agent")}</th>
                <th>{t("cash.col.unit")}</th>
                <th>{t("cash.col.period")}</th>
                <th className="text-end">{t("cash.col.collected")}</th>
                <th className="text-end">{t("cash.col.deposited")}</th>
                <th className="text-end">{t("cash.col.validated")}</th>
                <th>{t("cash.col.reconciliation")}</th>
                <th>{t("cash.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const st = labelOf(CASH_COLLECTION_STATUS, c.status, locale);
                const rc = c.reconciliation ? labelOf(CASH_RECONCILIATION_STATUS, c.reconciliation.status, locale) : null;
                return (
                  <tr key={c.id}>
                    <td data-label={t("cash.col.collection")}>
                      <Link href={`/traffic/cash/collections/${c.id}`} className="font-mono font-semibold text-blue hover:underline">
                        {c.number}
                      </Link>
                      <span className="block font-mono text-xs text-slate">{c.register.number}</span>
                    </td>
                    <td data-label={t("cash.col.agent")} className="text-xs">
                      {c.agent.firstName} {c.agent.lastName}
                      <span className="block font-mono text-slate">{c.register.agentBadge ?? "—"}</span>
                    </td>
                    <td data-label={t("cash.col.unit")} className="text-xs">
                      {c.station.name}
                    </td>
                    <td data-label={t("cash.col.period")} className="text-xs">
                      {fmtDate(c.periodFrom, locale)} → {fmtDate(c.periodTo, locale)}
                    </td>
                    <td data-label={t("cash.col.collected")} className="text-end font-semibold tabular-nums">
                      {fmtFcfa(c.collectedFcfa)}
                    </td>
                    <td data-label={t("cash.col.deposited")} className="text-end tabular-nums">
                      {fmtFcfa(c.depositedFcfa)}
                    </td>
                    <td data-label={t("cash.col.validated")} className="text-end tabular-nums">
                      {fmtFcfa(c.validatedFcfa)}
                    </td>
                    <td data-label={t("cash.col.reconciliation")}>{rc ? <Badge tone={rc.tone}>{rc.label}</Badge> : "—"}</td>
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
          <Pagination page={page} pageSize={pageSize} total={total} hrefFor={qsBuilder("/traffic/cash/collections", p)} t={t} />
        </div>
      </Card>
    </div>
  );
}

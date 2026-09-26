import type { Metadata } from "next";
import Link from "next/link";
import type { TrafficDiscrepancyStatus } from "@/generated/prisma/client";
import { listDiscrepancies } from "@/server/traffic/cash-queries";
import { Badge, Button, Card, EmptyState, PageHeader, Pagination, Select, StatCard, Table } from "@/components/ui";
import { CASH_DISCREPANCY_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { CASH_ANY, CashTabs, qsBuilder, requireCash, str } from "../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.nav.discrepancies") };
}

export default async function DiscrepanciesPage({ searchParams }: PageProps<"/traffic/cash/discrepancies">) {
  const actor = await requireCash(CASH_ANY);
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status) as TrafficDiscrepancyStatus | undefined, page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize, sumAmount } = await listDiscrepancies(actor, filter);
  return (
    <div>
      <PageHeader eyebrow={t("cash.eyebrow")} title={t("cash.nav.discrepancies")} subtitle={t("cash.disc.subtitle", { n: total })} />
      <CashTabs actor={actor} current="/traffic/cash/discrepancies" t={t} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label={t("cash.disc.sum")} value={<span className="text-2xl">{fmtFcfa(sumAmount)}</span>} hint={t("cash.disc.sumHint")} tone={sumAmount > 0 ? "warning" : "success"} />
      </div>
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("cash.rec.searchPh")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("cash.allStatuses")} options={optionsOf(CASH_DISCREPANCY_STATUS, locale)} aria-label={t("cash.col.status")} />
          <Button type="submit">{t("common.filter")}</Button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("cash.disc.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("cash.col.discrepancy")}</th>
                <th>{t("cash.col.date")}</th>
                <th>{t("cash.col.agent")}</th>
                <th>{t("cash.col.register")}</th>
                <th className="text-end">{t("cash.col.amount")}</th>
                <th>{t("cash.disc.reason")}</th>
                <th>{t("cash.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => {
                const st = labelOf(CASH_DISCREPANCY_STATUS, d.status, locale);
                return (
                  <tr key={d.id}>
                    <td data-label={t("cash.col.discrepancy")}>
                      <Link href={`/traffic/cash/discrepancies/${d.id}`} className="font-mono font-semibold text-blue hover:underline">
                        {d.number}
                      </Link>
                    </td>
                    <td data-label={t("cash.col.date")} className="text-xs">
                      {fmtDate(d.createdAt, locale)}
                    </td>
                    <td data-label={t("cash.col.agent")} className="text-xs">
                      {d.agent.firstName} {d.agent.lastName}
                      <span className="block text-slate">{d.register.station.name}</span>
                    </td>
                    <td data-label={t("cash.col.register")} className="font-mono text-xs">
                      {d.register.number}
                    </td>
                    <td data-label={t("cash.col.amount")} className="text-end font-semibold tabular-nums">
                      {fmtFcfa(d.amountFcfa)}
                    </td>
                    <td data-label={t("cash.disc.reason")} className="text-xs">
                      {d.reason ?? "—"}
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
          <Pagination page={page} pageSize={pageSize} total={total} hrefFor={qsBuilder("/traffic/cash/discrepancies", p)} t={t} />
        </div>
      </Card>
    </div>
  );
}

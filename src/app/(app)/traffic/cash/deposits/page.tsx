import type { Metadata } from "next";
import Link from "next/link";
import type { TrafficDepositStatus } from "@/generated/prisma/client";
import { listDeposits } from "@/server/traffic/cash-queries";
import { Badge, Button, Card, EmptyState, PageHeader, Pagination, Select, StatCard, Table } from "@/components/ui";
import { CASH_DEPOSIT_METHOD, CASH_DEPOSIT_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { CASH_ANY, CashTabs, day, qsBuilder, requireCash, str } from "../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.nav.deposits") };
}

export default async function DepositsPage({ searchParams }: PageProps<"/traffic/cash/deposits">) {
  const actor = await requireCash(CASH_ANY);
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status) as TrafficDepositStatus | undefined, method: str(p.method), from: day(str(p.from)), to: day(str(p.to)), page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize, sumDeposited } = await listDeposits(actor, filter);
  return (
    <div>
      <PageHeader eyebrow={t("cash.eyebrow")} title={t("cash.nav.deposits")} subtitle={t("cash.dep.subtitle", { n: total })} />
      <CashTabs actor={actor} current="/traffic/cash/deposits" t={t} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label={t("cash.dep.sumDeposited")} value={<span className="text-2xl">{fmtFcfa(sumDeposited)}</span>} hint={t("cash.dep.sumHint")} tone="info" />
      </div>
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("cash.dep.searchPh")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("cash.allStatuses")} options={optionsOf(CASH_DEPOSIT_STATUS, locale)} aria-label={t("cash.col.status")} />
          <Select name="method" defaultValue={filter.method ?? ""} placeholder={t("cash.dep.allMethods")} options={optionsOf(CASH_DEPOSIT_METHOD, locale)} aria-label={t("cash.dep.method")} />
          <input type="date" name="from" defaultValue={str(p.from) ?? ""} className="input" aria-label={t("traffic.filter.from")} />
          <input type="date" name="to" defaultValue={str(p.to) ?? ""} className="input" aria-label={t("traffic.filter.to")} />
          <Button type="submit" className="sm:col-start-4">
            {t("common.filter")}
          </Button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("cash.dep.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("cash.col.deposit")}</th>
                <th>{t("cash.col.agent")}</th>
                <th>{t("cash.col.unit")}</th>
                <th>{t("cash.col.date")}</th>
                <th>{t("cash.dep.method")}</th>
                <th className="text-end">{t("cash.dep.due")}</th>
                <th className="text-end">{t("cash.col.deposited")}</th>
                <th>{t("cash.col.slip")}</th>
                <th>{t("cash.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => {
                const st = labelOf(CASH_DEPOSIT_STATUS, d.status, locale);
                return (
                  <tr key={d.id} className={d.status === "REJECTED" ? "opacity-70" : ""}>
                    <td data-label={t("cash.col.deposit")}>
                      <Link href={`/traffic/cash/deposits/${d.id}`} className="font-mono font-semibold text-blue hover:underline">
                        {d.number}
                      </Link>
                      {d.attempt > 1 ? <span className="block text-xs text-slate">{t("cash.dep.attemptN", { n: d.attempt })}</span> : null}
                    </td>
                    <td data-label={t("cash.col.agent")} className="text-xs">
                      {d.agent.firstName} {d.agent.lastName}
                      <span className="block font-mono text-slate">{d.agentBadge ?? "—"}</span>
                    </td>
                    <td data-label={t("cash.col.unit")} className="text-xs">
                      {d.station.name}
                    </td>
                    <td data-label={t("cash.col.date")} className="text-xs">
                      {fmtDateTime(d.depositedAt, locale)}
                    </td>
                    <td data-label={t("cash.dep.method")} className="text-xs">
                      {labelOf(CASH_DEPOSIT_METHOD, d.method, locale).label}
                    </td>
                    <td data-label={t("cash.dep.due")} className="text-end tabular-nums">
                      {fmtFcfa(d.amountDueFcfa)}
                    </td>
                    <td data-label={t("cash.col.deposited")} className="text-end font-semibold tabular-nums">
                      {fmtFcfa(d.amountDepositedFcfa)}
                    </td>
                    <td data-label={t("cash.col.slip")} className="font-mono text-xs">
                      {d.slip?.number ?? "—"}
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
          <Pagination page={page} pageSize={pageSize} total={total} hrefFor={qsBuilder("/traffic/cash/deposits", p)} t={t} />
        </div>
      </Card>
    </div>
  );
}

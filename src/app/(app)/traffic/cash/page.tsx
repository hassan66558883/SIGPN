import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth/dal";
import { revenueDashboard, revenueDefaultRange } from "@/server/traffic/cash-queries";
import { Button, Card, EmptyState, PageHeader, StatCard, Table } from "@/components/ui";
import { CHART, ColumnChart, HBarList, StackedShare } from "@/components/charts";
import { fmtDate, fmtMonthKey, fmtNumber } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { TRAFFIC_PAYMENT_METHOD, labelOf } from "@/lib/labels";
import { getLocale, getT } from "@/server/i18n";
import { CashTabs, day, str } from "./cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.dash.title") };
}

const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function CashDashboardPage({ searchParams }: PageProps<"/traffic/cash">) {
  const actor = await requireActor();
  if (!actor.permissions.has("cash:reports")) redirect("/traffic/cash/registers");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const def = revenueDefaultRange();
  const from = day(str(p.from)) ?? def.from;
  const toDay = day(str(p.to));
  const range = { from, to: toDay ? new Date(toDay.getTime() + 86_400_000) : def.to };
  const d = await revenueDashboard(actor, range);
  const k = d.kpi;
  const n = (v: number) => fmtNumber(v, locale);
  const money = (v: number) => fmtFcfa(v);
  const month = (m: string) => fmtMonthKey(m, locale);
  const compact = (v: number) => `⁦${v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace(".0", "")} M` : v >= 1_000 ? `${Math.round(v / 1_000)} k` : String(v)}⁩`;
  const empty = t("traffic.dash.noData");
  const csvHref = `/api/v1/traffic/cash/stats?format=csv&from=${toInput(from)}&to=${toInput(new Date(range.to.getTime() - 86_400_000))}`;
  const METHOD_COLORS = [CHART.blue, CHART.orange, CHART.aqua, "#7c8798", "#4b5563"];
  return (
    <div>
      <PageHeader
        eyebrow={t("cash.eyebrow")}
        title={t("cash.dash.title")}
        subtitle={t("cash.dash.subtitle", { from: fmtDate(from, locale), to: fmtDate(new Date(range.to.getTime() - 86_400_000), locale) })}
        actions={
          <a href={csvHref} className="inline-flex items-center rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-navy hover:bg-mist">
            {t("traffic.dash.exportCsv")}
          </a>
        }
      />
      <CashTabs actor={actor} current="/traffic/cash" t={t} />
      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="cd-from" className="label">
              {t("traffic.filter.from")}
            </label>
            <input id="cd-from" type="date" name="from" defaultValue={toInput(from)} className="input" />
          </div>
          <div>
            <label htmlFor="cd-to" className="label">
              {t("traffic.filter.to")}
            </label>
            <input id="cd-to" type="date" name="to" defaultValue={toInput(new Date(range.to.getTime() - 86_400_000))} className="input" />
          </div>
          <Button type="submit">{t("common.filter")}</Button>
          <Link href="/traffic/cash" className="pb-2 text-sm text-blue hover:underline">
            {t("traffic.filter.reset")}
          </Link>
        </form>
      </Card>

      <p className="mb-2 text-xs text-slate">{t("cash.dash.distinct")}</p>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("cash.dash.collectedTotal")} value={<span className="text-2xl">{money(k.collectedTotal)}</span>} hint={t("cash.dash.paymentsN", { n: n(k.paymentsTotal) })} tone="success" />
        <StatCard label={t("cash.dash.collectedToday")} value={<span className="text-2xl">{money(k.collectedToday)}</span>} hint={t("cash.dash.paymentsN", { n: n(k.paymentsToday) })} tone="success" />
        <StatCard label={t("cash.dash.collectedMonth")} value={<span className="text-2xl">{money(k.collectedMonth)}</span>} hint={t("cash.dash.paymentsN", { n: n(k.paymentsMonth) })} tone="success" />
        <StatCard label={t("cash.dash.remaining")} value={<span className="text-2xl">{money(k.remainingToDeposit)}</span>} hint={t("cash.dash.remainingHint")} tone="warning" />
        <StatCard label={t("cash.dash.deposited")} value={<span className="text-2xl">{money(k.depositedTotal)}</span>} hint={t("cash.dash.depositedHint")} tone="info" />
        <StatCard label={t("cash.dash.validated")} value={<span className="text-2xl">{money(k.validatedTotal)}</span>} hint={t("cash.dash.validatedHint")} tone="info" />
        <StatCard label={t("cash.dash.deposits")} value={<span className="text-2xl">{n(k.depositsCount)}</span>} hint={t("cash.dash.depositsPending", { n: n(k.depositsPending) })} href="/traffic/cash/deposits" tone="neutral" />
        <StatCard label={t("cash.dash.registers")} value={<span className="text-2xl">{n(k.registersOpen)}</span>} hint={t("cash.dash.registersHint", { closed: n(k.registersClosed), blocked: n(k.registersBlocked) })} href="/traffic/cash/registers" tone="neutral" />
        <StatCard label={t("cash.dash.discrepancies")} value={<span className="text-2xl">{n(k.discrepanciesOpen)}</span>} hint={t("cash.dash.discrepanciesHint", { total: n(k.discrepanciesTotal) })} href="/traffic/cash/discrepancies" tone={k.discrepanciesOpen > 0 ? "danger" : "success"} />
        <StatCard label={t("cash.dash.discrepanciesAmount")} value={<span className="text-2xl">{money(k.discrepanciesOpenAmount)}</span>} hint={t("cash.dash.discrepanciesAmountHint", { total: money(k.discrepanciesTotalAmount) })} tone={k.discrepanciesOpenAmount > 0 ? "danger" : "success"} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title={t("cash.chart.daily")}>
          <ColumnChart title={t("cash.chart.daily")} tableLabel={t("traffic.chart.tableView")} format={money} axisFormat={compact} series={[{ name: t("cash.kpi.collected"), color: CHART.blue, points: d.daily.map((x) => ({ label: x.day.slice(5), value: x.value })) }]} />
        </Card>
        <Card title={t("cash.chart.monthly")}>
          <ColumnChart title={t("cash.chart.monthly")} tableLabel={t("traffic.chart.tableView")} format={money} axisFormat={compact} series={[{ name: t("cash.kpi.collected"), color: CHART.blue, points: d.monthly.map((x) => ({ label: month(x.month), value: x.collected })) }]} />
        </Card>
        <Card title={t("cash.chart.vs")}>
          <ColumnChart
            title={t("cash.chart.vs")}
            tableLabel={t("traffic.chart.tableView")}
            format={money}
            axisFormat={compact}
            series={[
              { name: t("cash.kpi.collected"), color: CHART.blue, points: d.monthly.map((x) => ({ label: month(x.month), value: x.collected })) },
              { name: t("cash.kpi.deposited"), color: CHART.orange, points: d.monthly.map((x) => ({ label: month(x.month), value: x.deposited })) },
            ]}
          />
        </Card>
        <Card title={t("cash.chart.method")}>
          <StackedShare segments={d.byMethod.map((m, i) => ({ name: labelOf(TRAFFIC_PAYMENT_METHOD, m.method, locale).label, color: METHOD_COLORS[i % METHOD_COLORS.length], value: m.total }))} format={money} />
        </Card>
        <Card title={t("cash.chart.unit")}>
          <HBarList empty={empty} format={money} rows={d.byUnit.map((u) => ({ label: u.name, value: u.total }))} />
        </Card>
        <Card title={t("cash.dash.byAgent")}>
          <HBarList empty={empty} format={money} rows={d.byAgent.map((a) => ({ label: a.name, hint: `${a.badge ?? "—"} · ${a.n}`, value: a.total }))} />
        </Card>
        <Card title={t("cash.dash.byCommissariat")}>
          <HBarList empty={empty} format={money} rows={d.byCommissariat.map((u) => ({ label: u.name, value: u.total }))} />
        </Card>
        <Card title={t("cash.dash.byProvince")}>
          <HBarList empty={empty} format={money} rows={d.byProvince.map((u) => ({ label: u.name, value: u.total }))} />
        </Card>
      </div>

      <Card title={t("cash.chart.discrepancies")} padded={false}>
        {d.discrepancies.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("cash.disc.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("cash.col.agent")}</th>
                <th className="text-end">{t("cash.dash.count")}</th>
                <th className="text-end">{t("cash.col.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {d.discrepancies.map((x, i) => (
                <tr key={i}>
                  <td data-label={t("cash.col.agent")}>{x.agent}</td>
                  <td data-label={t("cash.dash.count")} className="text-end tabular-nums">
                    {x.n}
                  </td>
                  <td data-label={t("cash.col.amount")} className="text-end font-semibold tabular-nums">
                    {money(x.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

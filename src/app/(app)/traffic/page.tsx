import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { defaultRange, trafficDashboard } from "@/server/traffic/stats";
import { Button, ButtonLink, Card, EmptyState, PageHeader, StatCard, Table } from "@/components/ui";
import { CHART, ColumnChart, HBarList, StackedShare } from "@/components/charts";
import { fmtDate, fmtMonthKey, fmtNumber } from "@/lib/format";
import { fmtClassText, fmtFcfa } from "@/lib/traffic-format";
import { TRAFFIC_CATEGORY, TRAFFIC_FINE_STATUS, labelOf } from "@/lib/labels";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.dash.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);
const parseDay = (v: string | undefined) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function TrafficDashboardPage({ searchParams }: PageProps<"/traffic">) {
  const actor = await requirePermission("traffic:dashboard");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const def = defaultRange();
  const from = parseDay(str(p.from)) ?? def.from;
  const toDay = parseDay(str(p.to));
  const range = { from, to: toDay ? new Date(toDay.getTime() + 86_400_000) : def.to };
  const d = await trafficDashboard(actor, range);
  const k = d.kpi;
  const month = (m: string) => fmtMonthKey(m, locale);
  const n = (v: number) => fmtNumber(v, locale);
  const empty = t("traffic.dash.noData");
  const csvHref = `/api/v1/traffic/stats?format=csv&from=${toInput(from)}&to=${toInput(new Date(range.to.getTime() - 86_400_000))}`;
  const nothing = k.controls === 0 && k.tickets === 0;

  return (
    <div>
      <PageHeader
        eyebrow={t("traffic.eyebrow")}
        title={t("traffic.dash.title")}
        subtitle={t("traffic.dash.subtitle", { from: fmtDate(from, locale), to: fmtDate(new Date(range.to.getTime() - 86_400_000), locale) })}
        actions={
          <>
            {actor.permissions.has("traffic:control_create") ? <ButtonLink href="/traffic/controls/new">{t("traffic.controls.new")}</ButtonLink> : null}
            {actor.permissions.has("traffic:export") ? (
              <a href={csvHref} className="inline-flex items-center rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-navy hover:bg-mist">
                {t("traffic.dash.exportCsv")}
              </a>
            ) : null}
          </>
        }
      />

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="tr-from" className="label">
              {t("traffic.filter.from")}
            </label>
            <input id="tr-from" type="date" name="from" defaultValue={toInput(from)} className="input" />
          </div>
          <div>
            <label htmlFor="tr-to" className="label">
              {t("traffic.filter.to")}
            </label>
            <input id="tr-to" type="date" name="to" defaultValue={toInput(new Date(range.to.getTime() - 86_400_000))} className="input" />
          </div>
          <Button type="submit">{t("common.filter")}</Button>
          <Link href="/traffic" className="pb-2 text-sm text-blue hover:underline">
            {t("traffic.filter.reset")}
          </Link>
        </form>
      </Card>

      {nothing ? (
        <Card>
          <EmptyState>{t("traffic.dash.none")}</EmptyState>
        </Card>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("traffic.kpi.controls")} value={n(k.controls)} tone="info" href="/traffic/controls" />
        <StatCard label={t("traffic.kpi.offences")} value={n(k.offences)} tone="warning" />
        <StatCard label={t("traffic.kpi.tickets")} value={n(k.tickets)} tone="neutral" href="/traffic/tickets" />
        <StatCard label={t("traffic.kpi.unpaid")} value={n(k.unpaidCount)} tone="danger" href="/traffic/fines?status=TO_PAY" hint={t("traffic.kpi.unpaidHint")} />
        <StatCard label={t("traffic.kpi.totalFines")} value={<span className="text-2xl">{fmtFcfa(k.totalFinesFcfa)}</span>} tone="neutral" />
        <StatCard label={t("traffic.kpi.paid")} value={<span className="text-2xl">{fmtFcfa(k.paidFcfa)}</span>} tone="success" />
        <StatCard label={t("traffic.kpi.remaining")} value={<span className="text-2xl">{fmtFcfa(k.remainingFcfa)}</span>} tone="warning" />
        <StatCard label={t("traffic.kpi.recovery")} value={k.recoveryRate === null ? "—" : `${k.recoveryRate} %`} tone="info" hint={t("traffic.kpi.recoveryHint")} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title={t("traffic.chart.offencesPerMonth")}>
          <ColumnChart title={t("traffic.chart.offencesPerMonth")} tableLabel={t("traffic.chart.tableView")} format={n} series={[{ name: t("traffic.kpi.offences"), color: CHART.blue, points: d.monthly.offences.map((x) => ({ label: month(x.month), value: x.value })) }]} />
        </Card>
        <Card title={t("traffic.chart.controlsPerMonth")}>
          <ColumnChart title={t("traffic.chart.controlsPerMonth")} tableLabel={t("traffic.chart.tableView")} format={n} series={[{ name: t("traffic.kpi.controls"), color: CHART.blue, points: d.monthly.controls.map((x) => ({ label: month(x.month), value: x.value })) }]} />
        </Card>
        <Card title={t("traffic.chart.finesAndPayments")} description={t("traffic.chart.finesAndPaymentsHint")}>
          <ColumnChart
            title={t("traffic.chart.finesAndPayments")}
            tableLabel={t("traffic.chart.tableView")}
            format={(v) => (v >= 1_000_000 ? `${Math.round(v / 100_000) / 10} M` : v >= 1000 ? `${Math.round(v / 100) / 10} k` : String(v))}
            series={[
              { name: t("traffic.chart.issued"), color: CHART.blue, points: d.monthly.fines.map((x) => ({ label: month(x.month), value: x.value })) },
              { name: t("traffic.chart.collected"), color: CHART.aqua, points: d.monthly.payments.map((x) => ({ label: month(x.month), value: x.value })) },
            ]}
          />
        </Card>
        <Card title={t("traffic.chart.paidVsUnpaid")} description={t("traffic.chart.paidVsUnpaidHint")}>
          <StackedShare
            format={fmtFcfa}
            segments={[
              { name: t("traffic.chart.collected"), color: CHART.aqua, value: k.paidFcfa },
              { name: t("traffic.chart.outstanding"), color: CHART.orange, value: k.remainingFcfa },
            ]}
          />
          <Table className="mt-4">
            <thead>
              <tr>
                <th>{t("traffic.fine.status")}</th>
                <th className="text-end">{t("traffic.col.count")}</th>
                <th className="text-end">{t("traffic.col.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {d.fineStatus.map((s) => (
                <tr key={s.status}>
                  <td data-label={t("traffic.fine.status")}>{labelOf(TRAFFIC_FINE_STATUS, s.status, locale).label}</td>
                  <td data-label={t("traffic.col.count")} className="text-end tabular-nums">
                    {n(s.count)}
                  </td>
                  <td data-label={t("traffic.col.amount")} className="text-end tabular-nums">
                    {fmtFcfa(s.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title={t("traffic.chart.topOffences")}>
          <HBarList empty={empty} format={n} rows={d.topOffences.map((o) => ({ label: o.name, hint: o.code, value: o.n }))} />
        </Card>
        <Card title={t("traffic.chart.byCategory")}>
          <HBarList empty={empty} format={n} rows={d.byCategory.map((c) => ({ label: labelOf(TRAFFIC_CATEGORY, c.code, locale).label, value: c.n }))} />
          <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-slate">{t("traffic.chart.byClass")}</h3>
          <HBarList empty={empty} format={n} rows={d.byClass.map((c) => ({ label: c.classText === "Délit" ? t("traffic.class.delit") : fmtClassText(c.classText), value: c.n }))} />
        </Card>
        <Card title={t("traffic.chart.byStation")}>
          <HBarList empty={empty} format={n} rows={d.byStation.map((s) => ({ label: s.name, hint: fmtFcfa(s.amount), value: s.pv }))} />
        </Card>
        <Card title={t("traffic.chart.byZone")} description={t("traffic.chart.byZoneHint")}>
          <HBarList empty={empty} format={n} color={CHART.blue} rows={d.byZone.map((z) => ({ label: z.zone, value: z.n }))} />
          <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-slate">{t("traffic.chart.byProvince")}</h3>
          <HBarList empty={empty} format={n} rows={d.byProvince.map((z) => ({ label: z.province, value: z.n }))} />
        </Card>
        <Card title={t("traffic.chart.byOfficer")}>
          <HBarList empty={empty} format={n} rows={d.byOfficer.map((o) => ({ label: `${o.lastName} ${o.firstName}`, value: o.n }))} />
        </Card>
        <Card title={t("traffic.chart.topVehicles")}>
          {d.topVehicles.length === 0 ? (
            <p className="text-sm text-slate">{empty}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t("traffic.veh.plate")}</th>
                  <th className="text-end">{t("traffic.col.tickets")}</th>
                  <th className="text-end">{t("traffic.col.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {d.topVehicles.map((v) => (
                  <tr key={v.plate}>
                    <td data-label={t("traffic.veh.plate")}>
                      <Link href={`/traffic/vehicles?q=${encodeURIComponent(v.plate)}`} className="font-mono font-semibold text-blue hover:underline">
                        {v.plate}
                      </Link>
                    </td>
                    <td data-label={t("traffic.col.tickets")} className="text-end tabular-nums">
                      {n(v.n)}
                    </td>
                    <td data-label={t("traffic.col.amount")} className="text-end tabular-nums">
                      {fmtFcfa(v.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card title={t("traffic.chart.repeatDrivers")} description={t("traffic.chart.repeatDriversHint")} className="lg:col-span-2">
          {d.repeatDrivers.length === 0 ? (
            <p className="text-sm text-slate">{empty}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t("traffic.driver.person")}</th>
                  <th className="text-end">{t("traffic.col.tickets")}</th>
                </tr>
              </thead>
              <tbody>
                {d.repeatDrivers.map((r) => (
                  <tr key={r.id}>
                    <td data-label={t("traffic.driver.person")}>
                      <Link href={`/traffic/search?driver=${encodeURIComponent(r.number)}`} className="font-semibold text-blue hover:underline">
                        {r.lastName} {r.firstName}
                      </Link>
                      <span className="ms-2 font-mono text-xs text-slate">{r.number}</span>
                    </td>
                    <td data-label={t("traffic.col.tickets")} className="text-end tabular-nums">
                      {n(r.n)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

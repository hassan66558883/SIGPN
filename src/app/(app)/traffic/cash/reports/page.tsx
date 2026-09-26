import type { Metadata } from "next";
import { buildReport, parseReportKind, REPORT_TITLES, reportRange } from "@/server/traffic/cash-reports";
import { dayKey } from "@/server/traffic/cash-queries";
import { REPORT_KINDS } from "@/server/traffic/cash-schemas";
import { Button, Card, EmptyState, PageHeader, Select, Table } from "@/components/ui";
import { fmtNumber } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { CashTabs, day, requireCash, str } from "../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.nav.reports") };
}

export default async function ReportsPage({ searchParams }: PageProps<"/traffic/cash/reports">) {
  const actor = await requireCash(["cash:reports"]);
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const kind = parseReportKind(str(p.kind));
  const range = reportRange(kind, day(str(p.from)), day(str(p.to)));
  const report = await buildReport(actor, kind, range);
  const from = dayKey(range.from);
  const to = dayKey(new Date(range.to.getTime() - 1));
  const base = `/api/v1/traffic/cash/reports/${kind}?from=${from}&to=${to}`;
  const cell = (v: string | number | undefined, k: string) => (v === undefined || v === "" ? "—" : k === "money" ? fmtFcfa(Number(v)) : k === "int" ? fmtNumber(Number(v), locale) : String(v));
  return (
    <div>
      <PageHeader
        eyebrow={t("cash.eyebrow")}
        title={t("cash.nav.reports")}
        subtitle={t("cash.rep.subtitle")}
        actions={
          <>
            <a href={`${base}&format=pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
              {t("cash.rep.pdf")}
            </a>
            <a href={`${base}&format=csv`} className="inline-flex items-center rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-navy hover:bg-mist">
              {t("cash.rep.csv")}
            </a>
          </>
        }
      />
      <CashTabs actor={actor} current="/traffic/cash/reports" t={t} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-5">
          <Select name="kind" defaultValue={kind} className="sm:col-span-2" options={REPORT_KINDS.map((k) => ({ value: k, label: REPORT_TITLES[k][locale] }))} aria-label={t("cash.rep.kind")} />
          <input type="date" name="from" defaultValue={from} className="input" aria-label={t("traffic.filter.from")} />
          <input type="date" name="to" defaultValue={to} className="input" aria-label={t("traffic.filter.to")} />
          <Button type="submit">{t("cash.rep.generate")}</Button>
        </form>
      </Card>
      <Card title={REPORT_TITLES[kind][locale]} description={t("cash.rep.period", { from, to })} padded={false}>
        {report.rows.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("cash.rep.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                {report.columns.map((c) => (
                  <th key={c.key} className={c.kind === "money" || c.kind === "int" ? "text-end" : ""}>
                    {locale === "ar" ? c.ar : c.fr}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r, i) => (
                <tr key={i}>
                  {report.columns.map((c) => (
                    <td key={c.key} data-label={locale === "ar" ? c.ar : c.fr} className={`text-xs ${c.kind === "money" || c.kind === "int" ? "text-end tabular-nums" : ""}`}>
                      {cell(r[c.key], c.kind)}
                    </td>
                  ))}
                </tr>
              ))}
              {report.totals ? (
                <tr className="bg-mist font-semibold">
                  {report.columns.map((c) => (
                    <td key={c.key} data-label={locale === "ar" ? c.ar : c.fr} className={`text-xs ${c.kind === "money" || c.kind === "int" ? "text-end tabular-nums" : ""}`}>
                      {report.totals?.[c.key] === undefined ? "" : cell(report.totals[c.key], c.kind)}
                    </td>
                  ))}
                </tr>
              ) : null}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

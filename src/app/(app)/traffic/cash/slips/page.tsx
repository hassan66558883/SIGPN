import type { Metadata } from "next";
import Link from "next/link";
import { listSlips } from "@/server/traffic/cash-queries";
import { Badge, Button, Card, EmptyState, PageHeader, Pagination, Table } from "@/components/ui";
import { CASH_DEPOSIT_METHOD, CASH_DEPOSIT_STATUS, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { CASH_ANY, CashTabs, qsBuilder, requireCash, str } from "../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.nav.slips") };
}

export default async function SlipsPage({ searchParams }: PageProps<"/traffic/cash/slips">) {
  const actor = await requireCash(CASH_ANY);
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const { items, total, page, pageSize } = await listSlips(actor, { q: str(p.q), page: Number(p.page ?? 1) || 1 });
  return (
    <div>
      <PageHeader eyebrow={t("cash.eyebrow")} title={t("cash.nav.slips")} subtitle={t("cash.slip.subtitle", { n: total })} />
      <CashTabs actor={actor} current="/traffic/cash/slips" t={t} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={str(p.q) ?? ""} placeholder={t("cash.slip.searchPh")} className="input sm:col-span-3" aria-label={t("common.search")} />
          <Button type="submit">{t("common.filter")}</Button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("cash.slip.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("cash.col.slip")}</th>
                <th>{t("cash.col.deposit")}</th>
                <th>{t("cash.col.agent")}</th>
                <th>{t("cash.col.unit")}</th>
                <th>{t("cash.col.date")}</th>
                <th>{t("cash.dep.method")}</th>
                <th className="text-end">{t("cash.col.deposited")}</th>
                <th>{t("cash.col.status")}</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => {
                const st = labelOf(CASH_DEPOSIT_STATUS, s.deposit.status, locale);
                return (
                  <tr key={s.id}>
                    <td data-label={t("cash.col.slip")} className="font-mono font-semibold">
                      {s.number}
                    </td>
                    <td data-label={t("cash.col.deposit")}>
                      <Link href={`/traffic/cash/deposits/${s.deposit.id}`} className="font-mono text-blue hover:underline">
                        {s.deposit.number}
                      </Link>
                    </td>
                    <td data-label={t("cash.col.agent")} className="text-xs">
                      {s.deposit.agent.firstName} {s.deposit.agent.lastName}
                    </td>
                    <td data-label={t("cash.col.unit")} className="text-xs">
                      {s.deposit.station.name}
                    </td>
                    <td data-label={t("cash.col.date")} className="text-xs">
                      {fmtDateTime(s.issuedAt, locale)}
                    </td>
                    <td data-label={t("cash.dep.method")} className="text-xs">
                      {labelOf(CASH_DEPOSIT_METHOD, s.deposit.method, locale).label}
                    </td>
                    <td data-label={t("cash.col.deposited")} className="text-end font-semibold tabular-nums">
                      {fmtFcfa(s.deposit.amountDepositedFcfa)}
                    </td>
                    <td data-label={t("cash.col.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td data-label="PDF" className="text-xs">
                      <a className="text-blue hover:underline" href={`/api/v1/traffic/cash/deposits/${s.deposit.id}/pdf`} target="_blank" rel="noreferrer">
                        PDF
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <div className="px-4 pb-3">
          <Pagination page={page} pageSize={pageSize} total={total} hrefFor={qsBuilder("/traffic/cash/slips", p)} t={t} />
        </div>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import type { TrafficCashRegisterStatus, TrafficPaymentMethod } from "@/generated/prisma/client";
import { searchRevenue } from "@/server/traffic/cash-queries";
import { Badge, Button, Card, EmptyState, PageHeader, Select, Table } from "@/components/ui";
import { CASH_DEPOSIT_STATUS, CASH_REGISTER_STATUS, TRAFFIC_PAYMENT_METHOD, labelOf, optionsOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { CASH_ANY, CashTabs, day, requireCash, str } from "../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.nav.search") };
}

export default async function CashSearchPage({ searchParams }: PageProps<"/traffic/cash/search">) {
  const actor = await requireCash(CASH_ANY);
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const amount = Number(str(p.amount));
  const criteria = { q: str(p.q), unit: str(p.unit), method: str(p.method) as TrafficPaymentMethod | undefined, status: str(p.status) as TrafficCashRegisterStatus | undefined, from: day(str(p.from)), to: day(str(p.to)), amount: Number.isFinite(amount) && amount > 0 ? amount : undefined };
  const searched = Object.values(criteria).some((v) => v !== undefined && v !== null);
  const r = searched ? await searchRevenue(actor, criteria) : null;
  return (
    <div>
      <PageHeader eyebrow={t("cash.eyebrow")} title={t("cash.nav.search")} subtitle={t("cash.search.subtitle")} />
      <CashTabs actor={actor} current="/traffic/cash/search" t={t} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={criteria.q ?? ""} placeholder={t("cash.search.qPh")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <input name="unit" defaultValue={criteria.unit ?? ""} placeholder={t("cash.search.unitPh")} className="input" aria-label={t("cash.col.unit")} />
          <input name="amount" type="number" min={1} defaultValue={criteria.amount ?? ""} placeholder={t("cash.search.amountPh")} className="input tabular-nums" aria-label={t("cash.col.amount")} />
          <Select name="method" defaultValue={criteria.method ?? ""} placeholder={t("cash.search.allMethods")} options={optionsOf(TRAFFIC_PAYMENT_METHOD, locale)} aria-label={t("traffic.pay.method")} />
          <Select name="status" defaultValue={criteria.status ?? ""} placeholder={t("cash.allStatuses")} options={optionsOf(CASH_REGISTER_STATUS, locale)} aria-label={t("cash.col.status")} />
          <input type="date" name="from" defaultValue={str(p.from) ?? ""} className="input" aria-label={t("traffic.filter.from")} />
          <input type="date" name="to" defaultValue={str(p.to) ?? ""} className="input" aria-label={t("traffic.filter.to")} />
          <Button type="submit" className="sm:col-start-4">
            {t("common.search")}
          </Button>
        </form>
      </Card>
      {!r ? (
        <Card>
          <EmptyState>{t("cash.search.hint")}</EmptyState>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card title={t("cash.search.payments", { n: r.payments.length })} padded={false}>
            {r.payments.length === 0 ? (
              <div className="p-5">
                <EmptyState>{t("cash.search.none")}</EmptyState>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>{t("traffic.pay.receipt")}</th>
                    <th>{t("traffic.col.pv")}</th>
                    <th>{t("traffic.col.fine")}</th>
                    <th>{t("cash.col.agent")}</th>
                    <th>{t("cash.col.register")}</th>
                    <th>{t("traffic.pay.date")}</th>
                    <th>{t("traffic.pay.method")}</th>
                    <th className="text-end">{t("cash.col.amount")}</th>
                    <th>{t("cash.col.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.payments.map((x) => {
                    const st = labelOf(CASH_REGISTER_STATUS, x.register.status, locale);
                    return (
                      <tr key={x.id} className={x.voidedAt ? "opacity-60" : ""}>
                        <td data-label={t("traffic.pay.receipt")} className="font-mono text-xs">
                          {x.payment.receipt ? (
                            <Link href={`/traffic/receipts/${x.payment.receipt.id}`} className="text-blue hover:underline">
                              {x.payment.receipt.number}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td data-label={t("traffic.col.pv")} className="font-mono text-xs">
                          <Link href={`/traffic/tickets/${x.payment.fine.ticket.id}`} className="text-blue hover:underline">
                            {x.payment.fine.ticket.number}
                          </Link>
                        </td>
                        <td data-label={t("traffic.col.fine")} className="font-mono text-xs">
                          <Link href={`/traffic/fines/${x.payment.fine.id}`} className="text-blue hover:underline">
                            {x.payment.fine.number}
                          </Link>
                        </td>
                        <td data-label={t("cash.col.agent")} className="text-xs">
                          {x.register.agent.firstName} {x.register.agent.lastName}
                          <span className="block font-mono text-slate">{x.register.agentBadge ?? "—"} · {x.register.station.name}</span>
                        </td>
                        <td data-label={t("cash.col.register")} className="font-mono text-xs">
                          <Link href={`/traffic/cash/registers/${x.register.id}`} className="text-blue hover:underline">
                            {x.register.number}
                          </Link>
                        </td>
                        <td data-label={t("traffic.pay.date")} className="text-xs">
                          {fmtDateTime(x.payment.paidAt, locale)}
                        </td>
                        <td data-label={t("traffic.pay.method")} className="text-xs">
                          {labelOf(TRAFFIC_PAYMENT_METHOD, x.method, locale).label}
                          {x.payment.transactionReference ? <span className="block font-mono text-slate">{x.payment.transactionReference}</span> : null}
                        </td>
                        <td data-label={t("cash.col.amount")} className="text-end font-semibold tabular-nums">
                          {fmtFcfa(x.amountFcfa)}
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
          </Card>
          {r.deposits.length > 0 ? (
            <Card title={t("cash.search.deposits", { n: r.deposits.length })} padded={false}>
              <Table>
                <thead>
                  <tr>
                    <th>{t("cash.col.deposit")}</th>
                    <th>{t("cash.col.slip")}</th>
                    <th>{t("cash.col.agent")}</th>
                    <th>{t("cash.col.date")}</th>
                    <th className="text-end">{t("cash.col.deposited")}</th>
                    <th>{t("cash.col.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.deposits.map((d) => (
                    <tr key={d.id}>
                      <td data-label={t("cash.col.deposit")}>
                        <Link href={`/traffic/cash/deposits/${d.id}`} className="font-mono font-semibold text-blue hover:underline">
                          {d.number}
                        </Link>
                      </td>
                      <td data-label={t("cash.col.slip")} className="font-mono text-xs">
                        {d.slip?.number ?? "—"}
                      </td>
                      <td data-label={t("cash.col.agent")} className="text-xs">
                        {d.agent.firstName} {d.agent.lastName}
                      </td>
                      <td data-label={t("cash.col.date")} className="text-xs">
                        {fmtDateTime(d.depositedAt, locale)}
                      </td>
                      <td data-label={t("cash.col.deposited")} className="text-end tabular-nums">
                        {fmtFcfa(d.amountDepositedFcfa)}
                      </td>
                      <td data-label={t("cash.col.status")}>
                        <Badge tone={labelOf(CASH_DEPOSIT_STATUS, d.status, locale).tone}>{labelOf(CASH_DEPOSIT_STATUS, d.status, locale).label}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

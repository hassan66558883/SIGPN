import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClosure } from "@/server/traffic/cash-queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Card, DL, PageHeader, StatCard, Table } from "@/components/ui";
import { TRAFFIC_PAYMENT_METHOD, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { EntityHistory } from "../../../entity-history";
import { CASH_ANY, CashTabs, requireCash } from "../../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.clo.detail") };
}

export default async function ClosureDetailPage({ params, searchParams }: PageProps<"/traffic/cash/closures/[id]">) {
  const actor = await requireCash(CASH_ANY);
  const [{ id }, p, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let c;
  try {
    c = await getClosure(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const r = c.register;
  const lines = r.transactions.filter((x) => !x.voidedAt && x.payment.status === "COMPLETED");
  const pdf = `/api/v1/traffic/cash/closures/${c.id}/pdf`;
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("cash.eyebrow")}
        title={t("cash.clo.statement")}
        subtitle={`${c.number} · ${r.number}`}
        breadcrumbs={[{ href: "/traffic/cash/closures", label: t("cash.nav.closures") }, { label: c.number }]}
        actions={
          <>
            <a href={pdf} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
              {t("cash.pdf.view")}
            </a>
            <a href={`${pdf}?download=1`} className="inline-flex items-center rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-navy hover:bg-mist">
              {t("cash.pdf.download")}
            </a>
          </>
        }
      />
      <CashTabs actor={actor} current="/traffic/cash/closures" t={t} />
      {typeof p.closed === "string" ? <Alert tone="success">{t("cash.clo.closedOk")}</Alert> : null}
      <Alert tone="info">{t("cash.clo.frozenNotice")}</Alert>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("cash.col.payments")} value={<span className="text-2xl">{c.paymentsCount}</span>} tone="neutral" />
        <StatCard label={t("cash.clo.finesTotal")} value={<span className="text-2xl">{fmtFcfa(c.finesTotalFcfa)}</span>} tone="neutral" />
        <StatCard label={t("cash.kpi.collected")} value={<span className="text-2xl">{fmtFcfa(c.collectedFcfa)}</span>} tone="success" />
        <StatCard label={t("cash.clo.toDeposit")} value={<span className="text-2xl">{fmtFcfa(c.amountToDepositFcfa)}</span>} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t("cash.clo.header")} className="lg:col-span-2">
          <DL
            cols={2}
            items={[
              { label: t("cash.col.agent"), value: `${r.agent.firstName} ${r.agent.lastName}` },
              { label: t("cash.col.badge"), value: <span className="font-mono">{r.agentBadge ?? "—"}</span> },
              { label: t("cash.col.unit"), value: r.station.name },
              { label: t("cash.col.province"), value: r.region.name },
              { label: t("cash.reg.openedLabel"), value: fmtDateTime(r.openedAt, locale) },
              { label: t("cash.reg.closedLabel"), value: `${fmtDateTime(c.closedAt, locale)} — ${c.closedBy.firstName} ${c.closedBy.lastName}` },
              { label: t("cash.col.register"), value: <Link className="font-mono text-blue hover:underline" href={`/traffic/cash/registers/${r.id}`}>{r.number}</Link> },
              { label: t("cash.reg.collection"), value: c.collection ? <Link className="font-mono text-blue hover:underline" href={`/traffic/cash/collections/${c.collection.id}`}>{c.collection.number}</Link> : t("cash.clo.noCollection") },
            ]}
          />
          {c.notes ? <p className="mt-3 border-t border-line pt-3 text-sm text-slate">{c.notes}</p> : null}
        </Card>
        <Card title={t("cash.reg.byMethod")}>
          <dl className="space-y-1 text-sm">
            {[["CASH", c.cashFcfa], ["ELECTRONIC", c.electronicFcfa], ["MOBILE_MONEY", c.mobileMoneyFcfa], ["OTHER", c.otherFcfa]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between">
                <dt className="text-slate">{labelOf(TRAFFIC_PAYMENT_METHOD, k as string, locale).label}</dt>
                <dd className="font-semibold tabular-nums">{fmtFcfa(v as number)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-line pt-1">
              <dt className="font-semibold text-navy">{t("cash.clo.totalGeneral")}</dt>
              <dd className="font-bold tabular-nums text-navy">{fmtFcfa(c.collectedFcfa)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card title={t("cash.clo.lines")} padded={false}>
        <Table>
          <thead>
            <tr>
              <th>{t("traffic.pay.receipt")}</th>
              <th>{t("traffic.col.pv")}</th>
              <th>{t("traffic.pay.number")}</th>
              <th>{t("traffic.pay.method")}</th>
              <th className="text-end">{t("traffic.col.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((x) => (
              <tr key={x.payment.number}>
                <td data-label={t("traffic.pay.receipt")} className="font-mono text-xs">
                  {x.payment.receipt?.number ?? "—"}
                </td>
                <td data-label={t("traffic.col.pv")} className="font-mono text-xs">
                  {x.payment.fine.ticket.number}
                </td>
                <td data-label={t("traffic.pay.number")} className="font-mono text-xs">
                  {x.payment.number}
                </td>
                <td data-label={t("traffic.pay.method")} className="text-xs">
                  {labelOf(TRAFFIC_PAYMENT_METHOD, x.method, locale).label}
                  {x.payment.transactionReference ? <span className="block font-mono text-slate">{x.payment.transactionReference}</span> : null}
                </td>
                <td data-label={t("traffic.col.amount")} className="text-end font-semibold tabular-nums">
                  {fmtFcfa(x.amountFcfa)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <EntityHistory entities={[{ type: "TrafficCashRegister", id: r.id }]} locale={locale} t={t} />
    </div>
  );
}

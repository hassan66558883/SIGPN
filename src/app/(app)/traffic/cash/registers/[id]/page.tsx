import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegister } from "@/server/traffic/cash-queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, ButtonLink, Card, DL, EmptyState, PageHeader, StatCard, Table } from "@/components/ui";
import { CASH_COLLECTION_STATUS, CASH_DEPOSIT_STATUS, CASH_REGISTER_STATUS, TRAFFIC_PAYMENT_METHOD, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { EntityHistory } from "../../../entity-history";
import { BlockRegisterForm, CloseRegisterForm } from "../../cash-forms";
import { CASH_ANY, CashTabs, requireCash } from "../../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.reg.detail") };
}

export default async function RegisterDetailPage({ params, searchParams }: PageProps<"/traffic/cash/registers/[id]">) {
  const actor = await requireCash(CASH_ANY);
  const [{ id }, p, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let r;
  try {
    r = await getRegister(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const st = labelOf(CASH_REGISTER_STATUS, r.status, locale);
  const isOwner = r.agentId === actor.id;
  const canClose = isOwner && r.status === "OPEN" && actor.permissions.has("cash:register");
  const canBlock = actor.permissions.has("cash:block") && (r.status === "OPEN" || r.status === "BLOCKED");
  const balance = r.openingBalanceFcfa + r.totals.collected - r.depositedFcfa;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow={t("cash.eyebrow")} title={r.number} subtitle={`${r.agent.firstName} ${r.agent.lastName} · ${r.station.name}`} breadcrumbs={[{ href: "/traffic/cash/registers", label: t("cash.nav.registers") }, { label: r.number }]} />
      <CashTabs actor={actor} current="/traffic/cash/registers" t={t} />
      {str1(p.opened) ? <Alert tone="success">{t("cash.reg.openedOk")}</Alert> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={st.tone}>{st.label}</Badge>
        {r.status === "OPEN" ? <span className="text-xs text-slate">{t("cash.reg.openRule")}</span> : <span className="text-xs text-slate">{t("cash.reg.closedRule")}</span>}
      </div>
      {r.status === "BLOCKED" ? <Alert tone="danger">{t("cash.reg.blockedInfo", { reason: r.blockReason ?? "—", by: r.blockedBy ? `${r.blockedBy.firstName} ${r.blockedBy.lastName}` : "—" })}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("cash.kpi.collected")} value={<span className="text-2xl">{fmtFcfa(r.totals.collected)}</span>} hint={t("cash.reg.paymentsCount", { n: r.totals.count })} tone="success" />
        <StatCard label={t("cash.reg.openingBalance")} value={<span className="text-2xl">{fmtFcfa(r.openingBalanceFcfa)}</span>} tone="neutral" />
        <StatCard label={t("cash.kpi.deposited")} value={<span className="text-2xl">{fmtFcfa(r.depositedFcfa)}</span>} tone="info" />
        <StatCard label={t("cash.reg.balance")} value={<span className="text-2xl">{fmtFcfa(balance)}</span>} hint={t("cash.reg.balanceHint")} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t("cash.reg.details")} className="lg:col-span-2">
          <DL
            cols={2}
            items={[
              { label: t("cash.col.agent"), value: `${r.agent.firstName} ${r.agent.lastName}` },
              { label: t("cash.col.badge"), value: <span className="font-mono">{r.agentBadge ?? "—"}</span> },
              { label: t("cash.col.unit"), value: r.station.name },
              { label: t("cash.col.province"), value: r.region.name },
              { label: t("cash.reg.openedLabel"), value: fmtDateTime(r.openedAt, locale) },
              { label: t("cash.reg.closedLabel"), value: r.closedAt ? `${fmtDateTime(r.closedAt, locale)}${r.closedBy ? ` — ${r.closedBy.firstName} ${r.closedBy.lastName}` : ""}` : "—" },
              { label: t("cash.reg.closure"), value: r.closure ? <Link className="font-mono text-blue hover:underline" href={`/traffic/cash/closures/${r.closure.id}`}>{r.closure.number}</Link> : "—" },
              { label: t("cash.reg.collection"), value: r.collection ? <Link className="font-mono text-blue hover:underline" href={`/traffic/cash/collections/${r.collection.id}`}>{r.collection.number}</Link> : "—" },
            ]}
          />
          {r.notes ? <p className="mt-3 border-t border-line pt-3 text-sm text-slate">{r.notes}</p> : null}
        </Card>
        <Card title={t("cash.reg.byMethod")}>
          <dl className="space-y-1 text-sm">
            {[["CASH", r.totals.cash], ["ELECTRONIC", r.totals.electronic], ["MOBILE_MONEY", r.totals.mobileMoney], ["OTHER", r.totals.other]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between">
                <dt className="text-slate">{labelOf(TRAFFIC_PAYMENT_METHOD, k as string, locale).label}</dt>
                <dd className="font-semibold tabular-nums">{fmtFcfa(v as number)}</dd>
              </div>
            ))}
          </dl>
          {r.collection ? (
            <p className="mt-3 border-t border-line pt-3 text-xs text-slate">
              {t("cash.reg.collectionStatus")} : <Badge tone={labelOf(CASH_COLLECTION_STATUS, r.collection.status, locale).tone}>{labelOf(CASH_COLLECTION_STATUS, r.collection.status, locale).label}</Badge>
            </p>
          ) : null}
        </Card>
      </div>

      {r.status === "OPEN" && isOwner ? (
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/traffic/fines?status=TO_PAY">{t("cash.reg.collectCta")}</ButtonLink>
        </div>
      ) : null}

      <Card title={t("cash.reg.transactions")} padded={false}>
        {r.transactions.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("cash.reg.noTransactions")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("traffic.pay.number")}</th>
                <th>{t("traffic.pay.date")}</th>
                <th>{t("traffic.col.pv")}</th>
                <th>{t("traffic.col.fine")}</th>
                <th>{t("traffic.pay.receipt")}</th>
                <th>{t("traffic.pay.method")}</th>
                <th className="text-end">{t("traffic.col.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {r.transactions.map((x) => (
                <tr key={x.id} className={x.voidedAt ? "opacity-60" : ""}>
                  <td data-label={t("traffic.pay.number")} className="font-mono text-xs">
                    {x.payment.number}
                    {x.voidedAt ? <Badge tone="neutral" className="ms-1">{t("cash.reg.voided")}</Badge> : null}
                  </td>
                  <td data-label={t("traffic.pay.date")} className="text-xs">
                    {fmtDateTime(x.payment.paidAt, locale)}
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
                    <span className="block font-sans text-slate">{x.payment.fine.plateNumber ?? ""}</span>
                  </td>
                  <td data-label={t("traffic.pay.receipt")} className="font-mono text-xs">
                    {x.payment.receipt ? (
                      <Link href={`/traffic/receipts/${x.payment.receipt.id}`} className="text-blue hover:underline">
                        {x.payment.receipt.number}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td data-label={t("traffic.pay.method")} className="text-xs">
                    {labelOf(TRAFFIC_PAYMENT_METHOD, x.method, locale).label}
                    {x.payment.transactionReference ? <span className="block font-mono text-slate">{x.payment.transactionReference}</span> : null}
                  </td>
                  <td data-label={t("traffic.col.amount")} className={`text-end font-semibold tabular-nums ${x.voidedAt ? "line-through" : ""}`}>
                    {fmtFcfa(x.amountFcfa)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {r.deposits.length > 0 ? (
        <Card title={t("cash.nav.deposits")} padded={false}>
          <Table>
            <thead>
              <tr>
                <th>{t("cash.col.deposit")}</th>
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

      {canClose ? (
        <Card title={t("cash.reg.closeTitle")} description={t("cash.reg.closeHint")}>
          <div className="max-w-xl">
            <CloseRegisterForm registerId={r.id} collected={r.totals.collected} count={r.totals.count} />
          </div>
        </Card>
      ) : null}
      {canBlock ? (
        <Card title={r.status === "BLOCKED" ? t("cash.reg.unblock") : t("cash.reg.block")}>
          <div className="max-w-xl">
            <BlockRegisterForm registerId={r.id} blocked={r.status === "BLOCKED"} />
          </div>
        </Card>
      ) : null}

      <EntityHistory entities={[{ type: "TrafficCashRegister", id: r.id }]} locale={locale} t={t} />
    </div>
  );
}

const str1 = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

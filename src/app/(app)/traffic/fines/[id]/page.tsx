import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getFine } from "@/server/traffic/queries";
import { allowedFineTransitions } from "@/server/traffic/enforcement";
import { getPaymentProvider } from "@/server/traffic/payment-provider";
import { getTrafficSettings } from "@/server/traffic/settings";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { TRAFFIC_FINE_STATUS, TRAFFIC_PAYMENT_METHOD, TRAFFIC_PAYMENT_STATUS, labelOf } from "@/lib/labels";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { fmtClassText, fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { EntityHistory } from "../../entity-history";
import { FineStatusForm, PaymentForm, VoidPaymentForm } from "../../traffic-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.fine.detail") };
}

export default async function FineDetailPage({ params }: PageProps<"/traffic/fines/[id]">) {
  const actor = await requirePermission("traffic:view");
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  let f;
  try {
    f = await getFine(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const settings = await getTrafficSettings();
  const provider = getPaymentProvider();
  const st = labelOf(TRAFFIC_FINE_STATUS, f.status, locale);
  const remaining = f.amountFcfa - f.amountPaidFcfa;
  const pct = f.amountFcfa > 0 ? Math.round((f.amountPaidFcfa / f.amountFcfa) * 100) : 0;
  const canPay = actor.permissions.has("traffic:payment_record") && f.ticket.status === "ISSUED" && (f.status === "TO_PAY" || f.status === "PARTIALLY_PAID");
  const canManage = actor.permissions.has("traffic:fine_manage");
  const canVoid = actor.permissions.has("traffic:payment_void");
  const overdue = f.dueDate && f.dueDate < new Date() && (f.status === "TO_PAY" || f.status === "PARTIALLY_PAID");
  return (
    <div className="space-y-4">
      <PageHeader eyebrow={t("traffic.eyebrow")} title={f.number} subtitle={`${t("traffic.col.pv")} ${f.ticket.number}`} breadcrumbs={[{ href: "/traffic/fines", label: t("traffic.fine.listTitle") }, { label: f.number }]} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={st.tone}>{st.label}</Badge>
        {overdue ? <Badge tone="danger">{t("traffic.fine.overdue")}</Badge> : null}
        {f.ticket.status === "CANCELLED" ? <Badge tone="neutral">{t("traffic.fine.pvCancelled")}</Badge> : null}
      </div>
      {f.statusNote ? <Alert tone="info">{f.statusNote}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t("traffic.fine.balance")} className="lg:col-span-1">
          <p className="text-3xl font-extrabold tabular-nums text-navy">{fmtFcfa(f.amountFcfa)}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("traffic.fine.paidCol")}>
            <div className="h-2 rounded-full bg-success" style={{ width: `${pct}%` }} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate">{t("traffic.fine.paidCol")}</dt>
            <dd className="text-end font-semibold tabular-nums text-success">{fmtFcfa(f.amountPaidFcfa)}</dd>
            <dt className="text-slate">{t("traffic.fine.remaining")}</dt>
            <dd className="text-end font-semibold tabular-nums text-warning">{fmtFcfa(remaining)}</dd>
          </dl>
        </Card>
        <Card title={t("traffic.fine.details")} className="lg:col-span-2">
          <DL
            cols={2}
            items={[
              { label: t("traffic.col.pv"), value: <Link href={`/traffic/tickets/${f.ticket.id}`} className="font-mono font-semibold text-blue hover:underline">{f.ticket.number}</Link> },
              { label: t("traffic.col.control"), value: <Link href={`/traffic/controls/${f.ticket.control.id}`} className="font-mono text-blue hover:underline">{f.ticket.control.number}</Link> },
              { label: t("traffic.col.driver"), value: f.driverPerson ? `${f.driverPerson.lastName} ${f.driverPerson.firstName}` : "—" },
              { label: t("traffic.veh.plate"), value: <span className="font-mono font-semibold">{f.plateNumber ?? "—"}</span> },
              { label: t("traffic.col.officer"), value: `${f.officer.firstName} ${f.officer.lastName}` },
              { label: t("traffic.col.station"), value: f.station.name },
              { label: t("traffic.fine.issuedAt"), value: fmtDateTime(f.issuedAt, locale) },
              { label: t("traffic.fine.dueDate"), value: f.dueDate ? fmtDate(f.dueDate, locale) : t("traffic.fine.noDeadline") },
              { label: t("traffic.fine.paidAt"), value: f.paidAt ? fmtDateTime(f.paidAt, locale) : "—" },
            ]}
          />
          <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-slate">
            {f.ticket.offences.map((o) => (
              <li key={o.code}>
                <span className="font-mono">{o.code}</span> · {o.name} ({fmtClassText(o.classText)}) — {o.amountFcfa === null ? o.amountText : fmtFcfa(o.amountFcfa)}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {canPay ? (
        <Card title={t("traffic.pay.title")} description={t("traffic.pay.subtitle")}>
          <PaymentForm fineId={f.id} remaining={remaining} allowPartial={settings.allowPartialPayment} providerName={provider.name} gatewayConnected={provider.gatewayConnected} />
        </Card>
      ) : null}

      <Card title={t("traffic.pay.history")} padded={false}>
        {f.payments.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("traffic.pay.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("traffic.pay.number")}</th>
                <th>{t("traffic.pay.date")}</th>
                <th>{t("traffic.pay.method")}</th>
                <th>{t("traffic.pay.reference")}</th>
                <th className="text-end">{t("traffic.col.amount")}</th>
                <th>{t("traffic.pay.receipt")}</th>
                <th>{t("traffic.pay.receivedBy")}</th>
              </tr>
            </thead>
            <tbody>
              {f.payments.map((p) => {
                const ps = labelOf(TRAFFIC_PAYMENT_STATUS, p.status, locale);
                return (
                  <tr key={p.id} className={p.status === "VOIDED" ? "opacity-70" : ""}>
                    <td data-label={t("traffic.pay.number")} className="font-mono text-xs">
                      {p.number}
                      {p.status === "VOIDED" ? <Badge tone={ps.tone} className="ms-1">{ps.label}</Badge> : null}
                    </td>
                    <td data-label={t("traffic.pay.date")} className="text-xs">
                      {fmtDateTime(p.paidAt, locale)}
                    </td>
                    <td data-label={t("traffic.pay.method")} className="text-xs">
                      {labelOf(TRAFFIC_PAYMENT_METHOD, p.method, locale).label}
                      {p.provider ? <span className="block text-slate">{p.provider}</span> : null}
                    </td>
                    <td data-label={t("traffic.pay.reference")} className="font-mono text-xs">
                      {p.transactionReference ?? "—"}
                    </td>
                    <td data-label={t("traffic.col.amount")} className={`text-end font-semibold tabular-nums ${p.status === "VOIDED" ? "line-through" : ""}`}>
                      {fmtFcfa(p.amountFcfa)}
                    </td>
                    <td data-label={t("traffic.pay.receipt")} className="text-xs">
                      {p.receipt ? (
                        <Link href={`/traffic/receipts/${p.receipt.id}`} className="font-mono font-semibold text-blue hover:underline">
                          {p.receipt.number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label={t("traffic.pay.receivedBy")} className="text-xs">
                      {p.receivedBy.firstName} {p.receivedBy.lastName}
                      {p.station ? <span className="block text-slate">{p.paymentPoint ?? p.station.name}</span> : null}
                      {p.status === "VOIDED" ? (
                        <span className="block text-danger">
                          {t("traffic.pay.voidedBy", { name: p.voidedBy ? `${p.voidedBy.firstName} ${p.voidedBy.lastName}` : "" })} — {p.voidReason}
                        </span>
                      ) : null}
                      {p.status === "COMPLETED" && canVoid ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-danger">{t("traffic.pay.void")}</summary>
                          <div className="mt-2 max-w-xs">
                            <VoidPaymentForm paymentId={p.id} />
                          </div>
                        </details>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {canManage && f.status !== "PAID" && f.status !== "CANCELLED" ? (
        <Card title={t("traffic.fine.manage")} description={t("traffic.fine.manageHint")}>
          <div className="max-w-lg">
            <FineStatusForm fineId={f.id} next={allowedFineTransitions(f.status)} />
          </div>
        </Card>
      ) : null}

      <EntityHistory entities={[{ type: "TrafficFine", id: f.id }, { type: "TrafficTicket", id: f.ticket.id }]} locale={locale} t={t} />
    </div>
  );
}

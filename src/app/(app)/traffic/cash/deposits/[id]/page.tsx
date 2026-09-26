import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeposit } from "@/server/traffic/cash-queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, PageHeader, StatCard, Stepper, Table } from "@/components/ui";
import { CASH_DEPOSIT_METHOD, CASH_DEPOSIT_STATUS, CASH_RECONCILIATION_STATUS, TRAFFIC_PAYMENT_METHOD, labelOf } from "@/lib/labels";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { EntityHistory } from "../../../entity-history";
import { DepositReviewPanel } from "../../cash-forms";
import { CASH_ANY, CashTabs, requireCash } from "../../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.dep.detail") };
}

const STEP_INDEX: Record<string, number> = { SUBMITTED: 0, JUSTIFICATION_REQUESTED: 0, VERIFIED: 1, VALIDATED: 2, REJECTED: 0 };

export default async function DepositDetailPage({ params, searchParams }: PageProps<"/traffic/cash/deposits/[id]">) {
  const actor = await requireCash(CASH_ANY);
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let d;
  try {
    d = await getDeposit(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const st = labelOf(CASH_DEPOSIT_STATUS, d.status, locale);
  const p = actor.permissions;
  const isOwner = d.agentId === actor.id || d.depositedById === actor.id;
  const gap = d.collectedFcfa - d.amountDepositedFcfa;
  const pdf = `/api/v1/traffic/cash/deposits/${d.id}/pdf`;
  const rc = labelOf(CASH_RECONCILIATION_STATUS, d.collection.reconciliation?.status ?? "PENDING", locale);
  const doc = d.attachmentDocument;
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("cash.eyebrow")}
        title={d.number}
        subtitle={`${d.agent.firstName} ${d.agent.lastName} · ${d.station.name}`}
        breadcrumbs={[{ href: "/traffic/cash/deposits", label: t("cash.nav.deposits") }, { label: d.number }]}
        actions={
          d.slip ? (
            <>
              <a href={pdf} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
                {t("cash.slip.viewPdf")}
              </a>
              <a href={`${pdf}?download=1`} className="inline-flex items-center rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-navy hover:bg-mist">
                {t("cash.pdf.download")}
              </a>
            </>
          ) : null
        }
      />
      <CashTabs actor={actor} current="/traffic/cash/deposits" t={t} />
      {typeof sp.created === "string" ? <Alert tone="success">{t("cash.dep.createdOk", { slip: d.slip?.number ?? "" })}</Alert> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={st.tone}>{st.label}</Badge>
        <Badge tone={rc.tone}>{t("cash.col.reconciliation")} : {rc.label}</Badge>
        {d.attempt > 1 ? <Badge tone="warning">{t("cash.dep.attemptN", { n: d.attempt })}</Badge> : null}
      </div>
      {d.status !== "REJECTED" ? <Stepper steps={[{ key: "s", label: t("cash.dep.step.declared") }, { key: "v", label: t("cash.dep.step.verified") }, { key: "ok", label: t("cash.dep.step.validated") }]} current={STEP_INDEX[d.status]} /> : null}
      {d.status === "REJECTED" ? <Alert tone="danger" title={t("cash.dep.rejectedTitle")}>{d.reviewNote}</Alert> : null}
      {d.status === "JUSTIFICATION_REQUESTED" ? <Alert tone="warning" title={t("cash.dep.justificationTitle")}>{d.reviewNote}</Alert> : null}
      {d.previous ? (
        <Alert tone="info">
          {t("cash.dep.previous", { number: d.previous.number })} —{" "}
          <Link href={`/traffic/cash/deposits/${d.previous.id}`} className="underline">
            {d.previous.number}
          </Link>{" "}
          {d.previous.reviewNote ? `« ${d.previous.reviewNote} »` : ""}
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("cash.kpi.collected")} value={<span className="text-2xl">{fmtFcfa(d.collectedFcfa)}</span>} hint={t("cash.dep.collectedHint")} tone="neutral" />
        <StatCard label={t("cash.dep.due")} value={<span className="text-2xl">{fmtFcfa(d.amountDueFcfa)}</span>} hint={t("cash.dep.dueHint")} tone="warning" />
        <StatCard label={t("cash.kpi.deposited")} value={<span className="text-2xl">{fmtFcfa(d.amountDepositedFcfa)}</span>} tone="info" />
        <StatCard label={t("cash.kpi.gap")} value={<span className="text-2xl">{fmtFcfa(gap)}</span>} hint={t("cash.dep.gapHint")} tone={gap > 0 ? "warning" : "success"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t("cash.dep.details")} className="lg:col-span-2">
          <DL
            cols={2}
            items={[
              { label: t("cash.col.agent"), value: `${d.agent.firstName} ${d.agent.lastName}` },
              { label: t("cash.col.badge"), value: <span className="font-mono">{d.agentBadge ?? "—"}</span> },
              { label: t("cash.col.unit"), value: d.station.name },
              { label: t("cash.col.period"), value: `${fmtDate(d.periodFrom, locale)} → ${fmtDate(d.periodTo, locale)}` },
              { label: t("cash.col.register"), value: <Link className="font-mono text-blue hover:underline" href={`/traffic/cash/registers/${d.register.id}`}>{d.register.number}</Link> },
              { label: t("cash.col.collection"), value: <Link className="font-mono text-blue hover:underline" href={`/traffic/cash/collections/${d.collection.id}`}>{d.collection.number}</Link> },
              { label: t("cash.dep.method"), value: labelOf(CASH_DEPOSIT_METHOD, d.method, locale).label },
              { label: t("cash.col.date"), value: fmtDateTime(d.depositedAt, locale) },
              { label: t("cash.dep.slipNumber"), value: <span className="font-mono">{d.slipNumber ?? "—"}</span> },
              { label: t("cash.dep.reference"), value: <span className="font-mono">{d.reference ?? "—"}</span> },
              { label: t("cash.dep.recipient"), value: d.recipient ?? "—" },
              { label: t("cash.dep.depositedBy"), value: `${d.depositedBy.firstName} ${d.depositedBy.lastName}` },
              { label: t("cash.dep.receivedBy"), value: d.receivedBy ? `${d.receivedBy.firstName} ${d.receivedBy.lastName}` : "—" },
              { label: t("cash.dep.validatedBy"), value: d.validatedBy ? `${d.validatedBy.firstName} ${d.validatedBy.lastName} — ${fmtDateTime(d.validatedAt!, locale)}` : "—" },
              { label: t("cash.col.slip"), value: d.slip ? <span className="font-mono font-semibold">{d.slip.number}</span> : "—" },
              { label: t("cash.dep.attachment"), value: doc ? <a className="text-blue hover:underline" href={`/api/v1/documents/${doc.id}/download`}>{doc.versions[0]?.fileName ?? doc.title}</a> : "—" },
            ]}
          />
          {d.observations ? <p className="mt-3 whitespace-pre-line border-t border-line pt-3 text-sm text-slate">{d.observations}</p> : null}
        </Card>
        {(p.has("cash:deposit_review") || p.has("cash:deposit_validate") || (isOwner && d.status === "JUSTIFICATION_REQUESTED")) && d.status !== "VALIDATED" && d.status !== "REJECTED" ? (
          <Card title={t("cash.dep.workflow")}>
            <DepositReviewPanel depositId={d.id} status={d.status} canReview={p.has("cash:deposit_review")} canValidate={p.has("cash:deposit_validate")} isOwner={isOwner} selfBlocked={d.agentId === actor.id || d.depositedById === actor.id} />
          </Card>
        ) : null}
      </div>

      <Card title={t("cash.dep.items")} description={t("cash.dep.itemsHint")} padded={false}>
        <Table>
          <thead>
            <tr>
              <th>{t("traffic.pay.number")}</th>
              <th>{t("traffic.col.pv")}</th>
              <th>{t("traffic.col.fine")}</th>
              <th>{t("traffic.pay.receipt")}</th>
              <th>{t("traffic.pay.method")}</th>
              <th className="text-end">{t("traffic.col.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((i) => (
              <tr key={i.payment.id}>
                <td data-label={t("traffic.pay.number")} className="font-mono text-xs">
                  {i.payment.number}
                </td>
                <td data-label={t("traffic.col.pv")} className="font-mono text-xs">
                  <Link href={`/traffic/tickets/${i.payment.fine.ticket.id}`} className="text-blue hover:underline">
                    {i.payment.fine.ticket.number}
                  </Link>
                </td>
                <td data-label={t("traffic.col.fine")} className="font-mono text-xs">
                  <Link href={`/traffic/fines/${i.payment.fine.id}`} className="text-blue hover:underline">
                    {i.payment.fine.number}
                  </Link>
                </td>
                <td data-label={t("traffic.pay.receipt")} className="font-mono text-xs">
                  {i.payment.receipt ? (
                    <Link href={`/traffic/receipts/${i.payment.receipt.id}`} className="text-blue hover:underline">
                      {i.payment.receipt.number}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td data-label={t("traffic.pay.method")} className="text-xs">
                  {labelOf(TRAFFIC_PAYMENT_METHOD, i.payment.method, locale).label}
                </td>
                <td data-label={t("traffic.col.amount")} className="text-end tabular-nums">
                  {fmtFcfa(i.amountFcfa)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <EntityHistory entities={[{ type: "TrafficDeposit", id: d.id }]} locale={locale} t={t} />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollection } from "@/server/traffic/cash-queries";
import { getTrafficSettings } from "@/server/traffic/settings";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, ButtonLink, Card, DL, EmptyState, PageHeader, StatCard, Table } from "@/components/ui";
import { CASH_COLLECTION_STATUS, CASH_DEPOSIT_METHOD, CASH_DEPOSIT_STATUS, CASH_DISCREPANCY_STATUS, CASH_RECONCILIATION_STATUS, labelOf } from "@/lib/labels";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { EntityHistory } from "../../../entity-history";
import { ReconciliationPanel, VerifyClosureButton } from "../../cash-forms";
import { CASH_ANY, CashTabs, requireCash } from "../../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.col.detail") };
}

export default async function CollectionDetailPage({ params }: PageProps<"/traffic/cash/collections/[id]">) {
  const actor = await requireCash(CASH_ANY);
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  let c;
  try {
    c = await getCollection(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const settings = await getTrafficSettings();
  const st = labelOf(CASH_COLLECTION_STATUS, c.status, locale);
  const active = c.deposits.filter((d) => d.status !== "REJECTED");
  const activeSum = active.reduce((a, d) => a + d.amountDepositedFcfa, 0);
  const remaining = c.collectedFcfa - activeSum;
  const p = actor.permissions;
  const canDeposit = p.has("cash:deposit_create") && (c.agentId === actor.id || p.has("cash:deposit_review")) && c.status !== "VALIDATED" && remaining > 0 && (settings.allowPartialDeposit || active.length === 0);
  const rec = c.reconciliation;
  const rs = rec ? labelOf(CASH_RECONCILIATION_STATUS, rec.status, locale) : null;
  const gap = c.collectedFcfa - c.validatedFcfa;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow={t("cash.eyebrow")} title={c.number} subtitle={`${c.agent.firstName} ${c.agent.lastName} · ${c.station.name}`} breadcrumbs={[{ href: "/traffic/cash/collections", label: t("cash.nav.collections") }, { label: c.number }]} />
      <CashTabs actor={actor} current="/traffic/cash/collections" t={t} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={st.tone}>{st.label}</Badge>
        {rs ? <Badge tone={rs.tone}>{t("cash.col.reconciliation")} : {rs.label}</Badge> : null}
        {c.verifiedAt ? <Badge tone="success">{t("cash.col.verifiedBy", { name: c.verifiedBy ? `${c.verifiedBy.firstName} ${c.verifiedBy.lastName}` : "", date: fmtDate(c.verifiedAt, locale) })}</Badge> : <Badge tone="neutral">{t("cash.col.notVerified")}</Badge>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("cash.kpi.collected")} value={<span className="text-2xl">{fmtFcfa(c.collectedFcfa)}</span>} hint={t("cash.col.frozen")} tone="success" />
        <StatCard label={t("cash.kpi.deposited")} value={<span className="text-2xl">{fmtFcfa(activeSum)}</span>} hint={t("cash.col.depositedHint")} tone="info" />
        <StatCard label={t("cash.kpi.validated")} value={<span className="text-2xl">{fmtFcfa(c.validatedFcfa)}</span>} tone="success" />
        <StatCard label={t("cash.kpi.gap")} value={<span className="text-2xl">{fmtFcfa(gap)}</span>} hint={t("cash.col.gapHint")} tone={gap > 0 ? "warning" : "success"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t("cash.col.details")} className="lg:col-span-2">
          <DL
            cols={2}
            items={[
              { label: t("cash.col.agent"), value: `${c.agent.firstName} ${c.agent.lastName}` },
              { label: t("cash.col.badge"), value: <span className="font-mono">{c.register.agentBadge ?? "—"}</span> },
              { label: t("cash.col.unit"), value: c.station.name },
              { label: t("cash.col.province"), value: c.region.name },
              { label: t("cash.col.period"), value: `${fmtDateTime(c.periodFrom, locale)} → ${fmtDateTime(c.periodTo, locale)}` },
              { label: t("cash.col.register"), value: <Link className="font-mono text-blue hover:underline" href={`/traffic/cash/registers/${c.register.id}`}>{c.register.number}</Link> },
              { label: t("cash.col.closure"), value: <Link className="font-mono text-blue hover:underline" href={`/traffic/cash/closures/${c.closure.id}`}>{c.closure.number}</Link> },
              { label: t("cash.col.toDeposit"), value: <span className="font-semibold tabular-nums">{fmtFcfa(Math.max(0, remaining))}</span> },
            ]}
          />
        </Card>
        <Card title={t("cash.col.actions")}>
          <div className="flex flex-col gap-2">
            {canDeposit ? <ButtonLink href={`/traffic/cash/deposits/new?collection=${c.id}`}>{t("cash.dep.new")}</ButtonLink> : null}
            {p.has("cash:verify_closure") && !c.verifiedAt && c.agentId !== actor.id ? <VerifyClosureButton collectionId={c.id} /> : null}
            {!canDeposit && !(p.has("cash:verify_closure") && !c.verifiedAt) ? <p className="text-sm text-slate">{t("cash.col.noActions")}</p> : null}
          </div>
        </Card>
      </div>

      <Card title={t("cash.nav.deposits")} padded={false}>
        {c.deposits.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("cash.dep.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("cash.col.deposit")}</th>
                <th>{t("cash.col.date")}</th>
                <th>{t("cash.dep.method")}</th>
                <th className="text-end">{t("cash.col.deposited")}</th>
                <th>{t("cash.col.slip")}</th>
                <th>{t("cash.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {c.deposits.map((d) => (
                <tr key={d.id}>
                  <td data-label={t("cash.col.deposit")}>
                    <Link href={`/traffic/cash/deposits/${d.id}`} className="font-mono font-semibold text-blue hover:underline">
                      {d.number}
                    </Link>
                    {d.attempt > 1 ? <span className="block text-xs text-slate">{t("cash.dep.attemptN", { n: d.attempt })}</span> : null}
                  </td>
                  <td data-label={t("cash.col.date")} className="text-xs">
                    {fmtDateTime(d.depositedAt, locale)}
                  </td>
                  <td data-label={t("cash.dep.method")} className="text-xs">
                    {labelOf(CASH_DEPOSIT_METHOD, d.method, locale).label}
                  </td>
                  <td data-label={t("cash.col.deposited")} className="text-end font-semibold tabular-nums">
                    {fmtFcfa(d.amountDepositedFcfa)}
                  </td>
                  <td data-label={t("cash.col.slip")} className="font-mono text-xs">
                    {d.slip?.number ?? "—"}
                  </td>
                  <td data-label={t("cash.col.status")}>
                    <Badge tone={labelOf(CASH_DEPOSIT_STATUS, d.status, locale).tone}>{labelOf(CASH_DEPOSIT_STATUS, d.status, locale).label}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {rec ? (
        <Card title={t("cash.rec.title")} description={t("cash.rec.hint")}>
          <DL
            cols={4}
            items={[
              { label: t("cash.rec.number"), value: <span className="font-mono">{rec.number}</span> },
              { label: t("cash.kpi.collected"), value: fmtFcfa(rec.collectedFcfa) },
              { label: t("cash.kpi.validated"), value: fmtFcfa(rec.validatedFcfa) },
              { label: t("cash.kpi.gap"), value: <span className={rec.gapFcfa > 0 ? "font-semibold text-warning" : "font-semibold text-success"}>{fmtFcfa(rec.gapFcfa)}</span> },
            ]}
          />
          {rec.status === "VALIDATED" ? (
            <Alert tone="success" className="mt-3">
              {t("cash.rec.doneBy", { name: rec.decidedBy ? `${rec.decidedBy.firstName} ${rec.decidedBy.lastName}` : "", date: rec.decidedAt ? fmtDateTime(rec.decidedAt, locale) : "" })}
            </Alert>
          ) : null}
          {rec.status === "REJECTED" && rec.note ? <Alert tone="danger" className="mt-3">{rec.note}</Alert> : null}
          {p.has("cash:reconcile") && rec.status !== "VALIDATED" ? (
            <div className="mt-4 border-t border-line pt-4">
              <ReconciliationPanel collectionId={c.id} status={rec.status} canDeclare={rec.status === "PENDING" && rec.validatedFcfa > 0} canFinalize={rec.status === "CONFORME" || (rec.gapFcfa === 0 && rec.validatedFcfa > 0) || c.discrepancies.some((d) => d.status === "VALIDATED" && d.amountFcfa === rec.gapFcfa)} />
            </div>
          ) : null}
        </Card>
      ) : null}

      {c.discrepancies.length > 0 ? (
        <Card title={t("cash.nav.discrepancies")} padded={false}>
          <Table>
            <thead>
              <tr>
                <th>{t("cash.col.discrepancy")}</th>
                <th className="text-end">{t("cash.col.amount")}</th>
                <th>{t("cash.disc.reason")}</th>
                <th>{t("cash.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {c.discrepancies.map((d) => (
                <tr key={d.id}>
                  <td data-label={t("cash.col.discrepancy")}>
                    <Link href={`/traffic/cash/discrepancies/${d.id}`} className="font-mono font-semibold text-blue hover:underline">
                      {d.number}
                    </Link>
                  </td>
                  <td data-label={t("cash.col.amount")} className="text-end font-semibold tabular-nums">
                    {fmtFcfa(d.amountFcfa)}
                  </td>
                  <td data-label={t("cash.disc.reason")} className="text-xs">
                    {d.reason ?? "—"}
                  </td>
                  <td data-label={t("cash.col.status")}>
                    <Badge tone={labelOf(CASH_DISCREPANCY_STATUS, d.status, locale).tone}>{labelOf(CASH_DISCREPANCY_STATUS, d.status, locale).label}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      <EntityHistory entities={[{ type: "TrafficRevenueCollection", id: c.id }, ...(rec ? [{ type: "TrafficReconciliation", id: rec.id }] : [])]} locale={locale} t={t} />
    </div>
  );
}

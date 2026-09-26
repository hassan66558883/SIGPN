import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDiscrepancy } from "@/server/traffic/cash-queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, PageHeader, StatCard } from "@/components/ui";
import { CASH_DISCREPANCY_STATUS, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { EntityHistory } from "../../../entity-history";
import { DiscrepancyPanel } from "../../cash-forms";
import { CASH_ANY, CashTabs, requireCash } from "../../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.disc.detail") };
}

export default async function DiscrepancyDetailPage({ params }: PageProps<"/traffic/cash/discrepancies/[id]">) {
  const actor = await requireCash(CASH_ANY);
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  let d;
  try {
    d = await getDiscrepancy(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const st = labelOf(CASH_DISCREPANCY_STATUS, d.status, locale);
  const p = actor.permissions;
  const canJustify = p.has("cash:reconcile") || (d.agentId === actor.id && p.has("cash:deposit_create"));
  const doc = d.attachmentDocument;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow={t("cash.eyebrow")} title={d.number} subtitle={`${d.agent.firstName} ${d.agent.lastName} · ${d.register.station.name}`} breadcrumbs={[{ href: "/traffic/cash/discrepancies", label: t("cash.nav.discrepancies") }, { label: d.number }]} />
      <CashTabs actor={actor} current="/traffic/cash/discrepancies" t={t} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      <Alert tone="info">{t("cash.disc.neverDeleted")}</Alert>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t("cash.disc.amount")} value={<span className="text-2xl">{fmtFcfa(d.amountFcfa)}</span>} tone="warning" />
        <StatCard label={t("cash.kpi.collected")} value={<span className="text-2xl">{fmtFcfa(d.collection.collectedFcfa)}</span>} tone="neutral" />
        <StatCard label={t("cash.kpi.validated")} value={<span className="text-2xl">{fmtFcfa(d.collection.validatedFcfa)}</span>} tone="info" />
      </div>
      <Card title={t("cash.disc.sheet")}>
        <DL
          cols={2}
          items={[
            { label: t("cash.col.date"), value: fmtDateTime(d.createdAt, locale) },
            { label: t("cash.col.agent"), value: `${d.agent.firstName} ${d.agent.lastName}` },
            { label: t("cash.col.register"), value: <Link className="font-mono text-blue hover:underline" href={`/traffic/cash/registers/${d.register.id}`}>{d.register.number}</Link> },
            { label: t("cash.col.collection"), value: <Link className="font-mono text-blue hover:underline" href={`/traffic/cash/collections/${d.collection.id}`}>{d.collection.number}</Link> },
            { label: t("cash.disc.reason"), value: d.reason ?? "—" },
            { label: t("cash.disc.attachment"), value: doc ? <a className="text-blue hover:underline" href={`/api/v1/documents/${doc.id}/download`}>{doc.versions[0]?.fileName ?? doc.title}</a> : "—" },
            { label: t("cash.disc.validatedBy"), value: d.validatedBy ? `${d.validatedBy.firstName} ${d.validatedBy.lastName}` : "—" },
            { label: t("cash.disc.validatedAt"), value: d.validatedAt ? fmtDateTime(d.validatedAt, locale) : "—" },
          ]}
        />
        {d.justification ? (
          <div className="mt-3 border-t border-line pt-3">
            <p className="label">{t("cash.disc.justification")}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-ink">{d.justification}</p>
          </div>
        ) : null}
      </Card>
      {d.status !== "VALIDATED" && (canJustify || p.has("cash:reconcile")) ? (
        <Card title={t("cash.disc.process")}>
          <DiscrepancyPanel id={d.id} status={d.status} canJustify={canJustify} canDecide={p.has("cash:reconcile")} isSelf={d.agentId === actor.id} reason={d.reason ?? ""} justification="" />
        </Card>
      ) : null}
      <EntityHistory entities={[{ type: "TrafficCashDiscrepancy", id: d.id }]} locale={locale} t={t} />
    </div>
  );
}

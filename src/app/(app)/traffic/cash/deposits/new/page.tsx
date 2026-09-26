import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollection } from "@/server/traffic/cash-queries";
import { getTrafficSettings } from "@/server/traffic/settings";
import { NotFoundError } from "@/server/errors";
import { Alert, Card, DL, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { DepositForm } from "../../cash-forms";
import { requireCash, str } from "../../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.dep.new") };
}

export default async function NewDepositPage({ searchParams }: PageProps<"/traffic/cash/deposits/new">) {
  const actor = await requireCash(["cash:deposit_create"]);
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const id = str(p.collection);
  if (!id) notFound();
  let c;
  try {
    c = await getCollection(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const settings = await getTrafficSettings();
  const active = c.deposits.filter((d) => d.status !== "REJECTED");
  const remaining = c.collectedFcfa - active.reduce((a, d) => a + d.amountDepositedFcfa, 0);
  const blocked = c.status === "VALIDATED" ? t("cash.dep.blockedValidated") : remaining <= 0 ? t("cash.dep.blockedNothing") : !settings.allowPartialDeposit && active.length > 0 ? t("cash.dep.blockedExisting") : null;
  const rejected = c.deposits.find((d) => d.status === "REJECTED");
  return (
    <div className="space-y-4">
      <PageHeader eyebrow={t("cash.eyebrow")} title={t("cash.dep.new")} subtitle={`${c.number} · ${c.agent.firstName} ${c.agent.lastName}`} breadcrumbs={[{ href: "/traffic/cash/collections", label: t("cash.nav.collections") }, { href: `/traffic/cash/collections/${c.id}`, label: c.number }, { label: t("cash.dep.new") }]} />
      <Card title={t("cash.dep.context")}>
        <DL
          cols={4}
          items={[
            { label: t("cash.col.collection"), value: <Link className="font-mono text-blue hover:underline" href={`/traffic/cash/collections/${c.id}`}>{c.number}</Link> },
            { label: t("cash.col.period"), value: `${fmtDate(c.periodFrom, locale)} → ${fmtDate(c.periodTo, locale)}` },
            { label: t("cash.kpi.collected"), value: fmtFcfa(c.collectedFcfa) },
            { label: t("cash.col.toDeposit"), value: <span className="font-bold text-navy">{fmtFcfa(Math.max(0, remaining))}</span> },
          ]}
        />
      </Card>
      {rejected ? <Alert tone="warning">{t("cash.dep.resubmitNotice", { number: rejected.number })}</Alert> : null}
      {blocked ? (
        <Alert tone="danger">{blocked}</Alert>
      ) : (
        <Card title={t("cash.dep.formTitle")} description={settings.allowPartialDeposit ? t("cash.dep.formHintPartial") : t("cash.dep.formHint")}>
          <DepositForm collectionId={c.id} remaining={remaining} allowPartial={settings.allowPartialDeposit} />
        </Card>
      )}
    </div>
  );
}

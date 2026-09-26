import type { Metadata } from "next";
import Link from "next/link";
import type { TrafficOffenceClass } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { listViolations, violationSummary } from "@/server/traffic/queries";
import { TRAFFIC_SOURCE_DOCUMENT } from "@/server/traffic/data/violations-source";
import { Alert, Badge, Card, EmptyState, PageHeader, Select, StatCard, Table, Tabs } from "@/components/ui";
import { TRAFFIC_CATEGORY, TRAFFIC_OFFENCE_CLASS, labelOf, optionsOf } from "@/lib/labels";
import { fmtNumber } from "@/lib/format";
import { fmtClassText, fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { ViolationToggle } from "../traffic-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.viol.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function ViolationsPage({ searchParams }: PageProps<"/traffic/violations">) {
  const actor = await requirePermission("traffic:violations_view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const category = str(p.category);
  const offenceClass = str(p.class) as TrafficOffenceClass | undefined;
  const q = str(p.q);
  const [items, summary] = await Promise.all([listViolations({ q, category, offenceClass }), violationSummary()]);
  const canManage = actor.permissions.has("traffic:catalog_manage");
  const tab = (code: string | undefined) => `/traffic/violations${code ? `?category=${code}` : ""}`;
  const flagged = items.filter((v) => v.sourceNote).length;
  return (
    <div>
      <PageHeader eyebrow={t("traffic.eyebrow")} title={t("traffic.viol.title")} subtitle={t("traffic.viol.subtitle", { n: fmtNumber(summary.total, locale) })} />
      <Alert tone="info" className="mb-4" title={t("traffic.viol.sourceTitle")}>
        <p>{TRAFFIC_SOURCE_DOCUMENT.title}</p>
        <p className="mt-1 text-xs">
          {t("traffic.viol.sourceBody", { pages: TRAFFIC_SOURCE_DOCUMENT.pages })} <span className="font-mono">SHA-256 {TRAFFIC_SOURCE_DOCUMENT.sha256.slice(0, 16)}…</span>
        </p>
      </Alert>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {summary.byCategory.map((c) => (
          <StatCard key={c.code} label={labelOf(TRAFFIC_CATEGORY, c.code, locale).label} value={c.count} tone={labelOf(TRAFFIC_CATEGORY, c.code, locale).tone === "violet" ? "violet" : labelOf(TRAFFIC_CATEGORY, c.code, locale).tone === "warning" ? "warning" : "info"} href={tab(c.code)} hint={c.sourceHeading ?? undefined} />
        ))}
      </div>
      <Tabs
        current={category ?? "all"}
        items={[{ href: tab(undefined), label: t("traffic.viol.allCategories"), count: summary.total }, ...summary.byCategory.map((c) => ({ href: tab(c.code), label: labelOf(TRAFFIC_CATEGORY, c.code, locale).label, count: c.count }))]}
      />
      <Card className="mb-4 mt-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <input name="q" defaultValue={q ?? ""} placeholder={t("traffic.viol.searchPh")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="class" defaultValue={offenceClass ?? ""} placeholder={t("traffic.viol.allClasses")} options={optionsOf(TRAFFIC_OFFENCE_CLASS, locale)} aria-label={t("traffic.col.class")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
            {t("common.filter")}
          </button>
        </form>
      </Card>
      <Card padded={false} description={flagged ? t("traffic.viol.flaggedHint", { n: flagged }) : undefined}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("traffic.viol.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("traffic.viol.code")}</th>
                <th>{t("traffic.col.offence")}</th>
                <th>{t("traffic.col.class")}</th>
                <th>{t("traffic.col.legalRef")}</th>
                <th className="text-end">{t("traffic.col.flatFine")}</th>
                {canManage ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((v) => {
                const cls = labelOf(TRAFFIC_OFFENCE_CLASS, v.offenceClass, locale);
                return (
                  <tr key={v.id} className={v.isActive ? "" : "opacity-60"}>
                    <td data-label={t("traffic.viol.code")} className="font-mono text-xs">
                      {v.code}
                      <span className="block text-slate">p. {v.sourcePage}</span>
                    </td>
                    <td data-label={t("traffic.col.offence")}>
                      {v.name}
                      <span className="mt-0.5 block text-[11px] text-slate">{labelOf(TRAFFIC_CATEGORY, v.category.code, locale).label}</span>
                      {v.sourceNote ? (
                        <details className="mt-1 text-[11px] text-warning">
                          <summary className="cursor-pointer font-semibold">{t("traffic.viol.sourceNote")}</summary>
                          <p className="mt-0.5 text-slate">{v.sourceNote}</p>
                        </details>
                      ) : null}
                    </td>
                    <td data-label={t("traffic.col.class")}>
                      <Badge tone={cls.tone}>{v.offenceClass === "DELIT" ? cls.label : fmtClassText(v.classText)}</Badge>
                    </td>
                    <td data-label={t("traffic.col.legalRef")} className="text-xs">
                      {v.legalReference.reference}
                    </td>
                    <td data-label={t("traffic.col.flatFine")} className="text-end font-semibold tabular-nums">
                      {v.fineAmountFcfa === null ? <span className="text-violet">{v.fineAmountText}</span> : fmtFcfa(v.fineAmountFcfa)}
                    </td>
                    {canManage ? (
                      <td>
                        {!v.isActive ? <Badge tone="neutral" className="me-2">{t("traffic.viol.inactive")}</Badge> : null}
                        <ViolationToggle id={v.id} isActive={v.isActive} />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <p className="mt-3 text-xs text-slate">
        {t("traffic.viol.footnote")}{" "}
        <Link href="/traffic" className="text-blue hover:underline">
          {t("traffic.dash.title")}
        </Link>
      </p>
    </div>
  );
}

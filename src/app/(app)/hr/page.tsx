import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { hrOverview } from "@/server/hr/service";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { ADMINISTRATIVE_STATUS, CAREER_EVENT_TYPE, labelOf } from "@/lib/labels";
import { fmtDate, fmtNumber } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.overview.title") };
}

function Bars({ rows }: { rows: { label: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
          <div>
            <div className="mb-0.5 truncate text-xs text-slate">{r.label}</div>
            <div className="h-2 rounded bg-mist">
              <div className="h-2 rounded bg-blue" style={{ width: `${Math.round((r.n / max) * 100)}%` }} />
            </div>
          </div>
          <span className="font-mono text-xs">{r.n}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function HrOverviewPage() {
  const actor = await requirePermission("hr:view");
  const [o, t, locale] = await Promise.all([hrOverview(actor), getT(), getLocale()]);
  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.overview.title")} subtitle={t("hr.overview.subtitle", { n: fmtNumber(o.total, locale) })} actions={<ButtonLink href="/hr/dossiers">{t("hr.overview.openDossiers")}</ButtonLink>} />
      {o.total === 0 ? (
        <EmptyState>{t("hr.overview.none")}</EmptyState>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {o.byStatus.map((s) => {
              const l = labelOf(ADMINISTRATIVE_STATUS, s.key, locale);
              return <StatCard key={s.key} label={l.label} value={fmtNumber(s.n, locale)} tone={l.tone} href={`/hr/dossiers?status=${s.key}`} />;
            })}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={t("hr.overview.byRank")}>
              <Bars rows={o.byRank.map((r) => ({ label: r.name, n: r.n }))} />
            </Card>
            <Card title={t("hr.overview.byCorps")}>
              <Bars rows={o.byCorps.map((r) => ({ label: r.name, n: r.n }))} />
            </Card>
          </div>
          <Card className="mt-4" title={t("hr.overview.recent")}>
            <ul className="divide-y divide-line text-sm">
              {o.recentEvents.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 py-2">
                  <Badge tone={labelOf(CAREER_EVENT_TYPE, e.type, locale).tone}>{labelOf(CAREER_EVENT_TYPE, e.type, locale).label}</Badge>
                  <Link href={`/hr/dossiers/${e.officer.id}`} className="font-semibold text-blue hover:underline">
                    {e.officer.lastName}, {e.officer.firstName}
                  </Link>
                  <span className="font-mono text-xs text-slate">{e.officer.badgeNumber}</span>
                  <span className="ms-auto text-xs text-slate">
                    {e.reference} · {fmtDate(e.effectiveDate, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { hrOverview } from "@/server/hr/service";
import { hrStatistics } from "@/server/hr/stats";
import { orgReferences } from "@/server/org/queries";
import { BusinessError } from "@/server/errors";
import { Alert, Badge, ButtonLink, Card, EmptyState, PageHeader, Select, StatCard } from "@/components/ui";
import { CHART, StackedShare } from "@/components/charts";
import { ADMINISTRATIVE_STATUS, ATTENDANCE_STATUS, CAREER_EVENT_TYPE, GENDER, TRAINING_KIND, TRANSFER_STATUS, labelOf } from "@/lib/labels";
import { fmtDate, fmtNumber } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { translateMessage } from "@/lib/i18n/errors";
import type { MessageKey } from "@/lib/i18n";
import { BarsSwitcher, SeriesSwitcher } from "./stats-charts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.overview.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)} %`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function HrDashboardPage({ searchParams }: PageProps<"/hr">) {
  const actor = await requirePermission("hr:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const refs = await orgReferences(actor);
  const from = str(p.from) ? new Date(String(p.from)) : undefined;
  const to = str(p.to) ? new Date(String(p.to)) : undefined;
  const filters = { from: from && !Number.isNaN(from.getTime()) ? from : undefined, to: to && !Number.isNaN(to.getTime()) ? to : undefined, regionId: str(p.regionId), stationId: str(p.stationId), rankId: str(p.rankId) };
  let s;
  let error: string | null = null;
  try {
    s = await hrStatistics(actor, filters);
  } catch (e) {
    if (e instanceof BusinessError) error = e.message;
    else throw e;
  }
  const recent = (await hrOverview(actor)).recentEvents;
  const qsKeep = new URLSearchParams();
  for (const k of ["from", "to", "regionId", "stationId", "rankId"]) if (str(p[k])) qsKeep.set(k, String(p[k]));
  const num = (n: number) => fmtNumber(n, locale);
  const dossiers = (extra: Record<string, string>) => `/hr/dossiers?${new URLSearchParams({ ...(filters.stationId ? { stationId: filters.stationId } : {}), ...(filters.regionId ? { regionId: filters.regionId } : {}), ...(filters.rankId ? { rankId: filters.rankId } : {}), ...extra }).toString()}`;
  const month = (m: string) => m.slice(2).replace("-", "/");

  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.overview.title")} subtitle={s ? t("hr.st.subtitle", { from: fmtDate(s.period.from, locale), to: fmtDate(s.period.to, locale) }) : undefined} actions={s ? <ButtonLink href={`/api/v1/hr/stats/export?${qsKeep.toString()}`} variant="secondary" size="sm">{t("hr.st.exportCsv")}</ButtonLink> : null} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="text-xs text-slate">
            {t("traffic.filter.from")}
            <input name="from" type="date" defaultValue={s ? iso(s.period.from) : ""} className="input mt-1" />
          </label>
          <label className="text-xs text-slate">
            {t("traffic.filter.to")}
            <input name="to" type="date" defaultValue={s ? iso(s.period.to) : ""} className="input mt-1" />
          </label>
          <label className="text-xs text-slate">
            {t("hr.st.delegation")}
            <Select name="regionId" defaultValue={filters.regionId ?? ""} placeholder={t("hr.st.allDelegations")} options={refs.regions.map((r) => ({ value: r.id, label: r.name }))} className="mt-1" />
          </label>
          <label className="text-xs text-slate">
            {t("hr.st.station")}
            <Select name="stationId" defaultValue={filters.stationId ?? ""} placeholder={t("officers.allStations")} options={refs.stations.map((x) => ({ value: x.id, label: `${x.code} · ${x.name}` }))} className="mt-1" />
          </label>
          <label className="text-xs text-slate">
            {t("hr.st.rank")}
            <Select name="rankId" defaultValue={filters.rankId ?? ""} placeholder={t("officers.allRanks")} options={refs.ranks.map((x) => ({ value: x.id, label: x.name }))} className="mt-1" />
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
              {t("common.filter")}
            </button>
            <Link href="/hr" className="rounded-md border border-line px-3 py-2 text-sm text-slate hover:bg-mist">
              {t("traffic.filter.reset")}
            </Link>
          </div>
        </form>
      </Card>
      {error ? <Alert tone="danger">{translateMessage(error, locale)}</Alert> : null}
      {s ? (
        s.workforce.total === 0 ? (
          <EmptyState>{t("hr.overview.none")}</EmptyState>
        ) : (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label={t("hr.st.total")} value={num(s.workforce.total)} href={dossiers({})} hint={t("hr.st.activeHint", { n: num(s.workforce.active) })} />
              <StatCard label={t("hr.st.transfersExecuted")} value={num(s.movements.transfersExecuted)} tone="info" href="/hr/transfers?status=EXECUTED" hint={t("hr.st.openTransfers", { n: num(s.assignments.openTransfers) })} />
              <StatCard label={t("hr.st.retiring")} value={num(s.retirement.next12Months)} tone={s.retirement.next12Months ? "warning" : "neutral"} hint={t("hr.st.retireAge", { a: s.retirement.age })} />
              <StatCard label={t("hr.st.promotionsPending")} value={num(s.promotionsPending.eligible)} tone={s.promotionsPending.eligible ? "warning" : "neutral"} hint={t("hr.st.promoHint", { y: s.promotionsPending.minYears })} />
              <StatCard label={t("hr.st.promotionsDone")} value={num(s.movements.promotions)} tone="success" />
              <StatCard label={t("hr.st.presenceRate")} value={pct(s.attendance.presenceRate)} tone="success" hint={t("hr.st.absenceRate", { r: pct(s.attendance.absenceRate) })} />
              <StatCard label={t("hr.st.trainingPassed")} value={num(s.training.passed)} hint={t("hr.st.passRate", { r: pct(s.training.passRate) })} />
              <StatCard label={t("hr.st.trainingExpiring")} value={num(s.training.expiring90)} tone={s.training.expiring90 ? "warning" : "neutral"} href="/hr/training?expiring=1" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title={t("hr.st.workforce")}>
                <BarsSwitcher
                  name={t("hr.st.workforce")}
                  tabs={[
                    { key: "rank", label: t("hr.st.byRank"), rows: s.workforce.byRank.map((r) => ({ label: r.name, value: r.n, href: `/hr/dossiers?rankId=${r.id}${filters.stationId ? `&stationId=${filters.stationId}` : ""}${filters.regionId ? `&regionId=${filters.regionId}` : ""}` })) },
                    { key: "delegation", label: t("hr.st.byDelegation"), rows: s.workforce.byRegion.map((r) => ({ label: r.name, value: r.n, href: `/hr/dossiers?regionId=${r.id}${filters.rankId ? `&rankId=${filters.rankId}` : ""}` })) },
                    { key: "station", label: t("hr.st.byStation"), rows: s.workforce.byStation.map((r) => ({ label: `${r.code} · ${r.name}`, value: r.n, href: `/hr/dossiers?stationId=${r.id}${filters.rankId ? `&rankId=${filters.rankId}` : ""}` })) },
                    { key: "gender", label: t("hr.st.byGender"), rows: s.workforce.byGender.map((g) => ({ label: labelOf(GENDER, g.key, locale).label, value: g.n })) },
                  ]}
                />
                {s.workforce.stationCount > s.workforce.byStation.length ? <p className="mt-2 text-xs text-slate">{t("hr.st.topStations", { n: s.workforce.byStation.length, total: s.workforce.stationCount })}</p> : null}
              </Card>
              <Card title={t("hr.st.movements")}>
                <SeriesSwitcher
                  name={t("hr.st.movements")}
                  tableLabel={t("traffic.chart.tableView")}
                  tabs={[
                    { key: "transfers", label: t("hr.st.tabTransfers"), series: [{ name: t("hr.st.tabTransfers"), color: CHART.blue, points: s.movements.transfersMonthly.map((m) => ({ label: month(m.month), value: m.value })) }] },
                    { key: "promotions", label: t("hr.st.tabPromotions"), series: [{ name: t("hr.st.tabPromotions"), color: CHART.aqua, points: s.movements.promotionsMonthly.map((m) => ({ label: month(m.month), value: m.value })) }] },
                    { key: "absences", label: t("hr.st.tabAbsences"), series: [{ name: t("hr.st.absent"), color: CHART.orange, points: s.attendance.monthly.map((m) => ({ label: month(m.month), value: m.absent })) }, { name: t("hr.st.late"), color: CHART.blue, points: s.attendance.monthly.map((m) => ({ label: month(m.month), value: m.late })) }] },
                  ]}
                />
              </Card>
              <Card title={t("hr.st.retirementTitle")} description={t("hr.st.retirementHint", { a: s.retirement.age })}>
                <SeriesSwitcher name={t("hr.st.retirementTitle")} tableLabel={t("traffic.chart.tableView")} tabs={[{ key: "ret", label: t("hr.st.forecast"), series: [{ name: t("hr.st.forecast"), color: CHART.orange, points: s.retirement.byYear.map((y) => ({ label: String(y.year), value: y.n })) }] }]} />
                <p className="mt-2 text-xs text-slate">{t("hr.st.retirementNotes", { o: s.retirement.overdue, nb: s.retirement.noBirthDate })}</p>
              </Card>
              <Card title={t("hr.st.tenureTitle")} description={t("hr.st.tenureHint")}>
                <StackedShare
                  format={num}
                  segments={s.assignments.tenure.map((x, i) => ({ name: t(`hr.st.tenure.${x.key}` as MessageKey), value: x.n, color: [CHART.aqua, CHART.blue, "#d4a017", CHART.orange][i] }))}
                />
                {s.assignments.noTenure ? <p className="mt-2 text-xs text-slate">{t("hr.st.noTenure", { n: s.assignments.noTenure })}</p> : null}
                <Link href="/hr/rotation" className="mt-3 inline-block text-xs font-semibold text-blue hover:underline">
                  {t("hr.st.openRotation")}
                </Link>
              </Card>
              <Card title={t("hr.st.statusTitle")}>
                <BarsSwitcher
                  name={t("hr.st.statusTitle")}
                  tabs={[
                    { key: "status", label: t("hr.st.byStatus"), rows: s.workforce.byStatus.map((g) => ({ label: labelOf(ADMINISTRATIVE_STATUS, g.key, locale).label, value: g.n, href: `/hr/dossiers?status=${g.key}` })) },
                    { key: "transfers", label: t("hr.st.tabTransfers"), rows: s.movements.transfersByStatus.map((g) => ({ label: labelOf(TRANSFER_STATUS, g.key, locale).label, value: g.n, href: `/hr/transfers?status=${g.key}` })) },
                    { key: "events", label: t("hr.st.careerEvents"), rows: s.movements.eventsByType.map((g) => ({ label: labelOf(CAREER_EVENT_TYPE, g.key, locale).label, value: g.n })) },
                    { key: "attendance", label: t("hr.st.tabAbsences"), rows: s.attendance.byStatus.map((g) => ({ label: labelOf(ATTENDANCE_STATUS, g.key, locale).label, value: g.n })) },
                  ]}
                />
              </Card>
              <Card title={t("hr.st.promotionsTitle")} description={t("hr.st.promotionsHint", { y: s.promotionsPending.minYears })}>
                <BarsSwitcher name={t("hr.st.promotionsTitle")} tabs={[{ key: "pending", label: t("hr.st.byRank"), rows: s.promotionsPending.byRank.map((r) => ({ label: r.name, value: r.n })) }]} />
              </Card>
              <Card title={t("hr.st.trainingTitle")}>
                <BarsSwitcher
                  name={t("hr.st.trainingTitle")}
                  tabs={[
                    { key: "kind", label: t("hr.tr.kind"), rows: s.training.byKind.map((g) => ({ label: labelOf(TRAINING_KIND, g.key, locale).label, value: g.n, href: `/hr/training?kind=${g.key}` })) },
                    { key: "status", label: t("training.status"), rows: s.training.byStatus.map((g) => ({ label: g.key, value: g.n, href: `/hr/training?status=${g.key}` })) },
                  ]}
                />
              </Card>
              <Card title={t("hr.overview.recent")}>
                <ul className="divide-y divide-line text-sm">
                  {recent.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center gap-2 py-2">
                      <Badge tone={labelOf(CAREER_EVENT_TYPE, e.type, locale).tone}>{labelOf(CAREER_EVENT_TYPE, e.type, locale).label}</Badge>
                      <Link href={`/hr/dossiers/${e.officer.id}`} className="font-semibold text-blue hover:underline">
                        {e.officer.lastName}, {e.officer.firstName}
                      </Link>
                      <span className="ms-auto text-xs text-slate">{fmtDate(e.effectiveDate, locale)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            <p className="mt-3 text-xs text-slate">{t("hr.st.method")}</p>
          </>
        )
      ) : null}
    </div>
  );
}

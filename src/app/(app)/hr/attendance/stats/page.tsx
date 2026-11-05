import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { attendanceStats } from "@/server/hr/attendance";
import { orgReferences } from "@/server/org/queries";
import { BusinessError } from "@/server/errors";
import { Alert, Badge, Card, EmptyState, PageHeader, Select, StatCard, Table } from "@/components/ui";
import { ATTENDANCE_STATUS, labelOf } from "@/lib/labels";
import { fmtNumber } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.att.stats") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)} %`);

export default async function AttendanceStatsPage({ searchParams }: PageProps<"/hr/attendance/stats">) {
  const actor = await requirePermission("hr:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const to = str(p.to) ? new Date(String(p.to)) : new Date();
  const from = str(p.from) ? new Date(String(p.from)) : new Date(to.getTime() - 29 * 86_400_000);
  const refs = await orgReferences(actor);
  let s;
  let error: string | null = null;
  try {
    s = await attendanceStats(actor, { from, to, stationId: str(p.stationId) });
  } catch (e) {
    if (e instanceof BusinessError) error = e.message;
    else throw e;
  }
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.att.stats")} breadcrumbs={[{ href: "/hr/attendance", label: t("hr.att.title") }, { label: t("hr.att.stats") }]} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="from" type="date" defaultValue={iso(from)} className="input" aria-label={t("traffic.filter.from")} />
          <input name="to" type="date" defaultValue={iso(to)} className="input" aria-label={t("traffic.filter.to")} />
          <Select name="stationId" defaultValue={str(p.stationId) ?? ""} placeholder={t("officers.allStations")} options={refs.stations.map((x) => ({ value: x.id, label: `${x.code} · ${x.name}` }))} aria-label={t("officers.allStations")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
            {t("common.filter")}
          </button>
        </form>
      </Card>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {s ? (
        s.total === 0 ? (
          <EmptyState>{t("hr.att.noData")}</EmptyState>
        ) : (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label={t("hr.att.presenceRate")} value={pct(s.presenceRate)} tone="success" hint={t("hr.att.rateHint")} />
              <StatCard label={t("hr.att.absenceRate")} value={pct(s.absenceRate)} tone={s.absenceRate && s.absenceRate > 0.1 ? "danger" : "neutral"} />
              <StatCard label={t("hr.att.lateMinutes")} value={fmtNumber(s.lateMinutes, locale)} tone="warning" />
              <StatCard label={t("hr.att.records")} value={fmtNumber(s.total, locale)} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title={t("hr.att.byStatus")}>
                <ul className="space-y-1 text-sm">
                  {Object.entries(s.counts).map(([k, n]) => (
                    <li key={k} className="flex justify-between">
                      <Badge tone={labelOf(ATTENDANCE_STATUS, k, locale).tone}>{labelOf(ATTENDANCE_STATUS, k, locale).label}</Badge>
                      <span className="font-mono">{n}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title={t("hr.att.topAbsentees")} padded={false}>
                {s.topAbsentees.length === 0 ? (
                  <div className="p-5">
                    <EmptyState>{t("hr.att.noData")}</EmptyState>
                  </div>
                ) : (
                  <Table>
                    <tbody>
                      {s.topAbsentees.map((a) => (
                        <tr key={a.id}>
                          <td data-label={t("hr.col.agent")}>
                            <Link href={`/hr/dossiers/${a.id}`} className="text-blue hover:underline">
                              {a.lastName}, {a.firstName}
                            </Link>
                            <span className="block font-mono text-[11px] text-slate">{a.badgeNumber}</span>
                          </td>
                          <td data-label={t("hr.att.absences")} className="font-mono">
                            {a.absences}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card>
            </div>
            <Card className="mt-4" title={t("hr.att.byStation")} padded={false}>
              <Table>
                <thead>
                  <tr>
                    <th>{t("hr.col.posting")}</th>
                    <th>{t("hr.att.presenceRate")}</th>
                    <th>{t("hr.att.absences")}</th>
                  </tr>
                </thead>
                <tbody>
                  {s.stations.map((x) => (
                    <tr key={x.id}>
                      <td data-label={t("hr.col.posting")}>
                        {x.code} · {x.name}
                      </td>
                      <td data-label={t("hr.att.presenceRate")} className="font-mono">
                        {pct(x.presenceRate)}
                      </td>
                      <td data-label={t("hr.att.absences")} className="font-mono">
                        {x.counts.ABSENT ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </>
        )
      ) : null}
    </div>
  );
}

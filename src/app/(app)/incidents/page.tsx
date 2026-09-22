import type { Metadata } from "next";
import Link from "next/link";
import type { IncidentStatus, IncidentType, Severity } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { incidentCounts, listIncidents } from "@/server/ops/queries";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, StatCard, Table } from "@/components/ui";
import { INCIDENT_STATUS, INCIDENT_TYPE, SEVERITY, labelOf, optionsOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("incidents.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function IncidentsPage({ searchParams }: PageProps<"/incidents">) {
  const actor = await requirePermission("incidents:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), type: str(p.type) as IncidentType | undefined, severity: str(p.severity) as Severity | undefined, status: str(p.status) as IncidentStatus | undefined, stationId: str(p.stationId), open: p.open === "1", mine: p.mine === "1", page: Number(p.page ?? 1) || 1 };
  const [{ items, total, page, pageSize }, counts] = await Promise.all([listIncidents(actor, filter), incidentCounts(actor)]);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/incidents?${s.toString()}`;
  };
  const kpi = (statuses: string[]) => statuses.reduce((n, s) => n + (counts[s] ?? 0), 0);
  return (
    <div>
      <PageHeader eyebrow={t("incident.eyebrow")} title={t("incidents.title")} subtitle={t("incidents.subtitle", { n: total })} actions={actor.permissions.has("incidents:create") ? <ButtonLink href="/incidents/new">{t("incidents.new")}</ButtonLink> : null} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("incidents.open")} value={kpi(["REPORTED", "RESPONDING", "ON_SCENE"])} tone={kpi(["REPORTED", "RESPONDING", "ON_SCENE"]) ? "warning" : "neutral"} href="/incidents?open=1" />
        <StatCard label={labelOf(INCIDENT_STATUS, "ON_SCENE", locale).label} value={kpi(["ON_SCENE"])} tone="violet" href="/incidents?status=ON_SCENE" />
        <StatCard label={labelOf(INCIDENT_STATUS, "RESOLVED", locale).label} value={kpi(["RESOLVED"])} tone="success" href="/incidents?status=RESOLVED" />
        <StatCard label={labelOf(INCIDENT_STATUS, "ESCALATED", locale).label} value={kpi(["ESCALATED"])} tone="danger" href="/incidents?status=ESCALATED" />
      </div>
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("incidents.searchPlaceholder")} className="input lg:col-span-2" aria-label={t("common.search")} />
          <Select name="type" defaultValue={filter.type ?? ""} placeholder={t("incidents.allTypes")} options={optionsOf(INCIDENT_TYPE, locale)} aria-label={t("incidents.col.type")} />
          <Select name="severity" defaultValue={filter.severity ?? ""} placeholder={t("incidents.allSeverities")} options={optionsOf(SEVERITY, locale)} aria-label={t("incidents.col.severity")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("incidents.allStatuses")} options={optionsOf(INCIDENT_STATUS, locale)} aria-label={t("incidents.col.status")} />
          {filter.stationId ? <input type="hidden" name="stationId" value={filter.stationId} /> : null}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1 text-xs text-slate">
              <input type="checkbox" name="open" value="1" defaultChecked={filter.open} /> {t("incidents.onlyOpen")}
            </label>
            <label className="flex items-center gap-1 text-xs text-slate">
              <input type="checkbox" name="mine" value="1" defaultChecked={filter.mine} /> {t("incidents.mine")}
            </label>
            <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
              {t("common.filter")}
            </button>
          </div>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("incidents.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("incidents.col.incident")}</th>
                <th>{t("incidents.col.type")}</th>
                <th>{t("incidents.col.severity")}</th>
                <th>{t("incidents.col.status")}</th>
                <th>{t("incidents.col.station")}</th>
                <th>{t("incidents.col.officers")}</th>
                <th>{t("incidents.col.reporter")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const st = labelOf(INCIDENT_STATUS, i.status, locale);
                const ty = labelOf(INCIDENT_TYPE, i.type, locale);
                const sv = labelOf(SEVERITY, i.severity, locale);
                return (
                  <tr key={i.id}>
                    <td data-label={t("incidents.col.incident")}>
                      <Link href={`/incidents/${i.id}`} className="font-semibold text-blue hover:underline">
                        {i.number}
                      </Link>
                      <span className="block text-xs text-ink">{i.title}</span>
                      <span className="block text-[11px] text-slate">
                        {fmtDateTime(i.occurredAt, locale)} · {i.locationText}
                      </span>
                    </td>
                    <td data-label={t("incidents.col.type")}>
                      <Badge tone={ty.tone}>{ty.label}</Badge>
                    </td>
                    <td data-label={t("incidents.col.severity")}>
                      <Badge tone={sv.tone}>{sv.label}</Badge>
                    </td>
                    <td data-label={t("incidents.col.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {i.case ? (
                        <Link href={`/cases/${i.case.id}`} className="block font-mono text-[11px] text-blue hover:underline">
                          {i.case.number}
                        </Link>
                      ) : null}
                    </td>
                    <td data-label={t("incidents.col.station")} className="text-xs">
                      {i.station.name}
                      {i.patrol ? (
                        <Link href={`/patrols/${i.patrol.id}`} className="block font-mono text-[11px] text-blue hover:underline">
                          {i.patrol.number}
                        </Link>
                      ) : null}
                    </td>
                    <td data-label={t("incidents.col.officers")} className="text-xs">
                      {i._count.officers} · {i._count.persons} {t("incident.persons").toLowerCase()}
                    </td>
                    <td data-label={t("incidents.col.reporter")} className="text-xs">
                      {i.reportedBy.firstName} {i.reportedBy.lastName}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <div className="px-4 pb-3">
          <Pagination page={page} pageSize={pageSize} total={total} hrefFor={qs} t={t} />
        </div>
      </Card>
    </div>
  );
}

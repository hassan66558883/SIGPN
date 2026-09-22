import type { Metadata } from "next";
import Link from "next/link";
import type { PatrolStatus, Shift } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { listPatrols, operationalStations, patrolCounts, zonesOf } from "@/server/ops/queries";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, StatCard, Table } from "@/components/ui";
import { PATROL_STATUS, SHIFT, labelOf, optionsOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { ZoneForm } from "./patrol-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("patrols.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function PatrolsPage({ searchParams }: PageProps<"/patrols">) {
  const actor = await requirePermission("patrols:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status) as PatrolStatus | undefined, shift: str(p.shift) as Shift | undefined, stationId: str(p.stationId), page: Number(p.page ?? 1) || 1 };
  const canManage = actor.permissions.has("patrols:manage");
  const [{ items, total, page, pageSize }, counts, stations] = await Promise.all([listPatrols(actor, filter), patrolCounts(actor), canManage ? operationalStations(actor) : Promise.resolve([])]);
  // zones: station-level actors see their own; wider actors manage zones from the station they filter on (or all their operational stations when few)
  const zoneStationIds = canManage ? (actor.stationIds?.length ? actor.stationIds : filter.stationId ? [filter.stationId] : stations.length <= 6 ? stations.map((s) => s.id) : []) : [];
  const zones = await zonesOf(zoneStationIds, true);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/patrols?${s.toString()}`;
  };
  const stationOpts = stations.map((s) => ({ id: s.id, label: `${s.code} · ${s.name}` }));
  return (
    <div>
      <PageHeader eyebrow={t("patrol.eyebrow")} title={t("patrols.title")} subtitle={t("patrols.subtitle", { n: total })} actions={canManage ? <ButtonLink href="/patrols/new">{t("patrols.new")}</ButtonLink> : null} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"] as const).map((s) => {
          const l = labelOf(PATROL_STATUS, s, locale);
          return <StatCard key={s} label={l.label} value={counts[s] ?? 0} tone={l.tone} href={`/patrols?status=${s}`} />;
        })}
      </div>
      <div className={canManage ? "grid gap-4 xl:grid-cols-3" : ""}>
        <div className={canManage ? "space-y-4 xl:col-span-2" : "space-y-4"}>
          <Card>
            <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <input name="q" defaultValue={filter.q ?? ""} placeholder={t("patrols.searchPlaceholder")} className="input lg:col-span-2" aria-label={t("common.search")} />
              <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("patrols.allStatuses")} options={optionsOf(PATROL_STATUS, locale)} aria-label={t("patrols.col.status")} />
              <Select name="shift" defaultValue={filter.shift ?? ""} placeholder={t("patrols.allShifts")} options={optionsOf(SHIFT, locale)} aria-label={t("patrols.col.shift")} />
              {filter.stationId ? <input type="hidden" name="stationId" value={filter.stationId} /> : null}
              <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
                {t("common.filter")}
              </button>
            </form>
          </Card>
          <Card padded={false}>
            {items.length === 0 ? (
              <div className="p-5">
                <EmptyState>{t("patrols.none")}</EmptyState>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>{t("patrols.col.patrol")}</th>
                    <th>{t("patrols.col.shift")}</th>
                    <th>{t("patrols.col.zone")}</th>
                    <th>{t("patrols.col.supervisor")}</th>
                    <th>{t("patrols.col.status")}</th>
                    <th>{t("patrols.col.team")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((x) => {
                    const st = labelOf(PATROL_STATUS, x.status, locale);
                    const sh = labelOf(SHIFT, x.shift, locale);
                    return (
                      <tr key={x.id}>
                        <td data-label={t("patrols.col.patrol")}>
                          <Link href={`/patrols/${x.id}`} className="font-semibold text-blue hover:underline">
                            {x.number}
                          </Link>
                          <span className="block text-xs text-ink">{x.mission.length > 80 ? `${x.mission.slice(0, 80)}…` : x.mission}</span>
                          <span className="block text-[11px] text-slate">
                            {fmtDateTime(x.plannedStart, locale)} → {fmtDateTime(x.plannedEnd, locale)} · {x.station.code}
                          </span>
                        </td>
                        <td data-label={t("patrols.col.shift")}>
                          <Badge tone={sh.tone}>{sh.label}</Badge>
                        </td>
                        <td data-label={t("patrols.col.zone")} className="text-xs">
                          {x.zone ? `${x.zone.code} · ${x.zone.name}` : "—"}
                        </td>
                        <td data-label={t("patrols.col.supervisor")} className="text-xs">
                          {x.supervisor.firstName} {x.supervisor.lastName}
                          {x.vehicle ? <span className="block font-mono text-[11px] text-slate">{x.vehicle.fleetNumber}</span> : null}
                        </td>
                        <td data-label={t("patrols.col.status")}>
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </td>
                        <td data-label={t("patrols.col.team")} className="text-xs">
                          {x._count.officers + 1} · {x._count.incidents} {t("patrol.incidents").toLowerCase()}
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
        {canManage ? (
          <Card title={t("patrols.zones")} description={t("patrols.zonesHint")}>
            {zones.length === 0 ? (
              <EmptyState>{t("patrols.noZones")}</EmptyState>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {zones.map((z) => (
                  <li key={z.id} className="py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <span className="font-mono text-xs text-blue">{z.station.code}/{z.code}</span> <span className="font-semibold text-ink">{z.name}</span>
                        {!z.isActive ? <Badge className="ms-2">{t("common.inactive")}</Badge> : null}
                      </span>
                      <span className="text-xs text-slate">{t("zone.patrols", { n: z._count.patrols })}</span>
                    </div>
                    {z.description ? <p className="text-xs text-slate">{z.description}</p> : null}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs font-semibold text-blue">{t("zone.edit")}</summary>
                      <div className="mt-2 rounded-md border border-line bg-mist p-3">
                        <ZoneForm stations={stationOpts} zone={z} />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
            {stationOpts.length ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-blue">{t("zone.add")}</summary>
                <div className="mt-2 rounded-md border border-line bg-mist p-3">
                  <ZoneForm stations={stationOpts} />
                </div>
              </details>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}

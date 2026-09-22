import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canManageRegion, requirePermission } from "@/server/auth/dal";
import { getStation, localitiesOf, orgReferences, stationOfficersForSelect } from "@/server/org/queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { COMMUNE_TYPE, DEPARTMENT_TYPE, LOCALITY_TYPE, STATION_STATUS, STATION_TYPE, labelOf } from "@/lib/labels";
import { getLocale, getT } from "@/server/i18n";
import { DepartmentForm, StationForm } from "../../forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("station.col.station") };
}

export default async function StationPage({ params, searchParams }: PageProps<"/admin/organization/stations/[id]">) {
  const actor = await requirePermission("org:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let station;
  try {
    station = await getStation(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const canManageStation = actor.permissions.has("org:manage") && canManageRegion(actor, station.regionId);
  const canManageDepartments = actor.permissions.has("org:manage") && (canManageStation || (!!actor.stationIds && actor.stationIds.includes(id)));
  const [refs, officers, localities] = await Promise.all([canManageStation ? orgReferences(actor) : Promise.resolve(null), stationOfficersForSelect(id), localitiesOf(station.communeId)]);
  const ty = labelOf(STATION_TYPE, station.type, locale);
  const st = labelOf(STATION_STATUS, station.status, locale);
  const officerOpts = officers.map((o) => ({ id: o.id, label: `${o.rank.name} ${o.firstName} ${o.lastName} (${o.badgeNumber})` }));
  const terr = refs
    ? {
        regions: refs.regions.map((r) => ({ id: r.id, label: r.name })),
        adminDepartments: refs.adminDepartments.map((d) => ({ id: d.id, label: d.name, regionId: d.regionId })),
        communes: refs.communes.map((c) => ({ id: c.id, label: c.name, adminDepartmentId: c.adminDepartmentId })),
        stations: refs.stations.map((s) => ({ id: s.id, label: `${s.code} · ${s.name}`, regionId: s.regionId, type: s.type })),
      }
    : null;
  const resources: { key: Parameters<typeof t>[0]; value: number; href?: string; soon?: boolean }[] = [
    { key: "station.res.units", value: station._count.children },
    { key: "station.res.services", value: station.departments.length },
    { key: "station.res.officers", value: station._count.officers, href: `/officers?stationId=${station.id}` },
    { key: "station.res.users", value: station._count.users, href: actor.permissions.has("users:view") ? `/admin/users?stationId=${station.id}` : undefined },
    { key: "station.res.vehicles", value: station._count.vehicles, soon: true },
    { key: "station.res.complaints", value: station._count.complaints, href: actor.permissions.has("complaints:view") ? `/complaints?stationId=${station.id}` : undefined },
    { key: "station.res.cases", value: station._count.cases, href: actor.permissions.has("cases:view") ? `/cases?stationId=${station.id}` : undefined },
    { key: "station.res.incidents", value: station._count.incidents, href: actor.permissions.has("incidents:view") ? `/incidents?stationId=${station.id}` : undefined },
  ];
  return (
    <div>
      <PageHeader
        eyebrow={t("admin.eyebrow")}
        title={station.name}
        subtitle={`${station.code} · ${station.region.name}${station.city ? ` · ${station.city}` : ""}`}
        breadcrumbs={[
          { href: "/admin/organization", label: t("org.title") },
          { href: `/admin/organization/regions/${station.regionId}`, label: station.region.name },
          ...(station.parent ? [{ href: `/admin/organization/stations/${station.parent.id}`, label: station.parent.name }] : []),
          { label: station.code },
        ]}
        actions={
          <>
            <Badge tone={ty.tone}>{ty.label}</Badge>
            <Badge tone={st.tone}>{st.label}</Badge>
            {station.isDemo ? <Badge tone="warning">{t("terr.demo")}</Badge> : null}
            <Link href={`/officers?stationId=${station.id}`} className="text-sm font-semibold text-blue hover:underline">
              {t("station.officersLink")}
            </Link>
          </>
        }
      />
      {sp.created === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("station.createdAlert")}
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {resources.map((r) => (
          <div key={r.key} className="rounded-lg border border-line bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate">{t(r.key)}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
              {r.href ? (
                <Link href={r.href} className="text-blue hover:underline">
                  {r.value}
                </Link>
              ) : (
                r.value
              )}
            </p>
            {r.soon ? <p className="text-[11px] text-slate">{t("station.res.comingSoon")}</p> : null}
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t("station.settings")}>
          {canManageStation && terr ? (
            <StationForm station={station} refs={terr} commanders={officerOpts} localities={localities.map((l) => ({ id: l.id, label: `${l.name} (${labelOf(LOCALITY_TYPE, l.type, locale).label})` }))} />
          ) : (
            <DL
              items={[
                { label: t("station.type"), value: ty.label },
                { label: t("station.status"), value: st.label },
                { label: t("station.commander"), value: station.commander ? `${station.commander.rank.name} ${station.commander.firstName} ${station.commander.lastName}` : "—" },
                { label: t("station.address"), value: station.address ?? "—" },
                { label: t("station.city"), value: station.city ?? "—" },
                { label: t("station.phone"), value: station.phone ?? "—" },
                { label: t("station.email"), value: station.email ?? "—" },
              ]}
            />
          )}
        </Card>
        <div className="space-y-4">
          <Card title={t("station.territory")}>
            <DL
              cols={2}
              items={[
                { label: t("station.region"), value: <Link href={`/admin/organization/regions/${station.regionId}`} className="text-blue hover:underline">{station.region.name}</Link> },
                { label: t("station.adminDepartment"), value: station.adminDepartment ? <Link href={`/admin/organization/departments/${station.adminDepartment.id}`} className="text-blue hover:underline">{station.adminDepartment.name}</Link> : t("station.unset") },
                { label: t("station.commune"), value: station.commune ? `${station.commune.name} (${labelOf(COMMUNE_TYPE, station.commune.type, locale).label})` : t("station.unset") },
                { label: t("station.locality"), value: station.locality ? `${station.locality.name} (${labelOf(LOCALITY_TYPE, station.locality.type, locale).label})` : t("station.unset") },
                { label: t("station.parent"), value: station.parent ? <Link href={`/admin/organization/stations/${station.parent.id}`} className="text-blue hover:underline">{station.parent.name}</Link> : "—" },
              ]}
            />
          </Card>
          <Card title={t("station.children")} padded={false}>
            {station.children.length === 0 ? (
              <div className="p-5">
                <EmptyState>{t("station.noChildren")}</EmptyState>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>{t("station.col.station")}</th>
                    <th>{t("station.col.type")}</th>
                    <th>{t("station.status")}</th>
                    <th>{t("station.col.officers")}</th>
                  </tr>
                </thead>
                <tbody>
                  {station.children.map((c) => {
                    const cty = labelOf(STATION_TYPE, c.type, locale);
                    const cst = labelOf(STATION_STATUS, c.status, locale);
                    return (
                      <tr key={c.id}>
                        <td data-label={t("station.col.station")}>
                          <Link href={`/admin/organization/stations/${c.id}`} className="font-semibold text-blue hover:underline">
                            {c.name}
                          </Link>
                          <span className="block font-mono text-[11px] text-slate">{c.code}</span>
                        </td>
                        <td data-label={t("station.col.type")}>
                          <Badge tone={cty.tone}>{cty.label}</Badge>
                        </td>
                        <td data-label={t("station.status")}>
                          <Badge tone={cst.tone}>{cst.label}</Badge>
                        </td>
                        <td data-label={t("station.col.officers")}>{c._count.officers}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
            {canManageStation && terr && station.isActive ? (
              <div className="border-t border-line p-4">
                <details>
                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-navy">{t("station.newChild")}</summary>
                  <div className="mt-3">
                    <StationForm refs={terr} defaults={{ regionId: station.regionId, adminDepartmentId: station.adminDepartmentId ?? undefined, parentId: station.id, type: "POST" }} />
                  </div>
                </details>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
      <Card className="mt-4" title={t("station.departments")} padded={false}>
        {station.departments.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("station.noDepartments")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("dept.col.department")}</th>
                <th>{t("dept.type")}</th>
                <th>{t("dept.col.head")}</th>
                <th>{t("station.col.officers")}</th>
                <th>{t("org.col.state")}</th>
              </tr>
            </thead>
            <tbody>
              {station.departments.map((d) => {
                const dt = labelOf(DEPARTMENT_TYPE, d.type, locale);
                return (
                  <tr key={d.id}>
                    <td data-label={t("dept.col.department")}>
                      <span className="font-semibold text-ink">{d.name}</span>
                      <span className="block font-mono text-[11px] text-slate">{d.code}</span>
                      {canManageDepartments ? (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs font-semibold text-blue">{t("org.edit")}</summary>
                          <div className="mt-2 rounded-md border border-line bg-mist p-3 text-left">
                            <DepartmentForm stationId={station.id} department={d} heads={officerOpts} />
                          </div>
                        </details>
                      ) : null}
                    </td>
                    <td data-label={t("dept.type")}>
                      <Badge tone={dt.tone}>{dt.label}</Badge>
                    </td>
                    <td data-label={t("dept.col.head")} className="text-xs">
                      {d.head ? (
                        <Link href={`/officers/${d.head.id}`} className="text-blue hover:underline">
                          {d.head.firstName} {d.head.lastName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label={t("station.col.officers")}>{d._count.officers}</td>
                    <td data-label={t("org.col.state")}>{d.isActive ? <Badge tone="success">{t("common.active")}</Badge> : <Badge>{t("common.inactive")}</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {canManageDepartments && station.isActive ? (
          <div className="border-t border-line p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">{t("station.newDepartment")}</p>
            <DepartmentForm stationId={station.id} heads={officerOpts} />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

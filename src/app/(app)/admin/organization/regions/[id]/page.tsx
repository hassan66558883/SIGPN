import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canManageRegion, requirePermission } from "@/server/auth/dal";
import { getRegion, orgReferences } from "@/server/org/queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { STATION_STATUS, STATION_TYPE, labelOf } from "@/lib/labels";
import { getLocale, getT } from "@/server/i18n";
import { AdminDepartmentForm, RegionForm, StationForm } from "../../forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("org.col.region") };
}

export default async function RegionPage({ params, searchParams }: PageProps<"/admin/organization/regions/[id]">) {
  const actor = await requirePermission("org:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let region;
  try {
    region = await getRegion(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const canManage = actor.permissions.has("org:manage") && canManageRegion(actor, id);
  const refs = canManage ? await orgReferences(actor) : null;
  const terr = refs
    ? {
        regions: [{ id: region.id, label: region.name }],
        adminDepartments: refs.adminDepartments.filter((d) => d.regionId === region.id).map((d) => ({ id: d.id, label: d.name, regionId: d.regionId })),
        communes: refs.communes.map((c) => ({ id: c.id, label: c.name, adminDepartmentId: c.adminDepartmentId })),
        stations: refs.stations.filter((s) => s.regionId === region.id).map((s) => ({ id: s.id, label: `${s.code} · ${s.name}`, regionId: s.regionId, type: s.type })),
      }
    : null;
  return (
    <div>
      <PageHeader
        eyebrow={t("admin.eyebrow")}
        title={region.name}
        subtitle={`${region.code} · ${region.organization.name}${region.capital ? ` · ${t("terr.capital")} : ${region.capital}` : ""}`}
        breadcrumbs={[{ href: "/admin/organization", label: t("org.title") }, { label: region.name }]}
        actions={
          <>
            {region.isDemo ? <Badge tone="warning">{t("terr.demo")}</Badge> : <Badge tone="info">{t("terr.official")}</Badge>}
            {region.isActive ? <Badge tone="success">{t("common.active")}</Badge> : <Badge>{t("common.inactive")}</Badge>}
          </>
        }
      />
      {sp.created === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("region.createdAlert")}
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t("region.settings")}>
          {canManage ? <RegionForm region={region} /> : <DL cols={1} items={[{ label: t("org.code"), value: region.code }, { label: t("org.name"), value: region.name }, { label: t("region.capital"), value: region.capital ?? "—" }]} />}
        </Card>
        <Card className="lg:col-span-2" title={t("terr.departments")} padded={false}>
          {region.adminDepartments.length === 0 ? (
            <div className="p-5">
              <EmptyState>{t("terr.noDepartments")}</EmptyState>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t("terr.col.department")}</th>
                  <th>{t("terr.capital")}</th>
                  <th>{t("terr.col.communes")}</th>
                  <th>{t("org.col.stations")}</th>
                  <th>{t("org.col.state")}</th>
                </tr>
              </thead>
              <tbody>
                {region.adminDepartments.map((d) => (
                  <tr key={d.id}>
                    <td data-label={t("terr.col.department")}>
                      <Link href={`/admin/organization/departments/${d.id}`} className="font-semibold text-blue hover:underline">
                        {d.name}
                      </Link>
                      <span className="block font-mono text-[11px] text-slate">
                        {d.code}
                        {d.isDemo ? (
                          <Badge tone="warning" className="ms-1">
                            {t("terr.demo")}
                          </Badge>
                        ) : null}
                      </span>
                    </td>
                    <td data-label={t("terr.capital")}>{d.capital ?? "—"}</td>
                    <td data-label={t("terr.col.communes")}>{d._count.communes}</td>
                    <td data-label={t("org.col.stations")}>{d._count.stations}</td>
                    <td data-label={t("org.col.state")}>{d.isActive ? <Badge tone="success">{t("common.active")}</Badge> : <Badge>{t("common.inactive")}</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {canManage && region.isActive ? (
            <div className="border-t border-line p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">{t("terr.newDepartment")}</p>
              <AdminDepartmentForm regionId={region.id} />
            </div>
          ) : null}
        </Card>
      </div>
      <Card className="mt-4" title={t("region.stations")} padded={false}>
        {region.stations.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("region.noStations")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("station.col.station")}</th>
                <th>{t("station.col.type")}</th>
                <th>{t("station.status")}</th>
                <th>{t("station.adminDepartment")}</th>
                <th>{t("station.col.commander")}</th>
                <th>{t("station.res.units")}</th>
                <th>{t("station.col.officers")}</th>
              </tr>
            </thead>
            <tbody>
              {region.stations.map((s) => {
                const ty = labelOf(STATION_TYPE, s.type, locale);
                const st = labelOf(STATION_STATUS, s.status, locale);
                return (
                  <tr key={s.id} className={s.parentId ? "bg-mist/40" : undefined}>
                    <td data-label={t("station.col.station")}>
                      <Link href={`/admin/organization/stations/${s.id}`} className={`font-semibold text-blue hover:underline ${s.parentId ? "ps-4" : ""}`}>
                        {s.parentId ? "↳ " : ""}
                        {s.name}
                      </Link>
                      <span className={`block font-mono text-[11px] text-slate ${s.parentId ? "ps-4" : ""}`}>
                        {s.code}
                        {s.parent ? ` · ${s.parent.name}` : ""}
                        {s.isDemo ? (
                          <Badge tone="warning" className="ms-1">
                            {t("terr.demo")}
                          </Badge>
                        ) : null}
                      </span>
                    </td>
                    <td data-label={t("station.col.type")}>
                      <Badge tone={ty.tone}>{ty.label}</Badge>
                    </td>
                    <td data-label={t("station.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td data-label={t("station.adminDepartment")} className="text-xs">
                      {s.adminDepartment?.name ?? "—"}
                    </td>
                    <td data-label={t("station.col.commander")} className="text-xs">
                      {s.commander ? (
                        <Link href={`/officers/${s.commander.id}`} className="text-blue hover:underline">
                          {s.commander.firstName} {s.commander.lastName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label={t("station.res.units")}>{s._count.children}</td>
                    <td data-label={t("station.col.officers")}>{s._count.officers}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {canManage && terr && region.isActive ? (
          <div className="border-t border-line p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">{t("region.newStation")}</p>
            <StationForm refs={terr} defaults={{ regionId: region.id }} />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canManageRegion, requirePermission } from "@/server/auth/dal";
import { getAdminDepartment } from "@/server/org/queries";
import { prisma } from "@/server/db";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { COMMUNE_TYPE, LOCALITY_TYPE, STATION_STATUS, STATION_TYPE, labelOf } from "@/lib/labels";
import { getLocale, getT } from "@/server/i18n";
import { AdminDepartmentForm, CommuneForm, LocalityForm } from "../../forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("terr.department") };
}

export default async function AdminDepartmentPage({ params, searchParams }: PageProps<"/admin/organization/departments/[id]">) {
  const actor = await requirePermission("org:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let dep;
  try {
    dep = await getAdminDepartment(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const canManage = actor.permissions.has("org:manage") && canManageRegion(actor, dep.regionId);
  const localities = await prisma.locality.findMany({ where: { commune: { adminDepartmentId: id } }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true, communeId: true, isDemo: true } });
  return (
    <div>
      <PageHeader
        eyebrow={t("admin.eyebrow")}
        title={dep.name}
        subtitle={`${dep.code} · ${dep.region.name}${dep.capital ? ` · ${t("terr.capital")} : ${dep.capital}` : ""}`}
        breadcrumbs={[{ href: "/admin/organization", label: t("org.title") }, { href: `/admin/organization/regions/${dep.regionId}`, label: dep.region.name }, { label: dep.name }]}
        actions={
          <>
            {dep.isDemo ? <Badge tone="warning">{t("terr.demo")}</Badge> : <Badge tone="info">{t("terr.official")}</Badge>}
            {dep.isActive ? <Badge tone="success">{t("common.active")}</Badge> : <Badge>{t("common.inactive")}</Badge>}
          </>
        }
      />
      {sp.created === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("terr.deptCreatedAlert")}
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t("terr.deptSettings")}>
          {canManage ? <AdminDepartmentForm regionId={dep.regionId} department={dep} /> : <DL cols={1} items={[{ label: t("org.code"), value: dep.code }, { label: t("org.name"), value: dep.name }, { label: t("terr.capital"), value: dep.capital ?? "—" }]} />}
        </Card>
        <Card className="lg:col-span-2" title={t("terr.communes")} padded={false}>
          {dep.communes.length === 0 ? (
            <div className="p-5">
              <EmptyState>{t("terr.noCommunes")}</EmptyState>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t("terr.col.commune")}</th>
                  <th>{t("terr.col.type")}</th>
                  <th>{t("terr.col.localities")}</th>
                  <th>{t("org.col.stations")}</th>
                  <th>{t("org.col.state")}</th>
                </tr>
              </thead>
              <tbody>
                {dep.communes.map((c) => {
                  const ct = labelOf(COMMUNE_TYPE, c.type, locale);
                  const locs = localities.filter((l) => l.communeId === c.id);
                  return (
                    <tr key={c.id}>
                      <td data-label={t("terr.col.commune")}>
                        <span className="font-semibold text-ink">{c.name}</span>
                        <span className="block font-mono text-[11px] text-slate">
                          {c.code}
                          {c.isDemo ? (
                            <Badge tone="warning" className="ms-1">
                              {t("terr.demo")}
                            </Badge>
                          ) : null}
                        </span>
                        {canManage ? (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs font-semibold text-blue">{t("org.edit")}</summary>
                            <div className="mt-2 rounded-md border border-line bg-mist p-3 text-left">
                              <CommuneForm adminDepartmentId={dep.id} commune={c} />
                            </div>
                          </details>
                        ) : null}
                      </td>
                      <td data-label={t("terr.col.type")}>
                        <Badge tone={ct.tone}>{ct.label}</Badge>
                      </td>
                      <td data-label={t("terr.col.localities")}>
                        <details>
                          <summary className="cursor-pointer text-xs font-semibold text-blue">{locs.length}</summary>
                          <div className="mt-2 rounded-md border border-line bg-mist p-3 text-left text-xs">
                            {locs.length === 0 ? (
                              <p className="text-slate">{t("terr.noLocalities")}</p>
                            ) : (
                              <ul className="space-y-0.5">
                                {locs.map((l) => (
                                  <li key={l.id}>
                                    {l.name} <span className="text-slate">· {labelOf(LOCALITY_TYPE, l.type, locale).label}</span>
                                    {l.isDemo ? <Badge tone="warning" className="ms-1">{t("terr.demo")}</Badge> : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {canManage ? (
                              <div className="mt-3 border-t border-line pt-3">
                                <p className="mb-1 font-bold uppercase tracking-wide text-navy">{t("terr.newLocality")}</p>
                                <LocalityForm communeId={c.id} />
                              </div>
                            ) : null}
                          </div>
                        </details>
                      </td>
                      <td data-label={t("org.col.stations")}>{c._count.stations}</td>
                      <td data-label={t("org.col.state")}>{c.isActive ? <Badge tone="success">{t("common.active")}</Badge> : <Badge>{t("common.inactive")}</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          {canManage && dep.isActive ? (
            <div className="border-t border-line p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">{t("terr.newCommune")}</p>
              <CommuneForm adminDepartmentId={dep.id} />
            </div>
          ) : null}
        </Card>
      </div>
      <Card className="mt-4" title={t("terr.stationsOfDept")} padded={false}>
        {dep.stations.length === 0 ? (
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
                <th>{t("station.commune")}</th>
                <th>{t("station.res.units")}</th>
                <th>{t("station.col.officers")}</th>
              </tr>
            </thead>
            <tbody>
              {dep.stations.map((s) => {
                const ty = labelOf(STATION_TYPE, s.type, locale);
                const st = labelOf(STATION_STATUS, s.status, locale);
                return (
                  <tr key={s.id}>
                    <td data-label={t("station.col.station")}>
                      <Link href={`/admin/organization/stations/${s.id}`} className="font-semibold text-blue hover:underline">
                        {s.name}
                      </Link>
                      <span className="block font-mono text-[11px] text-slate">
                        {s.code}
                        {s.parent ? ` · ${s.parent.name}` : ""}
                      </span>
                    </td>
                    <td data-label={t("station.col.type")}>
                      <Badge tone={ty.tone}>{ty.label}</Badge>
                    </td>
                    <td data-label={t("station.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td data-label={t("station.commune")} className="text-xs">
                      {s.commune?.name ?? "—"}
                    </td>
                    <td data-label={t("station.res.units")}>{s._count.children}</td>
                    <td data-label={t("station.col.officers")}>{s._count.officers}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

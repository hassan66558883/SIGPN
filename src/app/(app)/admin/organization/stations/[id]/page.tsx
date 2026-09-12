import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getStation, orgReferences, stationOfficersForSelect } from "@/server/org/queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { DEPARTMENT_TYPE, STATION_TYPE, labelOf } from "@/lib/labels";
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
  const [refs, officers] = await Promise.all([orgReferences(actor), stationOfficersForSelect(id)]);
  const canManageStation = actor.permissions.has("org:manage") && (actor.scopeLevel === "NATIONAL" || (actor.scopeLevel === "REGIONAL" && actor.regionId === station.regionId));
  const canManageDepartments = actor.permissions.has("org:manage") && (canManageStation || (actor.scopeLevel === "STATION" && actor.stationId === id));
  const ty = labelOf(STATION_TYPE, station.type, locale);
  const officerOpts = officers.map((o) => ({ id: o.id, label: `${o.rank.name} ${o.firstName} ${o.lastName} (${o.badgeNumber})` }));
  return (
    <div>
      <PageHeader
        eyebrow={t("admin.eyebrow")}
        title={station.name}
        subtitle={`${station.code} · ${station.region.name}${station.city ? ` · ${station.city}` : ""}`}
        breadcrumbs={[{ href: "/admin/organization", label: t("org.title") }, { href: `/admin/organization/regions/${station.regionId}`, label: station.region.name }, { label: station.code }]}
        actions={
          <>
            <Badge tone={ty.tone}>{ty.label}</Badge>
            {station.isActive ? <Badge tone="success">{t("common.active")}</Badge> : <Badge>{t("common.inactive")}</Badge>}
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
      <p className="mb-4 text-sm text-slate">{t("station.summary", { departments: station.departments.length, officers: station._count.officers, users: station._count.users })}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("station.settings")}>
          {canManageStation ? (
            <StationForm station={station} regions={refs.regions.map((r) => ({ id: r.id, label: r.name }))} commanders={officerOpts} />
          ) : (
            <DL
              items={[
                { label: t("station.type"), value: ty.label },
                { label: t("station.commander"), value: station.commander ? `${station.commander.rank.name} ${station.commander.firstName} ${station.commander.lastName}` : "—" },
                { label: t("station.address"), value: station.address ?? "—" },
                { label: t("station.city"), value: station.city ?? "—" },
                { label: t("station.phone"), value: station.phone ?? "—" },
                { label: t("station.email"), value: station.email ?? "—" },
              ]}
            />
          )}
        </Card>
        <Card title={t("station.departments")} padded={false}>
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
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getRegion } from "@/server/org/queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { STATION_TYPE, labelOf } from "@/lib/labels";
import { getLocale, getT } from "@/server/i18n";
import { RegionForm, StationForm } from "../../forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("org.col.region") };
}

export default async function RegionPage({ params, searchParams }: PageProps<"/admin/organization/regions/[id]">) {
  const actor = await requirePermission("org:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  if (actor.scopeLevel !== "NATIONAL" && actor.regionId !== id) notFound();
  let region;
  try {
    region = await getRegion(id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const canManage = actor.permissions.has("org:manage") && (actor.scopeLevel === "NATIONAL" || actor.regionId === id);
  return (
    <div>
      <PageHeader
        eyebrow={t("admin.eyebrow")}
        title={region.name}
        subtitle={`${region.code} · ${region.organization.name}`}
        breadcrumbs={[{ href: "/admin/organization", label: t("org.title") }, { label: region.name }]}
        actions={region.isActive ? <Badge tone="success">{t("common.active")}</Badge> : <Badge>{t("common.inactive")}</Badge>}
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
        <Card className="lg:col-span-2" title={t("region.stations")} padded={false}>
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
                  <th>{t("station.col.commander")}</th>
                  <th>{t("station.col.departments")}</th>
                  <th>{t("station.col.officers")}</th>
                  <th>{t("org.col.state")}</th>
                </tr>
              </thead>
              <tbody>
                {region.stations.map((s) => {
                  const ty = labelOf(STATION_TYPE, s.type, locale);
                  return (
                    <tr key={s.id}>
                      <td data-label={t("station.col.station")}>
                        <Link href={`/admin/organization/stations/${s.id}`} className="font-semibold text-blue hover:underline">
                          {s.name}
                        </Link>
                        <span className="block font-mono text-[11px] text-slate">
                          {s.code}
                          {s.city ? ` · ${s.city}` : ""}
                        </span>
                      </td>
                      <td data-label={t("station.col.type")}>
                        <Badge tone={ty.tone}>{ty.label}</Badge>
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
                      <td data-label={t("station.col.departments")}>{s._count.departments}</td>
                      <td data-label={t("station.col.officers")}>{s._count.officers}</td>
                      <td data-label={t("org.col.state")}>{s.isActive ? <Badge tone="success">{t("common.active")}</Badge> : <Badge>{t("common.inactive")}</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          {canManage && region.isActive ? (
            <div className="border-t border-line p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">{t("region.newStation")}</p>
              <StationForm regions={[{ id: region.id, label: region.name }]} defaultRegionId={region.id} />
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { organizationOverview } from "@/server/org/queries";
import { listPositions } from "@/server/org/personnel";
import { Badge, Card, EmptyState, PageHeader, StatCard, Table, DL } from "@/components/ui";
import { RANK_CATEGORY, labelOf } from "@/lib/labels";
import { getLocale, getT } from "@/server/i18n";
import { OrganizationForm, RankForm, RegionForm } from "./forms";
import { PositionForm } from "../../officers/personnel-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("org.title") };
}

export default async function OrganizationPage() {
  const actor = await requirePermission("org:view");
  const [o, t, locale, positions] = await Promise.all([organizationOverview(actor), getT(), getLocale(), listPositions()]);
  const canManage = actor.permissions.has("org:manage");
  const national = actor.scopeLevel === "NATIONAL";
  return (
    <div>
      <PageHeader eyebrow={t("admin.eyebrow")} title={t("org.title")} subtitle={t("org.subtitle")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label={t("org.stat.regions")} value={o.regions.filter((r) => r.isActive).length} tone="violet" />
        <StatCard label={t("terr.departments")} value={o.totals.adminDepartments} tone="info" />
        <StatCard label={t("org.stat.stations")} value={o.totals.stations} tone="info" />
        <StatCard label={t("org.stat.departments")} value={o.totals.departments} tone="neutral" />
        <StatCard label={t("org.stat.officers")} value={o.totals.officers} tone="success" href="/officers" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title={t("org.orgCard")}>
          {o.org ? (
            canManage && national ? (
              <OrganizationForm org={o.org} />
            ) : (
              <DL cols={1} items={[{ label: t("org.code"), value: o.org.code }, { label: t("org.name"), value: o.org.name }, { label: t("org.shortName"), value: o.org.shortName ?? "—" }, { label: t("org.description"), value: o.org.description ?? "—" }]} />
            )
          ) : (
            <EmptyState>—</EmptyState>
          )}
        </Card>
        <Card className="lg:col-span-2" title={t("org.regions")} padded={false}>
          {o.regions.length === 0 ? (
            <div className="p-5">
              <EmptyState>{t("org.noRegions")}</EmptyState>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t("org.col.region")}</th>
                  <th>{t("org.col.capital")}</th>
                  <th>{t("terr.departments")}</th>
                  <th>{t("org.col.stations")}</th>
                  <th>{t("org.col.officers")}</th>
                  <th>{t("org.col.state")}</th>
                </tr>
              </thead>
              <tbody>
                {o.regions.map((r) => (
                  <tr key={r.id}>
                    <td data-label={t("org.col.region")}>
                      <Link href={`/admin/organization/regions/${r.id}`} className="font-semibold text-blue hover:underline">
                        {r.name}
                      </Link>
                      <span className="block font-mono text-[11px] text-slate">
                        {r.code}
                        {r.isDemo ? (
                          <Badge tone="warning" className="ms-1" title={t("terr.demoHint")}>
                            {t("terr.demo")}
                          </Badge>
                        ) : null}
                      </span>
                    </td>
                    <td data-label={t("org.col.capital")}>{r.capital ?? "—"}</td>
                    <td data-label={t("terr.departments")}>{r._count.adminDepartments}</td>
                    <td data-label={t("org.col.stations")}>{r.activeStations}</td>
                    <td data-label={t("org.col.officers")}>{r.officers}</td>
                    <td data-label={t("org.col.state")}>{r.isActive ? <Badge tone="success">{t("common.active")}</Badge> : <Badge>{t("common.inactive")}</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {canManage && national ? (
            <div className="border-t border-line p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">{t("org.newRegion")}</p>
              <RegionForm />
            </div>
          ) : null}
        </Card>
      </div>
      <Card className="mt-4" title={t("org.ranks")} padded={false}>
        {o.ranks.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("org.noRanks")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("org.col.rank")}</th>
                <th>{t("org.col.level")}</th>
                <th>{t("org.col.category")}</th>
                <th>{t("org.col.holders")}</th>
                <th>{t("org.col.state")}</th>
                {canManage && national ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {o.ranks.map((r) => {
                const cat = labelOf(RANK_CATEGORY, r.category, locale);
                return (
                  <tr key={r.id}>
                    <td data-label={t("org.col.rank")}>
                      <span className="font-semibold text-ink">{r.name}</span>
                      <span className="block font-mono text-[11px] text-slate">{r.code}</span>
                    </td>
                    <td data-label={t("org.col.level")}>{r.level}</td>
                    <td data-label={t("org.col.category")}>
                      <Badge tone={cat.tone}>{cat.label}</Badge>
                    </td>
                    <td data-label={t("org.col.holders")}>{r._count.officers}</td>
                    <td data-label={t("org.col.state")}>{r.isActive ? <Badge tone="success">{t("common.active")}</Badge> : <Badge>{t("common.inactive")}</Badge>}</td>
                    {canManage && national ? (
                      <td data-label="">
                        <details>
                          <summary className="cursor-pointer text-xs font-semibold text-blue">{t("org.edit")}</summary>
                          <div className="mt-2 rounded-md border border-line bg-mist p-3">
                            <RankForm rank={r} />
                          </div>
                        </details>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {canManage && national ? (
          <div className="border-t border-line p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">{t("org.newRank")}</p>
            <RankForm />
          </div>
        ) : null}
      </Card>
      <Card className="mt-4" title={t("pos.title")} padded={false}>
        {positions.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("pos.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("pos.col.position")}</th>
                <th>{t("pos.description")}</th>
                <th>{t("pos.col.holders")}</th>
                <th>{t("org.col.state")}</th>
                {canManage && national ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id}>
                  <td data-label={t("pos.col.position")}>
                    <span className="font-semibold text-ink">{p.name}</span>
                    <span className="block font-mono text-[11px] text-slate">{p.code}</span>
                  </td>
                  <td data-label={t("pos.description")} className="text-xs">
                    {p.description ?? "—"}
                  </td>
                  <td data-label={t("pos.col.holders")}>{p._count.officers}</td>
                  <td data-label={t("org.col.state")}>{p.isActive ? <Badge tone="success">{t("common.active")}</Badge> : <Badge>{t("common.inactive")}</Badge>}</td>
                  {canManage && national ? (
                    <td data-label="">
                      <details>
                        <summary className="cursor-pointer text-xs font-semibold text-blue">{t("org.edit")}</summary>
                        <div className="mt-2 rounded-md border border-line bg-mist p-3">
                          <PositionForm position={p} />
                        </div>
                      </details>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {canManage && national ? (
          <div className="border-t border-line p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">{t("pos.new")}</p>
            <PositionForm />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

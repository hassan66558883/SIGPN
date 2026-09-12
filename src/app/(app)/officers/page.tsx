import type { Metadata } from "next";
import Link from "next/link";
import type { DutyStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { listOfficers, orgReferences } from "@/server/org/queries";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { DUTY_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("officers.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function OfficersPage({ searchParams }: PageProps<"/officers">) {
  const actor = await requirePermission("officers:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), stationId: str(p.stationId), rankId: str(p.rankId), dutyStatus: str(p.dutyStatus) as DutyStatus | undefined, includeInactive: p.inactive === "1", page: Number(p.page ?? 1) || 1 };
  const [{ items, total, page, pageSize }, refs] = await Promise.all([listOfficers(actor, filter), orgReferences(actor)]);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/officers?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("nav.section.resources")} title={t("officers.title")} subtitle={t("officers.subtitle", { n: total })} actions={actor.permissions.has("officers:manage") ? <ButtonLink href="/officers/new">{t("officers.new")}</ButtonLink> : null} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("officers.searchPlaceholder")} className="input lg:col-span-2" aria-label={t("common.search")} />
          <Select name="stationId" defaultValue={filter.stationId ?? ""} placeholder={t("officers.allStations")} options={refs.stations.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))} aria-label={t("officers.allStations")} />
          <Select name="rankId" defaultValue={filter.rankId ?? ""} placeholder={t("officers.allRanks")} options={refs.ranks.map((r) => ({ value: r.id, label: r.name }))} aria-label={t("officers.allRanks")} />
          <Select name="dutyStatus" defaultValue={filter.dutyStatus ?? ""} placeholder={t("officers.allStatuses")} options={optionsOf(DUTY_STATUS, locale)} aria-label={t("officers.allStatuses")} />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-xs text-slate">
              <input type="checkbox" name="inactive" value="1" defaultChecked={filter.includeInactive} /> {t("officers.includeInactive")}
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
            <EmptyState>{t("officers.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("officers.col.officer")}</th>
                <th>{t("officers.col.rank")}</th>
                <th>{t("officers.col.posting")}</th>
                <th>{t("officers.col.status")}</th>
                <th>{t("officers.col.account")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => {
                const ds = labelOf(DUTY_STATUS, o.dutyStatus, locale);
                return (
                  <tr key={o.id} className={o.isActive ? undefined : "opacity-60"}>
                    <td data-label={t("officers.col.officer")}>
                      <Link href={`/officers/${o.id}`} className="font-semibold text-blue hover:underline">
                        {o.lastName}, {o.firstName}
                      </Link>
                      <span className="block font-mono text-[11px] text-slate">
                        {o.badgeNumber}
                        {o.phone ? ` · ${o.phone}` : ""}
                      </span>
                    </td>
                    <td data-label={t("officers.col.rank")}>{o.rank.name}</td>
                    <td data-label={t("officers.col.posting")} className="text-xs">
                      {o.station.name}
                      {o.department ? <span className="block text-slate">{o.department.name}</span> : null}
                    </td>
                    <td data-label={t("officers.col.status")}>
                      <Badge tone={ds.tone}>{ds.label}</Badge>
                      {!o.isActive ? <Badge className="ms-1">{t("officer.inactive")}</Badge> : null}
                    </td>
                    <td data-label={t("officers.col.account")} className="font-mono text-xs">
                      {o.user?.username ?? "—"}
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

import type { Metadata } from "next";
import Link from "next/link";
import type { AdministrativeStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { listCorps, listDossiers } from "@/server/hr/service";
import { ADMIN_STATUSES } from "@/server/hr/schemas";
import { orgReferences } from "@/server/org/queries";
import { Badge, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { ADMINISTRATIVE_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.dossiers.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function DossiersPage({ searchParams }: PageProps<"/hr/dossiers">) {
  const actor = await requirePermission("hr:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const status = ADMIN_STATUSES.find((s) => s === p.status) as AdministrativeStatus | undefined;
  const filter = { q: str(p.q), stationId: str(p.stationId), rankId: str(p.rankId), corpsId: str(p.corpsId), status, page: Number(p.page ?? 1) || 1 };
  const [{ items, total, page, pageSize }, refs, corps] = await Promise.all([listDossiers(actor, filter), orgReferences(actor), listCorps()]);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/hr/dossiers?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.dossiers.title")} subtitle={t("hr.dossiers.subtitle", { n: total })} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("officers.searchPlaceholder")} className="input lg:col-span-2" aria-label={t("common.search")} />
          <Select name="stationId" defaultValue={filter.stationId ?? ""} placeholder={t("officers.allStations")} options={refs.stations.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))} aria-label={t("officers.allStations")} />
          <Select name="rankId" defaultValue={filter.rankId ?? ""} placeholder={t("officers.allRanks")} options={refs.ranks.map((r) => ({ value: r.id, label: r.name }))} aria-label={t("officers.allRanks")} />
          <Select name="corpsId" defaultValue={filter.corpsId ?? ""} placeholder={t("hr.dossiers.allCorps")} options={corps.map((c) => ({ value: c.id, label: c.name }))} aria-label={t("hr.dossiers.allCorps")} />
          <div className="flex gap-2">
            <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("hr.dossiers.allStatuses")} options={optionsOf(ADMINISTRATIVE_STATUS, locale)} aria-label={t("hr.dossiers.allStatuses")} />
            <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
              {t("common.filter")}
            </button>
          </div>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("hr.dossiers.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("hr.col.agent")}</th>
                <th>{t("hr.col.rank")}</th>
                <th>{t("hr.col.function")}</th>
                <th>{t("hr.col.posting")}</th>
                <th>{t("hr.col.since")}</th>
                <th>{t("hr.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => {
                const st = labelOf(ADMINISTRATIVE_STATUS, o.administrativeStatus, locale);
                return (
                  <tr key={o.id}>
                    <td data-label={t("hr.col.agent")}>
                      <Link href={`/hr/dossiers/${o.id}`} className="font-semibold text-blue hover:underline">
                        {o.lastName}, {o.firstName}
                      </Link>
                      <span className="block font-mono text-[11px] text-slate">{o.badgeNumber}</span>
                    </td>
                    <td data-label={t("hr.col.rank")} className="text-xs">
                      {o.rank.name}
                      <span className="block text-slate">{o.corps?.name ?? "—"}</span>
                    </td>
                    <td data-label={t("hr.col.function")} className="text-xs">
                      {o.position?.name ?? "—"}
                    </td>
                    <td data-label={t("hr.col.posting")} className="text-xs">
                      {o.station.name}
                    </td>
                    <td data-label={t("hr.col.since")} className="text-xs">
                      {fmtDate(o.currentPostSince, locale)}
                    </td>
                    <td data-label={t("hr.col.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
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

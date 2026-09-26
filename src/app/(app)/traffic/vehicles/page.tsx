import type { Metadata } from "next";
import Link from "next/link";
import type { TrafficVehicleStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { listVehicles } from "@/server/traffic/queries";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { TRAFFIC_VEHICLE_STATUS, TRAFFIC_VEHICLE_TYPE, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.veh.listTitle") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function VehiclesPage({ searchParams }: PageProps<"/traffic/vehicles">) {
  const actor = await requirePermission("traffic:vehicles_view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status) as TrafficVehicleStatus | undefined, page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize } = await listVehicles(filter);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/traffic/vehicles?${s.toString()}`;
  };
  const now = new Date();
  return (
    <div>
      <PageHeader eyebrow={t("traffic.eyebrow")} title={t("traffic.veh.listTitle")} subtitle={t("traffic.veh.listSubtitle", { n: total })} actions={actor.permissions.has("traffic:vehicles_manage") ? <ButtonLink href="/traffic/vehicles/new">{t("traffic.veh.new")}</ButtonLink> : null} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("traffic.veh.searchPh")} className="input font-mono uppercase sm:col-span-2" aria-label={t("traffic.veh.plate")} autoFocus />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("traffic.veh.allStatuses")} options={optionsOf(TRAFFIC_VEHICLE_STATUS, locale)} aria-label={t("traffic.veh.status")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
            {t("common.search")}
          </button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("traffic.veh.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("traffic.veh.plate")}</th>
                <th>{t("traffic.veh.makeModel")}</th>
                <th>{t("traffic.veh.type")}</th>
                <th>{t("traffic.veh.owner")}</th>
                <th>{t("traffic.veh.insurance")}</th>
                <th>{t("traffic.veh.inspection")}</th>
                <th>{t("traffic.veh.status")}</th>
                <th className="text-end">{t("traffic.driver.controlsCount")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => {
                const st = labelOf(TRAFFIC_VEHICLE_STATUS, v.status, locale);
                const insExpired = v.insuranceExpiresAt && v.insuranceExpiresAt < now;
                const techExpired = v.technicalInspectionExpiresAt && v.technicalInspectionExpiresAt < now;
                return (
                  <tr key={v.id}>
                    <td data-label={t("traffic.veh.plate")}>
                      <Link href={`/traffic/vehicles/${v.id}`} className="font-mono font-bold text-blue hover:underline">
                        {v.plateNumber}
                      </Link>
                    </td>
                    <td data-label={t("traffic.veh.makeModel")} className="text-xs">
                      {[v.make, v.model].filter(Boolean).join(" ") || "—"}
                      <span className="block text-slate">{v.color ?? ""}</span>
                    </td>
                    <td data-label={t("traffic.veh.type")} className="text-xs">
                      {labelOf(TRAFFIC_VEHICLE_TYPE, v.vehicleType, locale).label}
                    </td>
                    <td data-label={t("traffic.veh.owner")} className="text-xs">
                      {v.owner ? `${v.owner.lastName} ${v.owner.firstName}` : "—"}
                    </td>
                    <td data-label={t("traffic.veh.insurance")} className={`text-xs ${insExpired ? "font-semibold text-danger" : ""}`}>
                      {v.insuranceExpiresAt ? fmtDate(v.insuranceExpiresAt, locale) : "—"}
                    </td>
                    <td data-label={t("traffic.veh.inspection")} className={`text-xs ${techExpired ? "font-semibold text-danger" : ""}`}>
                      {v.technicalInspectionExpiresAt ? fmtDate(v.technicalInspectionExpiresAt, locale) : "—"}
                    </td>
                    <td data-label={t("traffic.veh.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td data-label={t("traffic.driver.controlsCount")} className="text-end tabular-nums">
                      {v._count.controls}
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

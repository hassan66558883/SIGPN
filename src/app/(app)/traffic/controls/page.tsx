import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { listControls } from "@/server/traffic/queries";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { TRAFFIC_CONTROL_OUTCOME, TRAFFIC_FINE_STATUS, TRAFFIC_VEHICLE_TYPE, labelOf, optionsOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.controls.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);
const day = (v: string | undefined) => (v && !Number.isNaN(new Date(v).getTime()) ? new Date(v) : null);

export default async function ControlsPage({ searchParams }: PageProps<"/traffic/controls">) {
  const actor = await requirePermission("traffic:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), outcome: str(p.outcome) as "COMPLIANT" | "INFRACTION" | undefined, from: day(str(p.from)), to: day(str(p.to)), mine: str(p.mine) === "1", page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize } = await listControls(actor, filter);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/traffic/controls?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("traffic.eyebrow")} title={t("traffic.controls.title")} subtitle={t("traffic.controls.subtitle", { n: total })} actions={actor.permissions.has("traffic:control_create") ? <ButtonLink href="/traffic/controls/new">{t("traffic.controls.new")}</ButtonLink> : null} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("traffic.controls.searchPh")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="outcome" defaultValue={filter.outcome ?? ""} placeholder={t("traffic.controls.allOutcomes")} options={optionsOf(TRAFFIC_CONTROL_OUTCOME, locale)} aria-label={t("traffic.ctl.outcome")} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="mine" value="1" defaultChecked={filter.mine} /> {t("traffic.controls.mine")}
          </label>
          <input type="date" name="from" defaultValue={str(p.from) ?? ""} className="input" aria-label={t("traffic.filter.from")} />
          <input type="date" name="to" defaultValue={str(p.to) ?? ""} className="input" aria-label={t("traffic.filter.to")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white sm:col-start-4">
            {t("common.filter")}
          </button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("traffic.controls.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("traffic.col.control")}</th>
                <th>{t("traffic.ctl.location")}</th>
                <th>{t("traffic.col.vehicle")}</th>
                <th>{t("traffic.col.driver")}</th>
                <th>{t("traffic.col.officer")}</th>
                <th>{t("traffic.ctl.outcome")}</th>
                <th>{t("traffic.col.pv")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const o = labelOf(TRAFFIC_CONTROL_OUTCOME, c.outcome, locale);
                const fs = c.ticket?.fine ? labelOf(TRAFFIC_FINE_STATUS, c.ticket.fine.status, locale) : null;
                return (
                  <tr key={c.id}>
                    <td data-label={t("traffic.col.control")}>
                      <Link href={`/traffic/controls/${c.id}`} className="font-mono font-semibold text-blue hover:underline">
                        {c.number}
                      </Link>
                      <span className="block text-xs text-slate">{fmtDateTime(c.controlledAt, locale)}</span>
                    </td>
                    <td data-label={t("traffic.ctl.location")} className="text-xs">
                      {c.location}
                      <span className="block text-slate">{c.station.name}</span>
                    </td>
                    <td data-label={t("traffic.col.vehicle")} className="text-xs">
                      <span className="font-mono font-semibold">{c.plateNumber ?? "—"}</span>
                      <span className="block text-slate">{labelOf(TRAFFIC_VEHICLE_TYPE, c.vehicleType, locale).label}</span>
                    </td>
                    <td data-label={t("traffic.col.driver")} className="text-xs">
                      {c.driverPerson ? `${c.driverPerson.lastName} ${c.driverPerson.firstName}` : "—"}
                    </td>
                    <td data-label={t("traffic.col.officer")} className="text-xs">
                      {c.officer.firstName} {c.officer.lastName}
                    </td>
                    <td data-label={t("traffic.ctl.outcome")}>
                      <Badge tone={o.tone}>{o.label}</Badge>
                    </td>
                    <td data-label={t("traffic.col.pv")} className="text-xs">
                      {c.ticket ? (
                        <>
                          <Link href={`/traffic/tickets/${c.ticket.id}`} className="font-mono font-semibold text-blue hover:underline">
                            {c.ticket.number}
                          </Link>
                          <span className="block text-slate">{c.ticket.totalFineFcfa > 0 ? fmtFcfa(c.ticket.totalFineFcfa) : t("traffic.pv.noFlatFineShort")}</span>
                          {fs ? <Badge tone={fs.tone}>{fs.label}</Badge> : null}
                        </>
                      ) : (
                        "—"
                      )}
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

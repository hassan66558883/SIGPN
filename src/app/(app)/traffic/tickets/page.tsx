import type { Metadata } from "next";
import Link from "next/link";
import type { TrafficFineStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { listTickets } from "@/server/traffic/queries";
import { Badge, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { TRAFFIC_FINE_STATUS, TRAFFIC_TICKET_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.pv.listTitle") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);
const day = (v: string | undefined) => (v && !Number.isNaN(new Date(v).getTime()) ? new Date(v) : null);

export default async function TicketsPage({ searchParams }: PageProps<"/traffic/tickets">) {
  const actor = await requirePermission("traffic:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status) as "ISSUED" | "CANCELLED" | undefined, fineStatus: str(p.fineStatus) as TrafficFineStatus | undefined, from: day(str(p.from)), to: day(str(p.to)), page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize } = await listTickets(actor, filter);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/traffic/tickets?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("traffic.eyebrow")} title={t("traffic.pv.listTitle")} subtitle={t("traffic.pv.listSubtitle", { n: total })} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("traffic.pv.searchPh")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("traffic.pv.allStatuses")} options={optionsOf(TRAFFIC_TICKET_STATUS, locale)} aria-label={t("traffic.pv.status")} />
          <Select name="fineStatus" defaultValue={filter.fineStatus ?? ""} placeholder={t("traffic.fine.allStatuses")} options={optionsOf(TRAFFIC_FINE_STATUS, locale)} aria-label={t("traffic.fine.status")} />
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
            <EmptyState>{t("traffic.pv.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("traffic.col.pv")}</th>
                <th>{t("traffic.col.offence")}</th>
                <th>{t("traffic.col.vehicle")}</th>
                <th>{t("traffic.col.driver")}</th>
                <th>{t("traffic.col.station")}</th>
                <th className="text-end">{t("traffic.col.amount")}</th>
                <th>{t("traffic.col.fine")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => {
                const st = labelOf(TRAFFIC_TICKET_STATUS, x.status, locale);
                const fs = x.fine ? labelOf(TRAFFIC_FINE_STATUS, x.fine.status, locale) : null;
                return (
                  <tr key={x.id}>
                    <td data-label={t("traffic.col.pv")}>
                      <Link href={`/traffic/tickets/${x.id}`} className="font-mono font-semibold text-blue hover:underline">
                        {x.number}
                      </Link>
                      <span className="block text-xs text-slate">{fmtDateTime(x.issuedAt, locale)}</span>
                      {x.status === "CANCELLED" ? <Badge tone={st.tone}>{st.label}</Badge> : null}
                    </td>
                    <td data-label={t("traffic.col.offence")} className="max-w-xs text-xs">
                      {x.offences.map((o) => o.name).join(" ; ")}
                      {x.hasNonSettleableOffence ? <Badge tone="violet" className="ms-1">{t("traffic.class.delit")}</Badge> : null}
                    </td>
                    <td data-label={t("traffic.col.vehicle")} className="font-mono text-xs font-semibold">
                      {x.plateNumber ?? "—"}
                    </td>
                    <td data-label={t("traffic.col.driver")} className="text-xs">
                      {x.driverPerson ? `${x.driverPerson.lastName} ${x.driverPerson.firstName}` : "—"}
                    </td>
                    <td data-label={t("traffic.col.station")} className="text-xs">
                      {x.station.name}
                    </td>
                    <td data-label={t("traffic.col.amount")} className="text-end font-semibold tabular-nums">
                      {x.totalFineFcfa > 0 ? fmtFcfa(x.totalFineFcfa) : "—"}
                    </td>
                    <td data-label={t("traffic.col.fine")} className="text-xs">
                      {x.fine && fs ? (
                        <>
                          <Link href={`/traffic/fines/${x.fine.id}`} className="font-mono font-semibold text-blue hover:underline">
                            {x.fine.number}
                          </Link>
                          <span className="block">
                            <Badge tone={fs.tone}>{fs.label}</Badge>
                          </span>
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

import type { Metadata } from "next";
import Link from "next/link";
import type { TrafficFineStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { listFines } from "@/server/traffic/queries";
import { Badge, Card, EmptyState, PageHeader, Pagination, Select, StatCard, Table } from "@/components/ui";
import { TRAFFIC_FINE_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.fine.listTitle") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);
const day = (v: string | undefined) => (v && !Number.isNaN(new Date(v).getTime()) ? new Date(v) : null);

export default async function FinesPage({ searchParams }: PageProps<"/traffic/fines">) {
  const actor = await requirePermission("traffic:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status) as TrafficFineStatus | undefined, from: day(str(p.from)), to: day(str(p.to)), overdue: str(p.overdue) === "1", page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize, sumAmount, sumPaid } = await listFines(actor, filter);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/traffic/fines?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("traffic.eyebrow")} title={t("traffic.fine.listTitle")} subtitle={t("traffic.fine.listSubtitle", { n: total })} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label={t("traffic.fine.sumAmount")} value={<span className="text-2xl">{fmtFcfa(sumAmount)}</span>} tone="neutral" />
        <StatCard label={t("traffic.kpi.paid")} value={<span className="text-2xl">{fmtFcfa(sumPaid)}</span>} tone="success" />
        <StatCard label={t("traffic.kpi.remaining")} value={<span className="text-2xl">{fmtFcfa(Math.max(0, sumAmount - sumPaid))}</span>} tone="warning" />
      </div>
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("traffic.fine.searchPh")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("traffic.fine.allStatuses")} options={optionsOf(TRAFFIC_FINE_STATUS, locale)} aria-label={t("traffic.fine.status")} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="overdue" value="1" defaultChecked={filter.overdue} /> {t("traffic.fine.overdueOnly")}
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
            <EmptyState>{t("traffic.fine.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("traffic.col.fine")}</th>
                <th>{t("traffic.col.pv")}</th>
                <th>{t("traffic.col.driver")}</th>
                <th>{t("traffic.col.vehicle")}</th>
                <th className="text-end">{t("traffic.col.amount")}</th>
                <th className="text-end">{t("traffic.fine.paidCol")}</th>
                <th>{t("traffic.fine.status")}</th>
                <th>{t("traffic.fine.dueDate")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((f) => {
                const st = labelOf(TRAFFIC_FINE_STATUS, f.status, locale);
                const overdue = f.dueDate && f.dueDate < new Date() && (f.status === "TO_PAY" || f.status === "PARTIALLY_PAID");
                return (
                  <tr key={f.id}>
                    <td data-label={t("traffic.col.fine")}>
                      <Link href={`/traffic/fines/${f.id}`} className="font-mono font-semibold text-blue hover:underline">
                        {f.number}
                      </Link>
                      <span className="block text-xs text-slate">{fmtDate(f.issuedAt, locale)}</span>
                    </td>
                    <td data-label={t("traffic.col.pv")} className="font-mono text-xs">
                      <Link href={`/traffic/tickets/${f.ticket.id}`} className="text-blue hover:underline">
                        {f.ticket.number}
                      </Link>
                    </td>
                    <td data-label={t("traffic.col.driver")} className="text-xs">
                      {f.driverPerson ? `${f.driverPerson.lastName} ${f.driverPerson.firstName}` : "—"}
                    </td>
                    <td data-label={t("traffic.col.vehicle")} className="font-mono text-xs font-semibold">
                      {f.plateNumber ?? "—"}
                    </td>
                    <td data-label={t("traffic.col.amount")} className="text-end font-semibold tabular-nums">
                      {fmtFcfa(f.amountFcfa)}
                    </td>
                    <td data-label={t("traffic.fine.paidCol")} className="text-end tabular-nums">
                      {fmtFcfa(f.amountPaidFcfa)}
                    </td>
                    <td data-label={t("traffic.fine.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td data-label={t("traffic.fine.dueDate")} className={`text-xs ${overdue ? "font-semibold text-danger" : ""}`}>
                      {f.dueDate ? fmtDate(f.dueDate, locale) : "—"}
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

import type { Metadata } from "next";
import Link from "next/link";
import type { ComplaintStatus, OffenseCategory, Priority } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { complaintCounts, listComplaints } from "@/server/complaints/queries";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, StatCard, Table } from "@/components/ui";
import { COMPLAINT_STATUS, OFFENSE_CATEGORY, PRIORITY, labelOf, optionsOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("complaints.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function ComplaintsPage({ searchParams }: PageProps<"/complaints">) {
  const actor = await requirePermission("complaints:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status) as ComplaintStatus | undefined, category: str(p.category) as OffenseCategory | undefined, priority: str(p.priority) as Priority | undefined, stationId: str(p.stationId), mine: p.mine === "1", page: Number(p.page ?? 1) || 1 };
  const [{ items, total, page, pageSize }, counts] = await Promise.all([listComplaints(actor, filter), complaintCounts(actor)]);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/complaints?${s.toString()}`;
  };
  const kpi = (statuses: string[]) => statuses.reduce((n, s) => n + (counts[s] ?? 0), 0);
  return (
    <div>
      <PageHeader eyebrow={t("complaint.eyebrow")} title={t("complaints.title")} subtitle={t("complaints.subtitle", { n: total })} actions={actor.permissions.has("complaints:create") ? <ButtonLink href="/complaints/new">{t("complaints.new")}</ButtonLink> : null} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={labelOf(COMPLAINT_STATUS, "REGISTERED", locale).label} value={kpi(["REGISTERED"])} tone="info" href="/complaints?status=REGISTERED" />
        <StatCard label={labelOf(COMPLAINT_STATUS, "UNDER_REVIEW", locale).label} value={kpi(["UNDER_REVIEW"])} tone="warning" href="/complaints?status=UNDER_REVIEW" />
        <StatCard label={labelOf(COMPLAINT_STATUS, "ASSIGNED", locale).label} value={kpi(["ASSIGNED"])} tone="violet" href="/complaints?status=ASSIGNED" />
        <StatCard label={labelOf(COMPLAINT_STATUS, "CONVERTED", locale).label} value={kpi(["CONVERTED"])} tone="success" href="/complaints?status=CONVERTED" />
      </div>
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("complaints.searchPlaceholder")} className="input lg:col-span-2" aria-label={t("common.search")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("complaints.allStatuses")} options={optionsOf(COMPLAINT_STATUS, locale)} aria-label={t("complaints.col.status")} />
          <Select name="category" defaultValue={filter.category ?? ""} placeholder={t("complaints.allCategories")} options={optionsOf(OFFENSE_CATEGORY, locale)} aria-label={t("complaints.col.category")} />
          <Select name="priority" defaultValue={filter.priority ?? ""} placeholder={t("complaints.allPriorities")} options={optionsOf(PRIORITY, locale)} aria-label={t("complaints.col.priority")} />
          {filter.stationId ? <input type="hidden" name="stationId" value={filter.stationId} /> : null}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-xs text-slate">
              <input type="checkbox" name="mine" value="1" defaultChecked={filter.mine} /> {t("complaints.mine")}
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
            <EmptyState>{t("complaints.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("complaints.col.complaint")}</th>
                <th>{t("complaints.col.complainant")}</th>
                <th>{t("complaints.col.category")}</th>
                <th>{t("complaints.col.priority")}</th>
                <th>{t("complaints.col.status")}</th>
                <th>{t("complaints.col.station")}</th>
                <th>{t("complaints.col.assigned")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const st = labelOf(COMPLAINT_STATUS, c.status, locale);
                const cat = labelOf(OFFENSE_CATEGORY, c.category, locale);
                const pr = labelOf(PRIORITY, c.priority, locale);
                return (
                  <tr key={c.id}>
                    <td data-label={t("complaints.col.complaint")}>
                      <Link href={`/complaints/${c.id}`} className="font-semibold text-blue hover:underline">
                        {c.number}
                      </Link>
                      <span className="block text-xs text-ink">{c.title}</span>
                      <span className="block text-[11px] text-slate">{fmtDateTime(c.receivedAt, locale)}</span>
                    </td>
                    <td data-label={t("complaints.col.complainant")} className="text-xs">
                      {c.isAnonymous ? <Badge>{t("complaint.anonymous")}</Badge> : c.complainant ? <Link href={`/persons/${c.complainant.id}`} className="text-blue hover:underline">{c.complainant.lastName} {c.complainant.firstName}</Link> : "—"}
                    </td>
                    <td data-label={t("complaints.col.category")}>
                      <Badge tone={cat.tone}>{cat.label}</Badge>
                    </td>
                    <td data-label={t("complaints.col.priority")}>
                      <Badge tone={pr.tone}>{pr.label}</Badge>
                    </td>
                    <td data-label={t("complaints.col.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {c.case ? (
                        <Link href={`/cases/${c.case.id}`} className="block font-mono text-[11px] text-blue hover:underline">
                          {c.case.number}
                        </Link>
                      ) : null}
                    </td>
                    <td data-label={t("complaints.col.station")} className="text-xs">
                      {c.station.name}
                    </td>
                    <td data-label={t("complaints.col.assigned")} className="text-xs">
                      {c.assignedTo ? `${c.assignedTo.firstName} ${c.assignedTo.lastName}` : "—"}
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

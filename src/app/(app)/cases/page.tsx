import type { Metadata } from "next";
import Link from "next/link";
import type { CaseStatus, OffenseCategory, Priority } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { caseCounts, listCases } from "@/server/cases/queries";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, StatCard, Table } from "@/components/ui";
import { CASE_STATUS, OFFENSE_CATEGORY, PRIORITY, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cases.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function CasesPage({ searchParams }: PageProps<"/cases">) {
  const actor = await requirePermission("cases:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status) as CaseStatus | undefined, category: str(p.category) as OffenseCategory | undefined, priority: str(p.priority) as Priority | undefined, stationId: str(p.stationId), mine: p.mine === "1", page: Number(p.page ?? 1) || 1 };
  const [{ items, total, page, pageSize }, counts] = await Promise.all([listCases(actor, filter), caseCounts(actor)]);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/cases?${s.toString()}`;
  };
  const k = (s: string) => counts[s] ?? 0;
  return (
    <div>
      <PageHeader eyebrow={t("case.eyebrow")} title={t("cases.title")} subtitle={t("cases.subtitle", { n: total })} actions={actor.permissions.has("cases:create") ? <ButtonLink href="/cases/new">{t("cases.new")}</ButtonLink> : null} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={labelOf(CASE_STATUS, "OPEN", locale).label} value={k("OPEN") + k("ASSIGNED")} tone="info" href="/cases?status=OPEN" />
        <StatCard label={labelOf(CASE_STATUS, "UNDER_INVESTIGATION", locale).label} value={k("UNDER_INVESTIGATION")} tone="warning" href="/cases?status=UNDER_INVESTIGATION" />
        <StatCard label={labelOf(CASE_STATUS, "PENDING_REVIEW", locale).label} value={k("PENDING_REVIEW")} tone="violet" href="/cases?status=PENDING_REVIEW" />
        <StatCard label={labelOf(CASE_STATUS, "CLOSED", locale).label} value={k("CLOSED") + k("ARCHIVED")} tone="success" href="/cases?status=CLOSED" />
      </div>
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("cases.searchPlaceholder")} className="input lg:col-span-2" aria-label={t("common.search")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("cases.allStatuses")} options={optionsOf(CASE_STATUS, locale)} aria-label={t("case.status")} />
          <Select name="category" defaultValue={filter.category ?? ""} placeholder={t("complaints.allCategories")} options={optionsOf(OFFENSE_CATEGORY, locale)} aria-label={t("case.category")} />
          <Select name="priority" defaultValue={filter.priority ?? ""} placeholder={t("complaints.allPriorities")} options={optionsOf(PRIORITY, locale)} aria-label={t("case.priority")} />
          {filter.stationId ? <input type="hidden" name="stationId" value={filter.stationId} /> : null}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-xs text-slate">
              <input type="checkbox" name="mine" value="1" defaultChecked={filter.mine} /> {t("cases.mine")}
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
            <EmptyState>{t("cases.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("cases.col.case")}</th>
                <th>{t("case.category")}</th>
                <th>{t("case.priority")}</th>
                <th>{t("case.status")}</th>
                <th>{t("case.station")}</th>
                <th>{t("cases.col.lead")}</th>
                <th>{t("cases.col.parties")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const st = labelOf(CASE_STATUS, c.status, locale);
                const cat = labelOf(OFFENSE_CATEGORY, c.category, locale);
                const pr = labelOf(PRIORITY, c.priority, locale);
                return (
                  <tr key={c.id}>
                    <td data-label={t("cases.col.case")}>
                      <Link href={`/cases/${c.id}`} className="font-semibold text-blue hover:underline">
                        {c.number}
                      </Link>
                      {c.isSensitive ? (
                        <Badge tone="danger" className="ms-1">
                          {t("case.sensitive")}
                        </Badge>
                      ) : null}
                      <span className="block text-xs text-ink">{c.title}</span>
                      <span className="block text-[11px] text-slate">{fmtDate(c.reportedAt, locale)}</span>
                    </td>
                    <td data-label={t("case.category")}>
                      <Badge tone={cat.tone}>{cat.label}</Badge>
                    </td>
                    <td data-label={t("case.priority")}>
                      <Badge tone={pr.tone}>{pr.label}</Badge>
                    </td>
                    <td data-label={t("case.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td data-label={t("case.station")} className="text-xs">
                      {c.station.name}
                    </td>
                    <td data-label={t("cases.col.lead")} className="text-xs">
                      {c.lead ? `${c.lead.firstName} ${c.lead.lastName}` : "—"}
                    </td>
                    <td data-label={t("cases.col.parties")} className="text-xs">
                      {c._count.parties} · {c._count.tasks} {t("nav.tasks").toLowerCase().replace("mes ", "")}
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

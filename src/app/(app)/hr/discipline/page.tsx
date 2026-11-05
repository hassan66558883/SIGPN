import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { DISCIPLINE_STATUSES, listCases } from "@/server/hr/discipline";
import { Alert, Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { DISCIPLINE_STATUS, SANCTION_KIND, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { getRequestContext } from "@/server/request-context";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.dis.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function DisciplinePage({ searchParams }: PageProps<"/hr/discipline">) {
  const actor = await requirePermission("hr:discipline_view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const status = DISCIPLINE_STATUSES.find((s) => s === p.status);
  const { items, total, page, pageSize } = await listCases(actor, { q: str(p.q), status, page: Number(p.page ?? 1) || 1 }, await getRequestContext());
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/hr/discipline?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.dis.title")} subtitle={t("hr.dis.subtitle", { n: total })} actions={actor.permissions.has("hr:discipline_manage") ? <ButtonLink href="/hr/discipline/new">{t("hr.dis.new")}</ButtonLink> : null} />
      <Alert tone="warning" className="mb-4">
        {t("hr.dis.confidential")}
      </Alert>
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-3">
          <input name="q" defaultValue={str(p.q) ?? ""} placeholder={t("officers.searchPlaceholder")} className="input" aria-label={t("common.search")} />
          <Select name="status" defaultValue={status ?? ""} placeholder={t("hr.transfers.allStatuses")} options={optionsOf(DISCIPLINE_STATUS, locale)} aria-label={t("hr.transfers.allStatuses")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
            {t("common.filter")}
          </button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("hr.dis.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("hr.transfers.col.number")}</th>
                <th>{t("hr.transfers.col.officer")}</th>
                <th>{t("hr.dis.factsDate")}</th>
                <th>{t("hr.transfers.col.status")}</th>
                <th>{t("hr.dis.sanction")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const st = labelOf(DISCIPLINE_STATUS, c.status, locale);
                return (
                  <tr key={c.id}>
                    <td data-label={t("hr.transfers.col.number")} className="font-mono text-xs">
                      <Link href={`/hr/discipline/${c.id}`} className="font-semibold text-blue hover:underline">
                        {c.number}
                      </Link>
                    </td>
                    <td data-label={t("hr.transfers.col.officer")}>
                      {c.officer.lastName}, {c.officer.firstName}
                      <span className="block font-mono text-[11px] text-slate">{c.officer.badgeNumber}</span>
                    </td>
                    <td data-label={t("hr.dis.factsDate")} className="text-xs">
                      {fmtDate(c.factsDate, locale)}
                    </td>
                    <td data-label={t("hr.transfers.col.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td data-label={t("hr.dis.sanction")} className="text-xs">
                      {c.sanction ? labelOf(SANCTION_KIND, c.sanction, locale).label : "—"}
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

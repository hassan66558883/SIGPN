import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { listTransfers } from "@/server/hr/transfers";
import { TRANSFER_STATUSES } from "@/server/hr/transfer-schemas";
import { Alert, Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { TRANSFER_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.transfers.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function TransfersPage({ searchParams }: PageProps<"/hr/transfers">) {
  const actor = await requirePermission("hr:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const status = TRANSFER_STATUSES.find((s) => s === p.status);
  const filter = { q: str(p.q), status, page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize } = await listTransfers(actor, filter);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/hr/transfers?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.transfers.title")} subtitle={t("hr.transfers.subtitle", { n: total })} actions={actor.permissions.has("hr:transfer_propose") ? <ButtonLink href="/hr/transfers/new">{t("hr.transfers.new")}</ButtonLink> : null} />
      <Alert tone="info" className="mb-4">
        {t("hr.transfers.circuit")}
      </Alert>
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-3">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("officers.searchPlaceholder")} className="input" aria-label={t("common.search")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("hr.transfers.allStatuses")} options={optionsOf(TRANSFER_STATUS, locale)} aria-label={t("hr.transfers.allStatuses")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
            {t("common.filter")}
          </button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("hr.transfers.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("hr.transfers.col.number")}</th>
                <th>{t("hr.transfers.col.officer")}</th>
                <th>{t("hr.transfers.col.move")}</th>
                <th>{t("hr.transfers.col.date")}</th>
                <th>{t("hr.transfers.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => {
                const st = labelOf(TRANSFER_STATUS, x.status, locale);
                return (
                  <tr key={x.id}>
                    <td data-label={t("hr.transfers.col.number")} className="font-mono text-xs">
                      <Link href={`/hr/transfers/${x.id}`} className="font-semibold text-blue hover:underline">
                        {x.number}
                      </Link>
                      {x.decisionNumber ? <span className="block text-slate">{x.decisionNumber}</span> : null}
                    </td>
                    <td data-label={t("hr.transfers.col.officer")}>
                      {x.officer.lastName}, {x.officer.firstName}
                      <span className="block font-mono text-[11px] text-slate">{x.officer.badgeNumber}</span>
                    </td>
                    <td data-label={t("hr.transfers.col.move")} className="text-xs">
                      {x.fromStation.name} → {x.toStation.name}
                    </td>
                    <td data-label={t("hr.transfers.col.date")} className="text-xs">
                      {fmtDate(x.effectiveDate, locale)}
                    </td>
                    <td data-label={t("hr.transfers.col.status")}>
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

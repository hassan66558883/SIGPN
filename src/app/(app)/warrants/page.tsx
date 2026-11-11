import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { listWarrants } from "@/server/warrants/service";
import { ExportPdf } from "@/components/export-pdf";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { WARRANT_STATUS, WARRANT_TYPE, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("warrants.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function WarrantsPage({ searchParams }: PageProps<"/warrants">) {
  const actor = await requirePermission("warrants:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status), type: str(p.type), page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize } = await listWarrants(actor, filter);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/warrants?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("warrants.eyebrow")} title={t("warrants.title")} subtitle={t("warrants.subtitle", { n: total })} actions={<>{actor.permissions.has("warrants:create") ? <ButtonLink href="/warrants/new">{t("warrants.new")}</ButtonLink> : null}<ExportPdf show={actor.permissions.has("records:export_pdf")} module="warrants" params={p} t={t} /></>} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("warrants.search")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="type" defaultValue={filter.type ?? ""} placeholder={t("warrants.allTypes")} options={optionsOf(WARRANT_TYPE, locale)} aria-label={t("warrants.type")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("warrants.allStatuses")} options={optionsOf(WARRANT_STATUS, locale)} aria-label={t("warrants.status")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white sm:col-start-4">{t("common.filter")}</button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5"><EmptyState>{t("warrants.none")}</EmptyState></div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("warrants.title")}</th>
                <th>{t("warrants.type")}</th>
                <th>{t("warrants.person")}</th>
                <th>{t("warrants.authority")}</th>
                <th>{t("warrants.expiresAt")}</th>
                <th>{t("warrants.status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => {
                const st = labelOf(WARRANT_STATUS, w.status, locale);
                const ty = labelOf(WARRANT_TYPE, w.type, locale);
                return (
                  <tr key={w.id}>
                    <td data-label={t("warrants.title")}><Link href={`/warrants/${w.id}`} className="font-semibold text-blue hover:underline">{w.number}</Link></td>
                    <td data-label={t("warrants.type")}><Badge tone={ty.tone}>{ty.label}</Badge></td>
                    <td data-label={t("warrants.person")}>{w.person ? `${w.person.lastName} ${w.person.firstName}` : "—"}</td>
                    <td data-label={t("warrants.authority")} className="text-xs">{w.issuingAuthority}</td>
                    <td data-label={t("warrants.expiresAt")} className="text-xs">{w.expiresAt ? fmtDate(w.expiresAt, locale) : "—"}</td>
                    <td data-label={t("warrants.status")}><Badge tone={st.tone}>{st.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <div className="px-4 pb-3"><Pagination page={page} pageSize={pageSize} total={total} hrefFor={qs} t={t} /></div>
      </Card>
    </div>
  );
}

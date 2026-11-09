import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { listArrests } from "@/server/arrests/service";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { ARREST_AUTHORITY, ARREST_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("arrests.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function ArrestsPage({ searchParams }: PageProps<"/arrests">) {
  const actor = await requirePermission("arrests:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status), page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize } = await listArrests(actor, filter);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/arrests?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("arrests.eyebrow")} title={t("arrests.title")} subtitle={t("arrests.subtitle", { n: total })} actions={actor.permissions.has("arrests:create") ? <ButtonLink href="/arrests/new">{t("arrests.new")}</ButtonLink> : null} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("arrests.search")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("arrests.allStatuses")} options={optionsOf(ARREST_STATUS, locale)} aria-label={t("arrests.status")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">{t("common.filter")}</button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5"><EmptyState>{t("arrests.none")}</EmptyState></div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("arrests.title")}</th>
                <th>{t("arrests.person")}</th>
                <th>{t("arrests.arrestedAt")}</th>
                <th>{t("arrests.authority")}</th>
                <th>{t("arrests.station")}</th>
                <th>{t("arrests.status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const st = labelOf(ARREST_STATUS, a.status, locale);
                const au = labelOf(ARREST_AUTHORITY, a.authority, locale);
                return (
                  <tr key={a.id}>
                    <td data-label={t("arrests.title")}>
                      <Link href={`/arrests/${a.id}`} className="font-semibold text-blue hover:underline">{a.number}</Link>
                      <span className="block text-xs text-slate">{a.charges.slice(0, 70)}</span>
                    </td>
                    <td data-label={t("arrests.person")}>{a.person.lastName} {a.person.firstName}</td>
                    <td data-label={t("arrests.arrestedAt")} className="text-xs">{fmtDateTime(a.arrestedAt, locale)}</td>
                    <td data-label={t("arrests.authority")}><Badge tone={au.tone}>{au.label}</Badge></td>
                    <td data-label={t("arrests.station")} className="text-xs">{a.station.name}</td>
                    <td data-label={t("arrests.status")}><Badge tone={st.tone}>{st.label}</Badge></td>
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

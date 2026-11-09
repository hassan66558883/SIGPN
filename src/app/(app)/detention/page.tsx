import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { deadlineOf, listDetentions } from "@/server/detention/service";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { DETENTION_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("detention.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function DetentionPage({ searchParams }: PageProps<"/detention">) {
  const actor = await requirePermission("detention:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status), overdue: p.overdue === "1", page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize } = await listDetentions(actor, filter);
  const now = Date.now();
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/detention?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("detention.eyebrow")} title={t("detention.title")} subtitle={t("detention.subtitle", { n: total })} actions={actor.permissions.has("detention:manage") ? <ButtonLink href="/detention/new">{t("detention.new")}</ButtonLink> : null} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("detention.search")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("detention.allStatuses")} options={optionsOf(DETENTION_STATUS, locale)} aria-label={t("detention.status")} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="overdue" value="1" defaultChecked={filter.overdue} /> {t("detention.onlyOverdue")}
          </label>
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white sm:col-start-4">{t("common.filter")}</button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5"><EmptyState>{t("detention.none")}</EmptyState></div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("detention.title")}</th>
                <th>{t("detention.person")}</th>
                <th>{t("detention.cell")}</th>
                <th>{t("detention.deadline")}</th>
                <th>{t("detention.station")}</th>
                <th>{t("detention.status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => {
                const st = labelOf(DETENTION_STATUS, d.status, locale);
                const dl = deadlineOf(d);
                const late = d.status !== "ENDED" && dl.getTime() < now;
                return (
                  <tr key={d.id}>
                    <td data-label={t("detention.title")}><Link href={`/detention/${d.id}`} className="font-semibold text-blue hover:underline">{d.number}</Link></td>
                    <td data-label={t("detention.person")}>{d.person.lastName} {d.person.firstName}</td>
                    <td data-label={t("detention.cell")}>{d.cellNumber ?? "—"}</td>
                    <td data-label={t("detention.deadline")} className="text-xs">
                      {fmtDateTime(dl, locale)}
                      {late ? <Badge tone="danger" className="ms-1">{t("detention.overdue")}</Badge> : null}
                    </td>
                    <td data-label={t("detention.station")} className="text-xs">{d.station.name}</td>
                    <td data-label={t("detention.status")}><Badge tone={st.tone}>{st.label}</Badge></td>
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

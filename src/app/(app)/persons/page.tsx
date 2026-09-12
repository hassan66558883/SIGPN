import type { Metadata } from "next";
import Link from "next/link";
import type { Gender } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { listPersons } from "@/server/persons/queries";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { GENDER, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("persons.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function PersonsPage({ searchParams }: PageProps<"/persons">) {
  const actor = await requirePermission("persons:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), gender: str(p.gender) as Gender | undefined, includeMerged: p.merged === "1", page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize } = await listPersons(actor, filter);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/persons?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("person.eyebrow")} title={t("persons.title")} subtitle={t("persons.subtitle", { n: total })} actions={actor.permissions.has("persons:create") ? <ButtonLink href="/persons/new">{t("persons.new")}</ButtonLink> : null} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("persons.searchPlaceholder")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="gender" defaultValue={filter.gender ?? ""} placeholder={t("persons.allGenders")} options={optionsOf(GENDER, locale)} aria-label={t("person.gender")} />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-xs text-slate">
              <input type="checkbox" name="merged" value="1" defaultChecked={filter.includeMerged} /> {t("persons.includeMerged")}
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
            <EmptyState>{t("persons.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("persons.col.person")}</th>
                <th>{t("persons.col.birth")}</th>
                <th>{t("persons.col.contact")}</th>
                <th>{t("persons.col.registeredAt")}</th>
                <th>{t("persons.col.links")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id} className={x.mergedIntoId ? "opacity-60" : undefined}>
                  <td data-label={t("persons.col.person")}>
                    <Link href={`/persons/${x.id}`} className="font-semibold text-blue hover:underline">
                      {x.lastName}, {x.firstName}
                    </Link>
                    <span className="block font-mono text-[11px] text-slate">
                      {x.number} · {labelOf(GENDER, x.gender, locale).label}
                    </span>
                    {x.isDeceased ? <Badge className="mt-0.5">{t("persons.deceased")}</Badge> : null}
                    {x.mergedIntoId ? <Badge tone="warning" className="mt-0.5">{t("persons.merged")}</Badge> : null}
                  </td>
                  <td data-label={t("persons.col.birth")} className="text-xs">
                    {fmtDate(x.dateOfBirth, locale)}
                  </td>
                  <td data-label={t("persons.col.contact")} className="text-xs">
                    {x.phone ?? "—"}
                    {x.city ? <span className="block text-slate">{x.city}</span> : null}
                  </td>
                  <td data-label={t("persons.col.registeredAt")} className="text-xs">
                    {x.station?.name ?? "—"}
                  </td>
                  <td data-label={t("persons.col.links")} className="text-xs">
                    {x._count.caseParties} {t("nav.cases").toLowerCase()} · {x._count.complaints} {t("nav.complaints").toLowerCase()} · {x._count.identifiers} ID
                  </td>
                </tr>
              ))}
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

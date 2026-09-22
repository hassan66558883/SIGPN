import type { Metadata } from "next";
import Link from "next/link";
import type { DangerLevel, WantedStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { listWantedPersons } from "@/server/wanted/queries";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { DANGER_LEVEL, WANTED_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("wanted.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function WantedPage({ searchParams }: PageProps<"/wanted">) {
  const actor = await requirePermission("wanted:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status) as WantedStatus | undefined, dangerLevel: str(p.dangerLevel) as DangerLevel | undefined, page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize } = await listWantedPersons(actor, filter);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/wanted?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("wanted.eyebrow")} title={t("wanted.title")} subtitle={t("wanted.subtitle", { n: total })} actions={actor.permissions.has("wanted:create") ? <ButtonLink href="/wanted/new">{t("wanted.new")}</ButtonLink> : null} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("wanted.searchPlaceholder")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("wanted.allStatuses")} options={optionsOf(WANTED_STATUS, locale)} aria-label={t("wanted.status")} />
          <Select name="dangerLevel" defaultValue={filter.dangerLevel ?? ""} placeholder={t("wanted.allPriorities")} options={optionsOf(DANGER_LEVEL, locale)} aria-label={t("wanted.dangerLevel")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white sm:col-start-4">
            {t("common.filter")}
          </button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("wanted.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("wanted.col.person")}</th>
                <th>{t("wanted.col.offense")}</th>
                <th>{t("wanted.col.case")}</th>
                <th>{t("wanted.dangerLevel")}</th>
                <th>{t("wanted.status")}</th>
                <th>{t("wanted.col.lastSeen")}</th>
                <th>{t("wanted.col.added")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => {
                const st = labelOf(WANTED_STATUS, x.status, locale);
                const dl = labelOf(DANGER_LEVEL, x.dangerLevel, locale);
                return (
                  <tr key={x.id}>
                    <td data-label={t("wanted.col.person")}>
                      <Link href={`/wanted/${x.id}`} className="font-semibold text-blue hover:underline">
                        {x.person.lastName} {x.person.firstName}
                      </Link>
                      <span className="block text-xs text-slate">
                        {x.number} · {x.person.number}
                        {x.person.aliases[0] ? ` · « ${x.person.aliases[0].alias} »` : ""}
                      </span>
                    </td>
                    <td data-label={t("wanted.col.offense")} className="text-xs">
                      {x.offense}
                    </td>
                    <td data-label={t("wanted.col.case")} className="text-xs">
                      {x.case ? (
                        <Link href={`/cases/${x.case.id}`} className="text-blue hover:underline">
                          {x.case.number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label={t("wanted.dangerLevel")}>
                      <Badge tone={dl.tone}>{dl.label}</Badge>
                    </td>
                    <td data-label={t("wanted.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td data-label={t("wanted.col.lastSeen")} className="text-xs">
                      {x.lastSeenLocation ?? "—"}
                    </td>
                    <td data-label={t("wanted.col.added")} className="text-xs">
                      {fmtDate(x.issuedAt, locale)}
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

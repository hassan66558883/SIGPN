import type { Metadata } from "next";
import Link from "next/link";
import type { EvidenceCategory, EvidenceStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { listEvidence } from "@/server/evidence/queries";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { EVIDENCE_CATEGORY, EVIDENCE_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("evidence.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function EvidencePage({ searchParams }: PageProps<"/evidence">) {
  const actor = await requirePermission("evidence:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), category: str(p.category) as EvidenceCategory | undefined, status: str(p.status) as EvidenceStatus | undefined, page: Number(p.page ?? 1) || 1 };
  const { items, total, page, pageSize } = await listEvidence(actor, filter);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/evidence?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("evidence.eyebrow")} title={t("evidence.title")} subtitle={t("evidence.subtitle", { n: total })} actions={actor.permissions.has("evidence:create") ? <ButtonLink href="/evidence/new">{t("evidence.new")}</ButtonLink> : null} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("evidence.searchPlaceholder")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="category" defaultValue={filter.category ?? ""} placeholder={t("evidence.allCategories")} options={optionsOf(EVIDENCE_CATEGORY, locale)} aria-label={t("evidence.category")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("evidence.allStatuses")} options={optionsOf(EVIDENCE_STATUS, locale)} aria-label={t("evidence.status")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white sm:col-start-4">
            {t("common.filter")}
          </button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("evidence.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("evidence.col.evidence")}</th>
                <th>{t("evidence.col.category")}</th>
                <th>{t("evidence.col.case")}</th>
                <th>{t("evidence.col.status")}</th>
                <th>{t("evidence.col.location")}</th>
                <th>{t("evidence.col.files")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => {
                const st = labelOf(EVIDENCE_STATUS, x.status, locale);
                const cat = labelOf(EVIDENCE_CATEGORY, x.category, locale);
                return (
                  <tr key={x.id}>
                    <td data-label={t("evidence.col.evidence")}>
                      <Link href={`/evidence/${x.id}`} className="font-semibold text-blue hover:underline">
                        {x.number}
                      </Link>
                      <span className="block text-xs text-slate">{x.description.slice(0, 80)}</span>
                      {x.isSensitive ? <Badge tone="danger" className="mt-0.5">{t("case.sensitive")}</Badge> : null}
                    </td>
                    <td data-label={t("evidence.col.category")}>
                      <Badge tone={cat.tone}>{cat.label}</Badge>
                    </td>
                    <td data-label={t("evidence.col.case")} className="text-xs">
                      <Link href={`/cases/${x.case.id}`} className="text-blue hover:underline">
                        {x.case.number}
                      </Link>
                    </td>
                    <td data-label={t("evidence.col.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td data-label={t("evidence.col.location")} className="text-xs">
                      {x.currentLocation?.name ?? "—"}
                    </td>
                    <td data-label={t("evidence.col.files")} className="text-xs">
                      {x._count.documents}
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

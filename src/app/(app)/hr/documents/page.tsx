import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { DOC_KINDS, listDocuments } from "@/server/hr/documents";
import { Badge, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { HR_DOCUMENT_KIND, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { ServiceNoteForm, UploadForm } from "./documents-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.doc.title2") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function DocumentsPage({ searchParams }: PageProps<"/hr/documents">) {
  const actor = await requirePermission("hr:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const kind = DOC_KINDS.find((k) => k === p.kind);
  const { items, total, page, pageSize } = await listDocuments(actor, { q: str(p.q), kind, page: Number(p.page ?? 1) || 1 });
  const canIssue = actor.permissions.has("hr:document_issue");
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/hr/documents?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.doc.title2")} subtitle={t("hr.doc.subtitle", { n: total })} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-3">
          <input name="q" defaultValue={str(p.q) ?? ""} placeholder={t("officers.searchPlaceholder")} className="input" aria-label={t("common.search")} />
          <Select name="kind" defaultValue={kind ?? ""} placeholder={t("hr.tr.allKinds")} options={optionsOf(HR_DOCUMENT_KIND, locale)} aria-label={t("hr.tr.allKinds")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
            {t("common.filter")}
          </button>
        </form>
      </Card>
      <Card padded={false} className="mb-4">
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("hr.doc.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("hr.transfers.col.number")}</th>
                <th>{t("hr.doc.title")}</th>
                <th>{t("hr.transfers.col.officer")}</th>
                <th>{t("hr.leave.type")}</th>
                <th>{t("hr.doc.download")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id}>
                  <td data-label={t("hr.transfers.col.number")} className="font-mono text-xs">
                    {d.number}
                    <span className="block text-slate">{fmtDate(d.createdAt, locale)}</span>
                  </td>
                  <td data-label={t("hr.doc.title")}>
                    {d.title}
                    {d.confidential ? (
                      <Badge tone="danger" className="ms-1">
                        {t("hr.doc.confidentialBadge")}
                      </Badge>
                    ) : null}
                  </td>
                  <td data-label={t("hr.transfers.col.officer")} className="text-xs">
                    {d.officer ? (
                      <Link href={`/hr/dossiers/${d.officer.id}`} className="text-blue hover:underline">
                        {d.officer.lastName}, {d.officer.firstName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td data-label={t("hr.leave.type")} className="text-xs">
                    {labelOf(HR_DOCUMENT_KIND, d.kind, locale).label}
                  </td>
                  <td data-label={t("hr.doc.download")} className="space-x-2 text-xs">
                    {d.source === "GENERATED" ? (
                      <>
                        <a href={`/api/v1/hr/documents/${d.id}/file?format=pdf`} className="font-semibold text-blue hover:underline">
                          PDF
                        </a>
                        <a href={`/api/v1/hr/documents/${d.id}/file?format=docx`} className="font-semibold text-blue hover:underline">
                          Word
                        </a>
                      </>
                    ) : (
                      <a href={`/api/v1/hr/documents/${d.id}/file`} className="font-semibold text-blue hover:underline">
                        {d.fileName ?? t("hr.doc.download")}
                      </a>
                    )}
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
      {canIssue ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={t("hr.doc.newNote")}>
            <ServiceNoteForm />
          </Card>
          <Card title={t("hr.doc.upload")}>
            <p className="mb-3 text-xs text-slate">{t("hr.doc.uploadHint")}</p>
            <UploadForm canDiscipline={actor.permissions.has("hr:discipline_manage")} />
          </Card>
        </div>
      ) : null}
    </div>
  );
}

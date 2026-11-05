import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { TRAINING_KINDS, TRAINING_STATUSES, listSkills, listTrainings, trainingStats } from "@/server/hr/training";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, StatCard, Table } from "@/components/ui";
import { TRAINING_KIND, TRAINING_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { EvaluateTrainingForm, IssueCertificateForm } from "../attendance/attendance-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.tr.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function TrainingPage({ searchParams }: PageProps<"/hr/training">) {
  const actor = await requirePermission("hr:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const kind = TRAINING_KINDS.find((k) => k === p.kind);
  const status = TRAINING_STATUSES.find((k) => k === p.status);
  const expiring = p.expiring === "1" ? 90 : undefined;
  const canManage = actor.permissions.has("hr:training_manage");
  const [{ items, total, page, pageSize }, stats, skills] = await Promise.all([listTrainings(actor, { q: str(p.q), kind, status, expiringDays: expiring, page: Number(p.page ?? 1) || 1 }), trainingStats(actor), canManage ? listSkills() : Promise.resolve([])]);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/hr/training?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.tr.title")} subtitle={t("hr.tr.subtitle", { n: total })} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.byKind.map((k) => (
          <StatCard key={k.key} label={labelOf(TRAINING_KIND, k.key, locale).label} value={k.n} href={`/hr/training?kind=${k.key}`} />
        ))}
        <StatCard label={t("hr.tr.expiring")} value={stats.expiring} tone={stats.expiring ? "warning" : "neutral"} href="/hr/training?expiring=1" />
      </div>
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={str(p.q) ?? ""} placeholder={t("officers.searchPlaceholder")} className="input" aria-label={t("common.search")} />
          <Select name="kind" defaultValue={kind ?? ""} placeholder={t("hr.tr.allKinds")} options={optionsOf(TRAINING_KIND, locale)} aria-label={t("hr.tr.allKinds")} />
          <Select name="status" defaultValue={status ?? ""} placeholder={t("hr.transfers.allStatuses")} options={optionsOf(TRAINING_STATUS, locale)} aria-label={t("hr.transfers.allStatuses")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
            {t("common.filter")}
          </button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("training.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("hr.col.agent")}</th>
                <th>{t("training.name")}</th>
                <th>{t("hr.tr.kind")}</th>
                <th>{t("training.start")}</th>
                <th>{t("training.status")}</th>
                <th>{t("hr.tr.certificate")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => {
                const st = labelOf(TRAINING_STATUS, x.status, locale);
                return (
                  <tr key={x.id}>
                    <td data-label={t("hr.col.agent")}>
                      <Link href={`/hr/dossiers/${x.officer.id}`} className="font-semibold text-blue hover:underline">
                        {x.officer.lastName}, {x.officer.firstName}
                      </Link>
                      <span className="block font-mono text-[11px] text-slate">{x.officer.badgeNumber}</span>
                    </td>
                    <td data-label={t("training.name")}>
                      {x.title}
                      {x.provider ? <span className="block text-xs text-slate">{x.provider}</span> : null}
                    </td>
                    <td data-label={t("hr.tr.kind")} className="text-xs">
                      {labelOf(TRAINING_KIND, x.kind, locale).label}
                    </td>
                    <td data-label={t("training.start")} className="text-xs">
                      {fmtDate(x.startDate, locale)}
                      {x.expiresAt ? <span className="block text-slate">{t("hr.tr.expiresOn", { d: fmtDate(x.expiresAt, locale) })}</span> : null}
                    </td>
                    <td data-label={t("training.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {x.score != null ? <span className="ms-1 text-xs text-slate">{x.score}/20</span> : null}
                    </td>
                    <td data-label={t("hr.tr.certificate")} className="min-w-[200px]">
                      {x.certificateIssuedAt ? (
                        <a href={`/api/v1/hr/trainings/${x.id}/certificate`} className="font-mono text-xs text-blue hover:underline">
                          {x.certificateNo}
                        </a>
                      ) : canManage && x.status === "COMPLETED" && x.passed ? (
                        <IssueCertificateForm trainingId={x.id} />
                      ) : canManage && !x.evaluatedAt && x.status !== "CANCELLED" && x.startDate <= new Date() ? (
                        <details>
                          <summary className="cursor-pointer text-xs font-semibold text-blue">{t("hr.tr.evaluate")}</summary>
                          <div className="mt-2">
                            <EvaluateTrainingForm trainingId={x.id} skills={skills.map((s) => ({ value: s.id, label: s.name }))} />
                          </div>
                        </details>
                      ) : (
                        "—"
                      )}
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
      <p className="mt-3 text-xs text-slate">{t("hr.tr.createHint")}</p>
    </div>
  );
}

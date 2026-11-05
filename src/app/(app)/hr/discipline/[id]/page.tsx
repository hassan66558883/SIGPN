import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getCase } from "@/server/hr/discipline";
import { NotFoundError } from "@/server/errors";
import { getRequestContext } from "@/server/request-context";
import { Alert, Badge, Card, DL, PageHeader } from "@/components/ui";
import { DISCIPLINE_STATUS, DISCIPLINE_STEP, SANCTION_KIND, labelOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { IssueFromRecordForm } from "../../documents/documents-forms";
import { DecisionForm, StepForm } from "../discipline-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.dis.title") };
}

export default async function CasePage({ params }: PageProps<"/hr/discipline/[id]">) {
  const actor = await requirePermission("hr:discipline_view");
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  let c;
  try {
    c = await getCase(actor, id, await getRequestContext());
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const st = labelOf(DISCIPLINE_STATUS, c.status, locale);
  const open = c.status === "OPEN" || c.status === "IN_PROCEDURE";
  const canManage = actor.permissions.has("hr:discipline_manage");
  const canDecide = actor.permissions.has("hr:discipline_decide") && c.status === "IN_PROCEDURE" && c.openedById !== actor.id;
  const canIssue = actor.permissions.has("hr:document_issue") && !!c.sanction && (c.sanction === "NO_ACTION" || !!c.decisionNumber);
  return (
    <div>
      <PageHeader
        eyebrow={t("hr.section")}
        title={`${t("hr.dis.file")} ${c.number}`}
        subtitle={`${c.officer.rank.name} ${c.officer.firstName} ${c.officer.lastName} · ${c.officer.badgeNumber}`}
        breadcrumbs={[{ href: "/hr/discipline", label: t("hr.dis.title") }, { label: c.number }]}
        actions={<Badge tone={st.tone}>{st.label}</Badge>}
      />
      <Alert tone="warning" className="mb-4">
        {t("hr.dis.viewAudited")}
      </Alert>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("hr.dis.facts")}>
            <p className="whitespace-pre-wrap text-sm">{c.facts}</p>
            <p className="mt-2 text-xs text-slate">
              {t("hr.dis.factsDate")} : {fmtDate(c.factsDate, locale)} · {t("hr.dis.openedBy", { u: c.openedBy?.username ?? "—" })}
            </p>
          </Card>
          <Card title={t("hr.dis.procedure")}>
            {c.steps.length === 0 ? (
              <p className="text-sm text-slate">{t("hr.dis.noSteps")}</p>
            ) : (
              <ol className="space-y-3 text-sm">
                {c.steps.map((s) => (
                  <li key={s.id} className="border-s-2 border-line ps-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={labelOf(DISCIPLINE_STEP, s.kind, locale).tone}>{labelOf(DISCIPLINE_STEP, s.kind, locale).label}</Badge>
                      <span className="text-xs text-slate">{fmtDate(s.date, locale)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{s.note}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          {c.sanction ? (
            <Card title={t("hr.dis.decisionTitle")}>
              <DL
                items={[
                  { label: t("hr.dis.sanction"), value: labelOf(SANCTION_KIND, c.sanction, locale).label },
                  { label: t("hr.transfers.decision"), value: c.decisionNumber ?? "—" },
                  ...(c.sanction === "SUSPENSION" ? [{ label: t("hr.leave.period"), value: `${fmtDate(c.sanctionStart, locale)} → ${fmtDate(c.sanctionEnd, locale)}` }] : []),
                  { label: t("hr.dis.reason"), value: c.decisionReason ?? "—" },
                  { label: t("hr.dis.decidedBy"), value: c.decidedBy?.username ?? "—" },
                ]}
              />
              {canIssue ? (
                <div className="mt-3">
                  <IssueFromRecordForm kind="DISCIPLINARY_DOCUMENT" field="caseId" id={c.id} />
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>
        <div className="space-y-4">
          <Card title={t("hr.col.agent")}>
            <p className="text-sm">
              <Link href={`/hr/dossiers/${c.officer.id}`} className="font-semibold text-blue hover:underline">
                {c.officer.lastName}, {c.officer.firstName}
              </Link>
              <span className="block text-xs text-slate">{c.officer.station.name}</span>
            </p>
          </Card>
          {open && canManage ? (
            <Card title={t("hr.dis.addStep")}>
              <StepForm caseId={c.id} />
            </Card>
          ) : null}
          {canDecide ? (
            <Card title={t("hr.dis.decide")}>
              <DecisionForm caseId={c.id} hasHearing={c.steps.some((s) => s.kind === "HEARING")} />
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

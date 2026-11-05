import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { inScope, requirePermission } from "@/server/auth/dal";
import { getTransfer } from "@/server/hr/transfers";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, ButtonLink, Card, DL, PageHeader, Stepper } from "@/components/ui";
import { TRANSFER_ORIGIN, TRANSFER_STATUS, labelOf } from "@/lib/labels";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { CancelForm, DecisionForm, ExecuteForm } from "../transfer-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.transfers.detail") };
}

const STEP_OF: Record<string, number> = { PROPOSED: 1, HR_APPROVED: 2, APPROVED: 3, EXECUTED: 4, REJECTED: 0, CANCELLED: 0 };

export default async function TransferPage({ params, searchParams }: PageProps<"/hr/transfers/[id]">) {
  const actor = await requirePermission("hr:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let x;
  try {
    x = await getTransfer(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const st = labelOf(TRANSFER_STATUS, x.status, locale);
  const person = (u: { firstName: string; lastName: string } | null) => (u ? t("hr.transfers.by", { name: `${u.firstName} ${u.lastName}` }) : "");
  const covers = (s: { id: string; regionId: string }) => inScope(actor, { stationId: s.id, regionId: s.regionId });
  const canReview = x.status === "PROPOSED" && actor.permissions.has("hr:transfer_review") && x.proposedById !== actor.id;
  const canValidate = x.status === "HR_APPROVED" && actor.permissions.has("hr:transfer_validate") && x.proposedById !== actor.id && x.reviewedById !== actor.id && covers(x.fromStation) && covers(x.toStation);
  const canExecute = x.status === "APPROVED" && actor.permissions.has("hr:transfer_review") && x.effectiveDate.getTime() <= Date.now() + 86_400_000;
  const open = x.status === "PROPOSED" || x.status === "HR_APPROVED" || x.status === "APPROVED";
  const canCancel = open && (x.proposedById === actor.id || actor.permissions.has("hr:transfer_review"));
  const hasDecision = !!x.decisionNumber && (x.status === "APPROVED" || x.status === "EXECUTED");
  return (
    <div>
      <PageHeader
        eyebrow={t("hr.section")}
        title={`${t("hr.transfers.detail")} ${x.number}`}
        subtitle={`${x.officer.rank.name} ${x.officer.firstName} ${x.officer.lastName} · ${x.officer.badgeNumber}`}
        breadcrumbs={[{ href: "/hr/transfers", label: t("hr.transfers.title") }, { label: x.number }]}
        actions={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            {hasDecision ? (
              <ButtonLink href={`/api/v1/hr/transfers/${x.id}/decision`} variant="secondary" size="sm">
                {t("hr.transfers.downloadDecision")}
              </ButtonLink>
            ) : null}
          </>
        }
      />
      {sp.created === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("hr.transfers.created")}
        </Alert>
      ) : null}
      {STEP_OF[x.status] > 0 ? (
        <div className="mb-4">
          <Stepper
            current={STEP_OF[x.status] - (x.status === "EXECUTED" ? 0 : 0)}
            steps={[
              { key: "p", label: t("hr.transfers.step.propose") },
              { key: "r", label: t("hr.transfers.step.review") },
              { key: "v", label: t("hr.transfers.step.validate") },
              { key: "e", label: t("hr.transfers.step.execute") },
            ]}
          />
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("hr.transfers.detail")}>
            <DL
              items={[
                { label: t("hr.transfers.officer"), value: <Link href={`/hr/dossiers/${x.officer.id}`} className="text-blue hover:underline">{`${x.officer.firstName} ${x.officer.lastName}`}</Link> },
                { label: t("hr.transfers.effectiveDate"), value: fmtDate(x.effectiveDate, locale) },
                { label: t("hr.transfers.from"), value: `${x.fromStation.name}${x.fromDepartment ? ` / ${x.fromDepartment.name}` : ""} (${x.fromStation.region.name})` },
                { label: t("hr.transfers.to"), value: `${x.toStation.name}${x.toDepartment ? ` / ${x.toDepartment.name}` : ""} (${x.toStation.region.name})` },
                { label: t("hr.transfers.toPosition"), value: x.toPosition?.name ?? "—" },
                { label: t("hr.transfers.origin"), value: labelOf(TRANSFER_ORIGIN, x.origin, locale).label },
                { label: t("hr.transfers.reason"), value: x.reason },
                { label: t("hr.transfers.decision"), value: x.decisionNumber ?? t("hr.transfers.noDecision") },
              ]}
            />
          </Card>
          <Card title={t("hr.career.title")}>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="font-semibold">{t("hr.transfers.step.propose")}</span> {person(x.proposedBy)} · {fmtDateTime(x.createdAt, locale)}
              </li>
              {x.reviewedAt ? (
                <li>
                  <span className="font-semibold">{t("hr.transfers.step.review")}</span> {person(x.reviewedBy)} · {fmtDateTime(x.reviewedAt, locale)}
                  {x.reviewNote ? <span className="block text-slate">{x.reviewNote}</span> : null}
                </li>
              ) : null}
              {x.validatedAt ? (
                <li>
                  <span className="font-semibold">{t("hr.transfers.step.validate")}</span> {person(x.validatedBy)} · {fmtDateTime(x.validatedAt, locale)}
                  {x.validationNote ? <span className="block text-slate">{x.validationNote}</span> : null}
                </li>
              ) : null}
              {x.executedAt ? (
                <li>
                  <span className="font-semibold">{t("hr.transfers.step.execute")}</span> · {fmtDateTime(x.executedAt, locale)}
                </li>
              ) : null}
              {x.closeReason && (x.status === "CANCELLED" || x.status === "REJECTED") ? <li className="text-slate">{x.closeReason}</li> : null}
            </ul>
          </Card>
        </div>
        <div className="space-y-4">
          {canReview ? (
            <Card title={t("hr.transfers.reviewTitle")}>
              <DecisionForm id={x.id} kind="review" />
            </Card>
          ) : null}
          {canValidate ? (
            <Card title={t("hr.transfers.validateTitle")}>
              <p className="mb-3 text-xs text-slate">{t("hr.transfers.validateHint")}</p>
              <DecisionForm id={x.id} kind="validate" />
            </Card>
          ) : null}
          {canExecute ? (
            <Card title={t("hr.transfers.executeTitle")}>
              <p className="mb-3 text-xs text-slate">{t("hr.transfers.executeHint")}</p>
              <ExecuteForm id={x.id} />
            </Card>
          ) : null}
          {canCancel ? (
            <Card title={t("hr.transfers.cancelTitle")}>
              <CancelForm id={x.id} />
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

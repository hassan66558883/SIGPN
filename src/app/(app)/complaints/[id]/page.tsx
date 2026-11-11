import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getComplaint } from "@/server/complaints/service";
import { assignableInvestigators } from "@/server/complaints/queries";
import { NotFoundError } from "@/server/errors";
import { ExportPdf } from "@/components/export-pdf";
import { Alert, Badge, Card, DL, PageHeader, Stepper } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { registerComplaintAction } from "@/server/complaints/actions";
import { COMPLAINT_STATUS, OFFENSE_CATEGORY, PRIORITY, labelOf } from "@/lib/labels";
import { fmtDateTime, toInputDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { AssignForm, CloseForm, ComplaintForm, ConvertForm, ReviewForm } from "../complaint-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("complaints.col.complaint") };
}

const STEPS = ["DRAFT", "REGISTERED", "UNDER_REVIEW", "ASSIGNED", "CONVERTED"];

export default async function ComplaintPage({ params, searchParams }: PageProps<"/complaints/[id]">) {
  const actor = await requirePermission("complaints:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let c;
  try {
    c = await getComplaint(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const st = labelOf(COMPLAINT_STATUS, c.status, locale);
  const cat = labelOf(OFFENSE_CATEGORY, c.category, locale);
  const pr = labelOf(PRIORITY, c.priority, locale);
  const editable = ["DRAFT", "REGISTERED", "UNDER_REVIEW"].includes(c.status) && actor.permissions.has("complaints:update");
  const terminal = ["CONVERTED", "CLOSED", "REJECTED"].includes(c.status);
  const needsUsers = !terminal && (actor.permissions.has("complaints:assign") || actor.permissions.has("complaints:convert"));
  const users = needsUsers ? await assignableInvestigators(actor, c.stationId) : [];
  const userOpts = users.map((u) => ({ id: u.id, label: `${u.firstName} ${u.lastName} (${u.role.code}${u.station ? ` · ${u.station.code}` : ""})` }));
  const stepIndex = c.status === "CLOSED" || c.status === "REJECTED" ? -1 : STEPS.indexOf(c.status);
  return (
    <div>
      <PageHeader
        eyebrow={t("complaint.eyebrow")}
        title={c.title}
        subtitle={`${c.number} · ${c.station.name} · ${fmtDateTime(c.receivedAt, locale)}`}
        breadcrumbs={[{ href: "/complaints", label: t("complaints.title") }, { label: c.number }]}
        actions={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            <Badge tone={pr.tone}>{pr.label}</Badge>
            <Badge tone={cat.tone}>{cat.label}</Badge>
          <ExportPdf show={actor.permissions.has("records:export_pdf")} module="complaints" id={id} t={t} /></>
        }
      />
      {sp.created === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("complaint.createdAlert", { number: c.number })}
        </Alert>
      ) : null}
      {c.case ? (
        <Alert tone="success" className="mb-4">
          {t("complaint.convertedTo")}{" "}
          <Link href={`/cases/${c.case.id}`} className="font-semibold underline">
            {c.case.number}
          </Link>
        </Alert>
      ) : null}
      {stepIndex >= 0 ? (
        <div className="mb-5">
          <Stepper steps={[{ key: "d", label: t("complaint.stepper.draft") }, { key: "r", label: t("complaint.stepper.registered") }, { key: "v", label: t("complaint.stepper.review") }, { key: "a", label: t("complaint.stepper.assigned") }, { key: "c", label: t("complaint.stepper.converted") }]} current={stepIndex} />
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("complaint.facts")}>
            {editable ? (
              <ComplaintForm mode="edit" stations={[]} values={{ id: c.id, title: c.title, description: c.description, category: c.category, priority: c.priority, incidentAt: toInputDateTime(c.incidentAt), locationText: c.locationText, isAnonymous: c.isAnonymous, complainant: c.complainant ? { id: c.complainant.id, number: c.complainant.number, firstName: c.complainant.firstName, lastName: c.complainant.lastName, dateOfBirth: null, phone: c.complainant.phone } : null }} />
            ) : (
              <>
                {terminal ? <p className="mb-3 text-xs text-slate">{t("complaint.readOnly")}</p> : null}
                <DL
                  items={[
                    { label: t("complaint.complainant"), value: c.isAnonymous ? t("complaint.anonymous") : c.complainant ? <Link href={`/persons/${c.complainant.id}`} className="text-blue hover:underline">{c.complainant.lastName} {c.complainant.firstName} ({c.complainant.number})</Link> : "—" },
                    { label: t("complaint.incidentAt"), value: fmtDateTime(c.incidentAt, locale) },
                    { label: t("complaint.location"), value: c.locationText ?? "—" },
                    { label: t("complaint.createdBy"), value: `${c.createdBy.firstName} ${c.createdBy.lastName}` },
                  ]}
                />
                <p className="mt-4 whitespace-pre-wrap text-sm text-ink">{c.description}</p>
              </>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title={t("complaint.workflow")}>
            <DL
              cols={1}
              items={[
                { label: t("complaints.col.assigned"), value: c.assignedTo ? `${c.assignedTo.firstName} ${c.assignedTo.lastName}` : "—" },
                { label: t("complaint.reviewedBy"), value: c.reviewedBy ? `${c.reviewedBy.firstName} ${c.reviewedBy.lastName} · ${fmtDateTime(c.reviewedAt, locale)}` : "—" },
                ...(c.reviewNotes ? [{ label: t("complaint.reviewNotes"), value: c.reviewNotes }] : []),
                ...(c.closedAt ? [{ label: t("complaint.closedAt"), value: `${fmtDateTime(c.closedAt, locale)} — ${c.closureReason ?? ""}` }] : []),
              ]}
            />
            {c.status === "DRAFT" && actor.permissions.has("complaints:create") ? (
              <div className="mt-4 border-t border-line pt-3">
                <ActionButton action={registerComplaintAction} fields={{ id: c.id }} size="sm">
                  {t("complaint.registerDraft")}
                </ActionButton>
              </div>
            ) : null}
            {c.status === "REGISTERED" && actor.permissions.has("complaints:review") ? (
              <div className="mt-4 border-t border-line pt-3">
                <ReviewForm id={c.id} priority={c.priority} />
              </div>
            ) : null}
            {["REGISTERED", "UNDER_REVIEW", "ASSIGNED"].includes(c.status) && actor.permissions.has("complaints:assign") ? (
              <div className="mt-4 border-t border-line pt-3">
                <AssignForm id={c.id} users={userOpts} />
              </div>
            ) : null}
          </Card>
          {["UNDER_REVIEW", "ASSIGNED"].includes(c.status) && actor.permissions.has("complaints:convert") ? (
            <Card title={t("complaint.convert")}>
              <ConvertForm id={c.id} users={userOpts} defaultLeadId={c.assignedTo?.id} canSensitive={actor.permissions.has("cases:view_sensitive")} />
            </Card>
          ) : null}
          {["REGISTERED", "UNDER_REVIEW", "ASSIGNED"].includes(c.status) && actor.permissions.has("complaints:close") ? (
            <Card title={`${t("complaint.close")} / ${t("complaint.reject")}`}>
              <CloseForm id={c.id} />
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

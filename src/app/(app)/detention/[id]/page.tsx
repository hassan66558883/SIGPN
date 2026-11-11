import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { deadlineOf, getDetention } from "@/server/detention/service";
import { NotFoundError } from "@/server/errors";
import { ExportPdf } from "@/components/export-pdf";
import { Alert, Badge, Card, DL, EmptyState, PageHeader } from "@/components/ui";
import { DETENTION_END_REASON, DETENTION_LOG_TYPE, DETENTION_STATUS, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { EndForm, ExtendForm, LogForm } from "../detention-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("detention.title") };
}

export default async function DetentionDetailPage({ params, searchParams }: PageProps<"/detention/[id]">) {
  const actor = await requirePermission("detention:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let d;
  try {
    d = await getDetention(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const st = labelOf(DETENTION_STATUS, d.status, locale);
  const open = d.status !== "ENDED";
  const dl = deadlineOf(d);
  const hoursLeft = Math.round((dl.getTime() - Date.now()) / 3_600_000);
  const late = open && hoursLeft < 0;
  const canManage = actor.permissions.has("detention:manage") && open;
  const canExtend = actor.permissions.has("detention:extend") && open;
  return (
    <div>
      <PageHeader
        eyebrow={t("detention.eyebrow")}
        title={d.number}
        subtitle={`${d.station.name} · ${d.person.lastName} ${d.person.firstName}`}
        breadcrumbs={[{ href: "/detention", label: t("detention.title") }, { label: d.number }]}
        actions={<><Badge tone={st.tone}>{st.label}</Badge>{late ? <Badge tone="danger">{t("detention.overdue")}</Badge> : null}<ExportPdf show={actor.permissions.has("records:export_pdf")} module="detention" id={id} t={t} /></>}
      />
      {sp.created === "1" ? <Alert tone="success" className="mb-4">{t("detention.created", { number: d.number })}</Alert> : null}
      {late ? <Alert tone="danger" className="mb-4">{t("detention.overdue")} — {fmtDateTime(dl, locale)}</Alert> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("detention.title")}>
            <DL
              items={[
                { label: t("detention.person"), value: <Link href={`/persons/${d.person.id}`} className="text-blue hover:underline">{d.person.number} · {d.person.lastName} {d.person.firstName}</Link> },
                { label: t("detention.arrest"), value: actor.permissions.has("arrests:view") ? <Link href={`/arrests/${d.arrest.id}`} className="text-blue hover:underline">{d.arrest.number} — {d.arrest.charges.slice(0, 80)}</Link> : d.arrest.number },
                { label: t("detention.cell"), value: d.cellNumber ?? "—" },
                { label: t("detention.startedAt"), value: fmtDateTime(d.startedAt, locale) },
                { label: t("detention.deadline"), value: `${fmtDateTime(dl, locale)}${open && !late ? ` · ${t("detention.remaining", { h: hoursLeft })}` : ""}` },
                ...(d.extendedUntil ? [{ label: t("detention.extension"), value: `${d.extensionAuthority} — ${d.extensionReason}` }] : []),
                { label: t("detention.medical"), value: d.medicalNotes ?? "—" },
                ...(d.endedAt ? [{ label: t("detention.endedOn"), value: `${fmtDateTime(d.endedAt, locale)} · ${d.endReason ? labelOf(DETENTION_END_REASON, d.endReason, locale).label : ""} — ${d.endNotes ?? ""}` }] : []),
              ]}
            />
          </Card>
          <Card title={t("detention.log")}>
            {d.logs.length === 0 ? (
              <EmptyState>{t("detention.logNone")}</EmptyState>
            ) : (
              <ul className="space-y-2 text-sm">
                {d.logs.map((l) => {
                  const lt = labelOf(DETENTION_LOG_TYPE, l.type, locale);
                  return (
                    <li key={l.id} className="border-b border-line pb-2">
                      <Badge tone={lt.tone}>{lt.label}</Badge> <span className="text-xs text-slate">{fmtDateTime(l.occurredAt, locale)} · {l.recordedBy.firstName} {l.recordedBy.lastName}</span>
                      <p className="mt-1">{l.notes}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          {canManage ? <Card title={t("detention.logAdd")}><LogForm detentionId={d.id} /></Card> : null}
          {canExtend ? <Card title={t("detention.extend")}><ExtendForm detentionId={d.id} /></Card> : null}
          {canManage ? <Card title={t("detention.end")}><EndForm detentionId={d.id} /></Card> : null}
        </div>
      </div>
    </div>
  );
}

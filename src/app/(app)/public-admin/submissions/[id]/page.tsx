import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getSubmission } from "@/server/public/admin";
import { prisma } from "@/server/db";
import { NotFoundError } from "@/server/errors";
import { getRequestContext } from "@/server/request-context";
import { Alert, Badge, Card, DL, PageHeader } from "@/components/ui";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import type { MessageKey } from "@/lib/i18n";
import { ConvertForm, SubmissionForm } from "../../public-admin-forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("pa.title") };
}

export default async function SubmissionPage({ params }: PageProps<"/public-admin/submissions/[id]">) {
  const actor = await requirePermission("intake:view");
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  let s;
  try {
    s = await getSubmission(actor, id, await getRequestContext());
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const canManage = actor.permissions.has("intake:manage");
  const canConvert = canManage && actor.permissions.has("complaints:create") && s.kind !== "CONTACT" && !s.complaintId;
  const stations = canConvert ? await prisma.station.findMany({ where: { isActive: true, ...(actor.stationIds ? { id: { in: actor.stationIds } } : {}) }, orderBy: { name: "asc" }, take: 100, select: { id: true, code: true, name: true } }) : [];
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader eyebrow={t("nav.publicAdmin")} title={s.number} subtitle={`${t(`pub.kind.${s.kind}` as MessageKey)} · ${fmtDateTime(s.receivedAt, locale)}`} breadcrumbs={[{ href: "/public-admin", label: t("pa.title") }, { label: s.number }]} actions={<Badge tone="info">{t(`pub.status.${s.status}` as MessageKey)}</Badge>} />
      {s.complaintId ? <Alert tone="success">{t("pa.converted")}</Alert> : null}
      <Card title={s.subject}>
        <p className="whitespace-pre-line text-sm text-ink">{s.message}</p>
        <div className="mt-4">
          <DL cols={2} items={[{ label: t("pub.form.location"), value: s.locationText ?? "—" }, { label: t("pub.form.date"), value: s.occurredOn ? fmtDate(s.occurredOn, locale) : "—" }]} />
        </div>
      </Card>
      <Card title={t("pa.contact")}>
        {s.anonymous ? <p className="text-sm text-slate">{t("pa.anonymous")}</p> : <DL cols={3} items={[{ label: t("pub.form.name"), value: s.contactName ?? "—" }, { label: t("pub.form.phone"), value: s.contactPhone ?? "—" }, { label: t("pub.form.email"), value: s.contactEmail ?? "—" }]} />}
      </Card>
      {canManage ? <Card title={t("pa.status")}><SubmissionForm id={s.id} status={s.status} reply={s.publicReply} /></Card> : null}
      {canConvert ? <Card><ConvertForm id={s.id} defaultStation={s.stationId} stations={stations.map((x) => ({ id: x.id, label: `${x.code} · ${x.name}` }))} /></Card> : null}
    </div>
  );
}

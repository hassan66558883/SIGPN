import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getArrest } from "@/server/arrests/service";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, ButtonLink, Card, DL, EmptyState, PageHeader } from "@/components/ui";
import { ARREST_AUTHORITY, ARREST_STATUS, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { ArrestStatusForm } from "../arrest-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("arrests.title") };
}

const NEXT: Record<string, ("IN_CUSTODY" | "RELEASED" | "TRANSFERRED" | "CHARGED")[]> = {
  RECORDED: ["IN_CUSTODY", "RELEASED", "TRANSFERRED", "CHARGED"],
  IN_CUSTODY: ["RELEASED", "TRANSFERRED", "CHARGED"],
};

export default async function ArrestDetailPage({ params, searchParams }: PageProps<"/arrests/[id]">) {
  const actor = await requirePermission("arrests:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let a;
  try {
    a = await getArrest(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const st = labelOf(ARREST_STATUS, a.status, locale);
  const au = labelOf(ARREST_AUTHORITY, a.authority, locale);
  const canStartCustody = actor.permissions.has("detention:manage") && (a.status === "RECORDED" || a.status === "IN_CUSTODY") && a.detentions.every((d) => d.status === "ENDED");
  const allowed = actor.permissions.has("arrests:update") ? (NEXT[a.status] ?? []) : [];
  return (
    <div>
      <PageHeader
        eyebrow={t("arrests.eyebrow")}
        title={a.number}
        subtitle={`${a.station.name} · ${fmtDateTime(a.arrestedAt, locale)}`}
        breadcrumbs={[{ href: "/arrests", label: t("arrests.title") }, { label: a.number }]}
        actions={<><Badge tone={st.tone}>{st.label}</Badge><Badge tone={au.tone}>{au.label}</Badge></>}
      />
      {sp.created === "1" ? <Alert tone="success" className="mb-4">{t("arrests.created", { number: a.number })}</Alert> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("arrests.title")}>
            <DL
              items={[
                { label: t("arrests.person"), value: <Link href={`/persons/${a.person.id}`} className="text-blue hover:underline">{a.person.number} · {a.person.lastName} {a.person.firstName}</Link> },
                { label: t("arrests.charges"), value: a.charges },
                { label: t("arrests.location"), value: a.locationText },
                { label: t("arrests.circumstances"), value: a.circumstances ?? "—" },
                { label: t("arrests.officer"), value: `${a.arrestingOfficer.badgeNumber} · ${a.arrestingOfficer.lastName} ${a.arrestingOfficer.firstName}` },
                { label: t("arrests.rightsReadAt"), value: a.rightsReadAt ? fmtDateTime(a.rightsReadAt, locale) : "—" },
                { label: t("arrests.case"), value: a.case ? <Link href={`/cases/${a.case.id}`} className="text-blue hover:underline">{a.case.number} — {a.case.title}</Link> : t("arrests.noCase") },
                { label: t("arrests.warrant"), value: a.warrant && actor.permissions.has("warrants:view") ? <Link href={`/warrants/${a.warrant.id}`} className="text-blue hover:underline">{a.warrant.number}</Link> : (a.warrant?.number ?? "—") },
                { label: t("arrests.notes"), value: a.notes ? <span className="whitespace-pre-line">{a.notes}</span> : "—" },
                { label: t("arrests.recordedBy"), value: `${a.recordedBy.firstName} ${a.recordedBy.lastName}` },
              ]}
            />
          </Card>
          <Card title={t("arrests.detentions")} actions={canStartCustody ? <ButtonLink href={`/detention/new?arrestId=${a.id}`} size="sm">{t("detention.new")}</ButtonLink> : undefined}>
            {a.detentions.length === 0 ? (
              <EmptyState>{t("arrests.noDetentions")}</EmptyState>
            ) : (
              <ul className="space-y-1 text-sm">
                {a.detentions.map((d) => (
                  <li key={d.id}>{d.number} · {d.status} · {fmtDateTime(d.startedAt, locale)}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        {allowed.length > 0 ? (
          <Card title={t("arrests.update")}>
            <ArrestStatusForm arrestId={a.id} allowed={allowed} />
          </Card>
        ) : null}
      </div>
    </div>
  );
}

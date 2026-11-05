import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { careerHistory, getDossier, listCorps } from "@/server/hr/service";
import { MANUAL_CAREER_EVENTS } from "@/server/hr/schemas";
import { getRequestContext } from "@/server/request-context";
import { listPositions } from "@/server/org/personnel";
import { orgReferences } from "@/server/org/queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, ButtonLink, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { ADMINISTRATIVE_STATUS, CAREER_EVENT_TYPE, GENDER, MARITAL_STATUS, RANK_CATEGORY, labelOf } from "@/lib/labels";
import { fmtDate, toInputDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { CareerEventForm, DossierForm } from "../../hr-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.dossiers.title") };
}

export default async function DossierPage({ params }: PageProps<"/hr/dossiers/[id]">) {
  const actor = await requirePermission("hr:view");
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  let o;
  try {
    o = await getDossier(actor, id, await getRequestContext());
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const canManage = actor.permissions.has("hr:manage");
  const canCareer = actor.permissions.has("hr:career");
  const terminal = ["RETIRED", "CEASED", "DECEASED"].includes(o.administrativeStatus);
  const [history, corps, positions, refs] = await Promise.all([careerHistory(id), listCorps(), canCareer ? listPositions() : Promise.resolve([]), canCareer ? orgReferences(actor) : Promise.resolve(null)]);
  const st = labelOf(ADMINISTRATIVE_STATUS, o.administrativeStatus, locale);
  const change = (e: (typeof history)[number]) => {
    if (e.toRank) return `${e.fromRank ?? "—"} → ${e.toRank}`;
    if (e.toPosition) return `${e.fromPosition ?? "—"} → ${e.toPosition}`;
    if (e.toStation) return `${e.fromStation ?? "—"} → ${e.toStation}`;
    if (e.toStatus) return `${labelOf(ADMINISTRATIVE_STATUS, e.fromStatus, locale).label} → ${labelOf(ADMINISTRATIVE_STATUS, e.toStatus, locale).label}`;
    return "—";
  };
  return (
    <div>
      <PageHeader
        eyebrow={t("hr.section")}
        title={`${o.rank.name} ${o.firstName} ${o.lastName}`}
        subtitle={`${o.badgeNumber} · ${o.station.name} · ${o.station.region.name}`}
        breadcrumbs={[{ href: "/hr/dossiers", label: t("hr.dossiers.title") }, { label: o.badgeNumber }]}
        actions={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            {actor.permissions.has("officers:view") ? (
              <ButtonLink href={`/officers/${o.id}`} variant="secondary" size="sm">
                {t("hr.dossier.openOfficer")}
              </ButtonLink>
            ) : null}
          </>
        }
      />
      <Alert tone="info" className="mb-4">
        {t("hr.dossier.viewAudited")}
      </Alert>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("hr.dossier.identity")}>
            {canManage ? (
              <DossierForm
                corps={corps.map((c) => ({ value: c.id, label: c.name }))}
                values={{
                  officerId: o.id,
                  firstName: o.firstName,
                  lastName: o.lastName,
                  gender: o.gender,
                  dateOfBirth: toInputDate(o.dateOfBirth),
                  birthPlace: o.birthPlace ?? "",
                  maritalStatus: o.maritalStatus ?? "",
                  phone: o.phone ?? "",
                  email: o.email ?? "",
                  corpsId: o.corpsId ?? "",
                  hiredAt: toInputDate(o.hiredAt),
                  serviceStartDate: toInputDate(o.serviceStartDate),
                  specialties: o.specialties ?? "",
                  notes: o.notes ?? "",
                }}
              />
            ) : (
              <DL
                items={[
                  { label: t("hr.dossier.gender"), value: labelOf(GENDER, o.gender, locale).label },
                  { label: t("hr.dossier.dateOfBirth"), value: fmtDate(o.dateOfBirth, locale) },
                  { label: t("hr.dossier.birthPlace"), value: o.birthPlace ?? "—" },
                  { label: t("hr.dossier.maritalStatus"), value: o.maritalStatus ? labelOf(MARITAL_STATUS, o.maritalStatus, locale).label : "—" },
                  { label: t("hr.dossier.corps"), value: o.corps?.name ?? "—" },
                  { label: t("hr.dossier.hiredAt"), value: fmtDate(o.hiredAt, locale) },
                  { label: t("hr.dossier.serviceStart"), value: fmtDate(o.serviceStartDate, locale) },
                ]}
              />
            )}
            <p className="mt-3 text-xs text-slate">{t("hr.dossier.photoLater")}</p>
          </Card>
          <Card title={t("hr.career.title")} padded={false}>
            {history.length === 0 ? (
              <div className="p-5">
                <EmptyState>{t("hr.career.none")}</EmptyState>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>{t("hr.career.col.date")}</th>
                    <th>{t("hr.career.col.type")}</th>
                    <th>{t("hr.career.col.change")}</th>
                    <th>{t("hr.career.col.ref")}</th>
                    <th>{t("hr.career.col.by")}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((e) => {
                    const l = labelOf(CAREER_EVENT_TYPE, e.type, locale);
                    return (
                      <tr key={e.id}>
                        <td data-label={t("hr.career.col.date")} className="text-xs">
                          {fmtDate(e.effectiveDate, locale)}
                        </td>
                        <td data-label={t("hr.career.col.type")}>
                          <Badge tone={l.tone}>{l.label}</Badge>
                        </td>
                        <td data-label={t("hr.career.col.change")} className="text-xs">
                          {change(e)}
                          {e.reason ? <span className="block text-slate">{e.reason}</span> : null}
                        </td>
                        <td data-label={t("hr.career.col.ref")} className="font-mono text-xs">
                          {e.reference}
                        </td>
                        <td data-label={t("hr.career.col.by")} className="text-xs">
                          {e.recordedBy?.username ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title={t("hr.dossier.status")}>
            <DL
              cols={1}
              items={[
                { label: t("hr.dossier.status"), value: <Badge tone={st.tone}>{st.label}</Badge> },
                { label: t("hr.col.rank"), value: o.rank.name },
                { label: t("hr.dossier.category"), value: labelOf(RANK_CATEGORY, o.rank.category, locale).label },
                { label: t("hr.col.function"), value: o.position?.name ?? "—" },
                { label: t("hr.col.posting"), value: o.station.name },
                { label: t("hr.dossier.currentPostSince"), value: fmtDate(o.currentPostSince, locale) },
              ]}
            />
          </Card>
          {canCareer ? (
            <Card title={t("hr.career.record")}>
              {terminal ? (
                <Alert tone="warning">{t("hr.career.terminal")}</Alert>
              ) : (
                <>
                  <CareerEventForm officerId={o.id} types={[...MANUAL_CAREER_EVENTS]} ranks={(refs?.ranks ?? []).map((r) => ({ value: r.id, label: r.name }))} positions={positions.filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name }))} />
                  <p className="mt-3 text-xs text-slate">{t("hr.career.transferNote")}</p>
                </>
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

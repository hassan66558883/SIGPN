import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { listHomonyms, viewWantedPerson } from "@/server/wanted/service";
import { getRequestContext } from "@/server/request-context";
import { prisma } from "@/server/db";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, ButtonLink, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { DANGER_LEVEL, GENDER, IDENTIFIER_TYPE, WANTED_KIND, WANTED_STATUS, labelOf } from "@/lib/labels";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { PhotoForm, SightingForm, VehicleForm, WantedPublicForm, WantedStatusForm, WantedVerifyForm, WarrantForm, WarrantStatusForm } from "../wanted-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("wanted.detail") };
}

/** Mirrors the service: a DRAFT leaves through verification, not through a status change. */
const WANTED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["CANCELLED"],
  PENDING_APPROVAL: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["LOCATED", "ARRESTED", "SUSPENDED", "CANCELLED", "EXPIRED"],
  LOCATED: ["ARRESTED", "ACTIVE", "SUSPENDED", "CANCELLED", "EXPIRED"],
  SUSPENDED: ["ACTIVE", "CANCELLED", "EXPIRED"],
  ARRESTED: [],
  CANCELLED: [],
  EXPIRED: ["ACTIVE"],
};
const WARRANT_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING_APPROVAL", "ACTIVE", "CANCELLED"],
  PENDING_APPROVAL: ["ACTIVE", "REJECTED", "CANCELLED"],
  ACTIVE: ["EXECUTED", "EXPIRED", "CANCELLED"],
  EXECUTED: [],
  EXPIRED: [],
  CANCELLED: [],
  REJECTED: [],
};

export default async function WantedDetailPage({ params, searchParams }: PageProps<"/wanted/[id]">) {
  const actor = await requirePermission("wanted:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let w;
  try {
    w = await viewWantedPerson(actor, id, await getRequestContext());
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const homonyms = await listHomonyms(actor, w.id);
  const audit = actor.permissions.has("audit:view") ? await prisma.auditLog.findMany({ where: { entityType: { in: ["WantedPerson", "Warrant"] }, entityId: { in: [w.id, w.warrantId ?? "__none__"] } }, orderBy: { at: "desc" }, take: 50 }) : [];
  const st = labelOf(WANTED_STATUS, w.status, locale);
  const dl = labelOf(DANGER_LEVEL, w.dangerLevel, locale);
  const readOnly = w.status === "ARRESTED" || w.status === "CANCELLED";
  const canWrite = actor.permissions.has("wanted:update") && !readOnly;
  const nextStatuses = WANTED_TRANSITIONS[w.status] ?? [];
  const nextWarrantStatuses = w.warrant ? WARRANT_TRANSITIONS[w.warrant.status] ?? [] : [];
  const mainPhotoUrl = w.mainPhoto?.versions[0] ? `/api/v1/documents/${w.mainPhoto.id}/download` : null;

  return (
    <div>
      <PageHeader
        eyebrow={t("wanted.eyebrow")}
        title={`${w.person.lastName} ${w.person.firstName}`}
        subtitle={`${w.number} · ${w.station.name} · ${fmtDate(w.issuedAt, locale)}`}
        breadcrumbs={[{ href: "/wanted", label: t("wanted.title") }, { label: w.number }]}
        actions={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            <Badge tone={labelOf(WANTED_KIND, w.kind, locale).tone}>{labelOf(WANTED_KIND, w.kind, locale).label}</Badge>
            <Badge tone={dl.tone}>{dl.label}</Badge>
            {actor.permissions.has("wanted:publish") ? (
              <ButtonLink href={`/wanted/${w.id}/notice`} variant="ghost" size="sm">
                {t("wanted.generateNotice")}
              </ButtonLink>
            ) : null}
          </>
        }
      />
      {sp.created === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("wanted.createdAlert", { number: w.number })}
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("wanted.personalInfo")}>
            <div className="mb-4 flex items-start gap-4">
              <div className="h-32 w-24 shrink-0 overflow-hidden rounded-md border border-line bg-mist">
                {mainPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mainPhotoUrl} alt={t("wanted.photoFile")} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-slate">{t("wanted.noPhoto")}</div>
                )}
              </div>
              <DL
                items={[
                  { label: t("person.gender"), value: labelOf(GENDER, w.person.gender, locale).label },
                  { label: "DOB", value: fmtDate(w.person.dateOfBirth, locale) },
                  { label: t("person.nationality"), value: w.person.nationality ?? "—" },
                  { label: t("wanted.alias"), value: w.person.aliases.map((a) => a.alias).join(", ") || "—" },
                  { label: t("person.phone"), value: w.person.phone ?? "—" },
                  { label: t("person.address"), value: [w.person.address, w.person.city].filter(Boolean).join(", ") || "—" },
                  { label: t("person.physical"), value: w.person.physicalDescription ?? "—" },
                  { label: t("person.marks"), value: w.person.distinguishingMarks ?? "—" },
                ]}
                cols={2}
              />
            </div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-navy">{t("person.identifiers")}</p>
            <p className="text-xs text-slate">{w.person.identifiers.length ? w.person.identifiers.map((i) => `${labelOf(IDENTIFIER_TYPE, i.type, locale).label}: ${i.value}`).join(" · ") : "—"}</p>
            <Link href={`/persons/${w.person.id}`} className="mt-2 inline-block text-xs font-semibold text-blue hover:underline">
              {t("wanted.viewPersonProfile")} →
            </Link>
          </Card>

          <Card title={t("wanted.caseInfo")}>
            <DL
              items={[
                { label: t("wanted.offense"), value: w.offense },
                { label: t("wanted.reason"), value: w.reason },
                { label: t("wanted.case"), value: w.case ? <Link href={`/cases/${w.case.id}`} className="text-blue hover:underline">{w.case.number} — {w.case.title}</Link> : "—" },
                { label: t("wanted.issuedBy"), value: `${w.issuedBy.firstName} ${w.issuedBy.lastName}` },
                { label: t("wanted.approvedBy"), value: w.approvedBy ? `${w.approvedBy.firstName} ${w.approvedBy.lastName}` : "—" },
                { label: t("wanted.issuingAuthority"), value: w.issuingAuthority ?? "—" },
                { label: t("wanted.legalBasis"), value: w.legalBasis ?? "—" },
                { label: t("wanted.verifiedBy"), value: w.verifiedBy && w.verifiedAt ? `${w.verifiedBy.firstName} ${w.verifiedBy.lastName} · ${fmtDateTime(w.verifiedAt, locale)}` : t("wanted.notVerified") },
                ...(w.suspendedAt ? [{ label: t("wanted.suspension"), value: `${fmtDateTime(w.suspendedAt, locale)} — ${w.suspensionReason ?? ""}` }] : []),
              ]}
              cols={2}
            />
            {(w.status === "DRAFT" || w.status === "PENDING_APPROVAL") && actor.permissions.has("wanted:verify") ? (
              <div className="mt-4 border-t border-line pt-3">
                <WantedVerifyForm id={w.id} />
              </div>
            ) : null}
          </Card>
          {actor.permissions.has("wanted:publish") ? (
            <Card title={t("pa.wanted.title")} description={t("pa.wanted.hint")}>
              {w.status === "ACTIVE" && w.kind !== "HEARING" && w.verifiedAt ? (
                <WantedPublicForm id={w.id} published={!!w.publicPublishedAt} publishedAt={w.publicPublishedAt ? fmtDateTime(w.publicPublishedAt, locale) : null} notice={w.publicNotice} />
              ) : (
                <p className="text-sm text-slate">{t("pa.wanted.notPublic")}</p>
              )}
            </Card>
          ) : null}
          {homonyms.length ? (
            <Alert tone="warning">
              <p className="font-semibold">{t("wanted.homonymsTitle")}</p>
              <p className="text-xs">{t("wanted.homonymsHint")}</p>
              <ul className="mt-1 list-disc ps-5 text-xs">
                {homonyms.map((h) => (
                  <li key={h.id}>
                    <Link href={`/wanted/${h.id}`} className="font-semibold underline">{h.number}</Link> · {h.person.number} · {fmtDate(h.person.dateOfBirth, locale)} · {h.person.city ?? "—"}
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <Card title={t("wanted.warrantInfo")}>
            {w.warrant ? (
              <>
                <DL
                  items={[
                    { label: t("wanted.warrantNumber"), value: w.warrant.number },
                    { label: t("wanted.warrantType"), value: w.warrant.type },
                    { label: t("wanted.warrantAuthority"), value: w.warrant.issuingAuthority },
                    { label: t("wanted.status"), value: w.warrant.status },
                    { label: t("wanted.warrantIssued"), value: fmtDate(w.warrant.issuedAt, locale) },
                    { label: t("wanted.expiresAt"), value: fmtDate(w.warrant.expiresAt, locale) },
                  ]}
                  cols={2}
                />
                {w.warrant.documents.length ? (
                  <p className="mt-2 text-xs">
                    {w.warrant.documents.map((d) => (
                      <a key={d.id} href={`/api/v1/documents/${d.id}/download`} className="mr-2 text-blue hover:underline">
                        {d.versions[0]?.fileName ?? d.title}
                      </a>
                    ))}
                  </p>
                ) : null}
                {canWrite && nextWarrantStatuses.length ? (
                  <div className="mt-3 border-t border-line pt-3">
                    <WarrantStatusForm warrantId={w.warrant.id} next={nextWarrantStatuses} />
                  </div>
                ) : null}
              </>
            ) : canWrite ? (
              <WarrantForm wantedPersonId={w.id} />
            ) : (
              <EmptyState>{t("wanted.noWarrant")}</EmptyState>
            )}
          </Card>

          <Card title={t("wanted.vehicles")} padded={false}>
            {w.vehicles.length === 0 ? (
              <div className="p-5">
                <EmptyState>{t("wanted.noVehicles")}</EmptyState>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>{t("wanted.plateNumber")}</th>
                    <th>{t("wanted.vehicleMake")}</th>
                    <th>{t("wanted.vehicleColor")}</th>
                    <th>{t("wanted.vehicleYear")}</th>
                  </tr>
                </thead>
                <tbody>
                  {w.vehicles.map((v) => (
                    <tr key={v.id}>
                      <td data-label={t("wanted.plateNumber")} className="font-mono font-semibold">{v.plateNumber ?? "—"}</td>
                      <td data-label={t("wanted.vehicleMake")} className="text-xs">{[v.make, v.model].filter(Boolean).join(" ") || "—"}</td>
                      <td data-label={t("wanted.vehicleColor")} className="text-xs">{v.color ?? "—"}</td>
                      <td data-label={t("wanted.vehicleYear")} className="text-xs">{v.year ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            {canWrite ? (
              <div className="border-t border-line p-4">
                <VehicleForm wantedPersonId={w.id} />
              </div>
            ) : null}
          </Card>

          <Card title={t("wanted.sightings")} padded={false}>
            {w.sightings.length === 0 ? (
              <div className="p-5">
                <EmptyState>{t("wanted.noSightings")}</EmptyState>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>{t("wanted.sightingLocation")}</th>
                    <th>{t("wanted.sightingSource")}</th>
                    <th>{t("wanted.sightingOfficer")}</th>
                    <th>{t("biometric.col.when")}</th>
                  </tr>
                </thead>
                <tbody>
                  {w.sightings.map((s) => (
                    <tr key={s.id}>
                      <td data-label={t("wanted.sightingLocation")}>{s.location}{s.notes ? <span className="block text-xs text-slate">{s.notes}</span> : null}</td>
                      <td data-label={t("wanted.sightingSource")} className="text-xs">{s.source ?? "—"}</td>
                      <td data-label={t("wanted.sightingOfficer")} className="text-xs">{s.officer.firstName} {s.officer.lastName}</td>
                      <td data-label={t("biometric.col.when")} className="text-xs">{fmtDateTime(s.occurredAt, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            {canWrite ? (
              <div className="border-t border-line p-4">
                <SightingForm wantedPersonId={w.id} />
              </div>
            ) : null}
          </Card>

          <Card title={t("wanted.photos")}>
            {w.photos.length === 0 ? (
              <EmptyState>{t("wanted.noPhoto")}</EmptyState>
            ) : (
              <div className="flex flex-wrap gap-3">
                {w.photos.map((p) => (
                  <a key={p.id} href={`/api/v1/documents/${p.id}/download`} className="block w-20 overflow-hidden rounded-md border border-line" title={`${p.uploadedBy.firstName} ${p.uploadedBy.lastName} · ${fmtDate(p.createdAt, locale)}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/v1/documents/${p.id}/download`} alt="" className="h-24 w-20 object-cover" />
                    {p.id === w.mainPhotoDocumentId ? <span className="block bg-blue px-1 text-center text-[9px] text-white">{t("wanted.mainPhotoBadge")}</span> : null}
                  </a>
                ))}
              </div>
            )}
            {canWrite ? (
              <div className="mt-4 border-t border-line pt-4">
                <PhotoForm wantedPersonId={w.id} isFirst={w.photos.length === 0} />
              </div>
            ) : null}
          </Card>

          {actor.permissions.has("audit:view") ? (
            <Card title={t("case.auditTrail")} padded={false}>
              {audit.length === 0 ? (
                <div className="p-5">
                  <EmptyState>{t("audit.none")}</EmptyState>
                </div>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>{t("audit.col.when")}</th>
                      <th>{t("audit.col.actor")}</th>
                      <th>{t("audit.col.action")}</th>
                      <th>{t("audit.col.summary")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((a) => (
                      <tr key={a.id}>
                        <td data-label={t("audit.col.when")} className="whitespace-nowrap text-xs">{fmtDateTime(a.at, locale)}</td>
                        <td data-label={t("audit.col.actor")} className="text-xs">{a.actorLabel}</td>
                        <td data-label={t("audit.col.action")} className="font-mono text-xs text-blue">{a.action}</td>
                        <td data-label={t("audit.col.summary")} className="text-xs">{a.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          {canWrite && nextStatuses.length ? (
            <Card title={t("wanted.changeStatus")}>
              <WantedStatusForm id={w.id} next={nextStatuses} />
            </Card>
          ) : null}
          {w.closedAt ? (
            <Card title={t("wanted.closure")}>
              <p className="text-xs text-slate">{fmtDateTime(w.closedAt, locale)}</p>
              {w.closureNotes ? <p className="mt-1 text-sm">{w.closureNotes}</p> : null}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

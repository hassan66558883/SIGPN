import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getPerson } from "@/server/persons/service";
import { prisma } from "@/server/db";
import { personBiometricSummary } from "@/server/biometric/queries";
import { personWantedSummary } from "@/server/wanted/queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, ButtonLink, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { removeIdentifierAction } from "@/server/persons/actions";
import { CASE_STATUS, COMPLAINT_STATUS, DANGER_LEVEL, GENDER, IDENTIFIER_TYPE, MARITAL_STATUS, PARTY_ROLE, PARTY_STATUS, RELATIONSHIP_TYPE, WANTED_STATUS, labelOf } from "@/lib/labels";
import { fmtDate, fmtDateTime, toInputDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { AliasForm, IdentifierForm, MergeForm, PersonEditForm, RelationshipForm } from "../person-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("persons.col.person") };
}

export default async function PersonPage({ params, searchParams }: PageProps<"/persons/[id]">) {
  const actor = await requirePermission("persons:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let p;
  try {
    p = await getPerson(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const canEdit = actor.permissions.has("persons:update") && !p.mergedIntoId;
  const canViewBiometric = actor.permissions.has("biometric:history_view");
  const biometric = canViewBiometric ? await personBiometricSummary(p.id) : null;
  const canViewWanted = actor.permissions.has("wanted:view");
  const wanted = canViewWanted ? await personWantedSummary(p.id) : [];
  const regions = canEdit ? await prisma.region.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [];
  const mergedInto = p.mergedIntoId ? await prisma.person.findUnique({ where: { id: p.mergedIntoId }, select: { id: true, number: true, firstName: true, lastName: true } }) : null;
  // Only involvements the actor may see (territorial scope; sensitive cases only with the permission).
  const visibleParties = p.caseParties.filter((cp) => (actor.scopeLevel === "NATIONAL" || (actor.scopeLevel === "REGIONAL" ? cp.case.regionId === actor.regionId : actor.stationIds?.includes(cp.case.stationId))) && (!cp.case.isSensitive || actor.permissions.has("cases:view_sensitive")));
  const visibleComplaints = p.complaints.filter((c) => actor.scopeLevel === "NATIONAL" || (actor.scopeLevel === "REGIONAL" ? c.regionId === actor.regionId : actor.stationIds?.includes(c.stationId)));
  return (
    <div>
      <PageHeader
        eyebrow={t("person.eyebrow")}
        title={`${p.lastName} ${p.firstName}${p.otherNames ? ` ${p.otherNames}` : ""}`}
        subtitle={`${p.number} · ${labelOf(GENDER, p.gender, locale).label}${p.dateOfBirth ? ` · ${fmtDate(p.dateOfBirth, locale)}` : ""}${p.nationality ? ` · ${p.nationality}` : ""}`}
        breadcrumbs={[{ href: "/persons", label: t("persons.title") }, { label: p.number }]}
        actions={
          <>
            {p.isDeceased ? <Badge>{t("persons.deceased")}</Badge> : null}
            {p.mergedIntoId ? <Badge tone="warning">{t("persons.merged")}</Badge> : null}
            {p.station ? <Badge tone="info">{p.station.name}</Badge> : null}
          </>
        }
      />
      {sp.created === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("person.createdAlert", { number: p.number })}
        </Alert>
      ) : null}
      {sp.merged === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("person.mergedAlert")}
        </Alert>
      ) : null}
      {mergedInto ? (
        <Alert tone="warning" className="mb-4">
          {t("person.mergedInto")}{" "}
          <Link href={`/persons/${mergedInto.id}`} className="font-semibold underline">
            {mergedInto.lastName} {mergedInto.firstName} ({mergedInto.number})
          </Link>
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("person.identity")}>
            {canEdit ? (
              <PersonEditForm
                regions={regions}
                values={{ id: p.id, firstName: p.firstName, lastName: p.lastName, otherNames: p.otherNames, gender: p.gender, dateOfBirth: toInputDate(p.dateOfBirth), placeOfBirth: p.placeOfBirth, nationality: p.nationality, maritalStatus: p.maritalStatus, occupation: p.occupation, phone: p.phone, email: p.email, address: p.address, city: p.city, regionId: p.regionId, physicalDescription: p.physicalDescription, distinguishingMarks: p.distinguishingMarks, notes: p.notes, isDeceased: p.isDeceased }}
              />
            ) : (
              <DL
                items={[
                  { label: t("person.placeOfBirth"), value: p.placeOfBirth ?? "—" },
                  { label: t("person.maritalStatus"), value: labelOf(MARITAL_STATUS, p.maritalStatus, locale).label },
                  { label: t("person.occupation"), value: p.occupation ?? "—" },
                  { label: t("person.phone"), value: p.phone ?? "—" },
                  { label: t("person.email"), value: p.email ?? "—" },
                  { label: t("person.address"), value: [p.address, p.city, p.region?.name].filter(Boolean).join(", ") || "—" },
                  { label: t("person.physical"), value: p.physicalDescription ?? "—" },
                  { label: t("person.marks"), value: p.distinguishingMarks ?? "—" },
                ]}
              />
            )}
          </Card>
          <Card title={t("person.involvements")} padded={false} description={t("person.presumption")}>
            {visibleParties.length === 0 ? (
              <div className="p-5">
                <EmptyState>{t("person.noInvolvements")}</EmptyState>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>{t("person.col.case")}</th>
                    <th>{t("person.col.role")}</th>
                    <th>{t("person.col.status")}</th>
                    <th>{t("cases.col.opened")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleParties.map((cp) => {
                    const r = labelOf(PARTY_ROLE, cp.role, locale);
                    const s = labelOf(PARTY_STATUS, cp.status, locale);
                    const cs = labelOf(CASE_STATUS, cp.case.status, locale);
                    return (
                      <tr key={cp.id}>
                        <td data-label={t("person.col.case")}>
                          <Link href={`/cases/${cp.case.id}`} className="font-semibold text-blue hover:underline">
                            {cp.case.number}
                          </Link>
                          <span className="block text-xs text-slate">
                            {cp.case.title} · <Badge tone={cs.tone}>{cs.label}</Badge>
                          </span>
                        </td>
                        <td data-label={t("person.col.role")}>
                          <Badge tone={r.tone}>{r.label}</Badge>
                        </td>
                        <td data-label={t("person.col.status")}>
                          <Badge tone={s.tone}>{s.label}</Badge>
                        </td>
                        <td data-label={t("cases.col.opened")} className="text-xs">
                          {fmtDate(cp.addedAt, locale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
          <Card title={t("person.complaints")} padded={false}>
            {visibleComplaints.length === 0 ? (
              <div className="p-5">
                <EmptyState>{t("person.noComplaints")}</EmptyState>
              </div>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {visibleComplaints.map((c) => {
                  const s = labelOf(COMPLAINT_STATUS, c.status, locale);
                  return (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                      <span>
                        <Link href={`/complaints/${c.id}`} className="font-semibold text-blue hover:underline">
                          {c.number}
                        </Link>{" "}
                        <span className="text-ink">{c.title}</span>
                      </span>
                      <span className="flex items-center gap-2 text-xs text-slate">
                        {fmtDate(c.receivedAt, locale)} <Badge tone={s.tone}>{s.label}</Badge>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title={t("person.identifiers")}>
            {p.identifiers.length === 0 ? (
              <EmptyState>{t("person.noIdentifiers")}</EmptyState>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {p.identifiers.map((i) => (
                  <li key={i.id} className="flex items-start justify-between gap-2 py-2">
                    <span>
                      <span className="block text-xs font-semibold uppercase text-slate">{labelOf(IDENTIFIER_TYPE, i.type, locale).label}</span>
                      <span className="font-mono text-ink">{i.value}</span>
                      {i.issuedBy || i.issuedAt || i.expiresAt ? (
                        <span className="block text-xs text-slate">
                          {[i.issuedBy, i.issuedAt ? fmtDate(i.issuedAt, locale) : null, i.expiresAt ? `→ ${fmtDate(i.expiresAt, locale)}` : null].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                    </span>
                    {canEdit ? (
                      <ActionButton action={removeIdentifierAction} fields={{ id: i.id }} variant="ghost" size="xs" confirm={t("person.removeIdentifierConfirm")}>
                        {t("person.removeIdentifier")}
                      </ActionButton>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {canEdit ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-blue">{t("person.addIdentifier")}</summary>
                <div className="mt-2 rounded-md border border-line bg-mist p-3">
                  <IdentifierForm personId={p.id} />
                </div>
              </details>
            ) : null}
          </Card>
          <Card title={t("person.aliases")}>
            {p.aliases.length === 0 ? <EmptyState>{t("person.noAliases")}</EmptyState> : <div className="flex flex-wrap gap-1">{p.aliases.map((a) => <Badge key={a.id}>{a.alias}</Badge>)}</div>}
            {canEdit ? (
              <div className="mt-3">
                <AliasForm personId={p.id} />
              </div>
            ) : null}
          </Card>
          <Card title={t("person.relationships")}>
            {p.relationsFrom.length + p.relationsTo.length === 0 ? (
              <EmptyState>{t("person.noRelationships")}</EmptyState>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {p.relationsFrom.map((r) => (
                  <li key={r.id} className="py-1.5">
                    <span className="text-xs uppercase text-slate">{labelOf(RELATIONSHIP_TYPE, r.type, locale).label}</span>{" "}
                    <Link href={`/persons/${r.toPerson.id}`} className="font-semibold text-blue hover:underline">
                      {r.toPerson.lastName} {r.toPerson.firstName}
                    </Link>
                    {r.notes ? <span className="block text-xs text-slate">{r.notes}</span> : null}
                  </li>
                ))}
                {p.relationsTo.map((r) => (
                  <li key={r.id} className="py-1.5">
                    <span className="text-xs uppercase text-slate">← {labelOf(RELATIONSHIP_TYPE, r.type, locale).label}</span>{" "}
                    <Link href={`/persons/${r.fromPerson.id}`} className="font-semibold text-blue hover:underline">
                      {r.fromPerson.lastName} {r.fromPerson.firstName}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {canEdit ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-blue">{t("person.addRelationship")}</summary>
                <div className="mt-2 rounded-md border border-line bg-mist p-3">
                  <RelationshipForm personId={p.id} />
                </div>
              </details>
            ) : null}
          </Card>
          {biometric ? (
            <Card title={t("person.biometric")} actions={<ButtonLink href={`/biometric?tab=history&personId=${p.id}`} size="xs" variant="ghost">{t("person.biometricHistory")}</ButtonLink>}>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={biometric.fingerprintRegistered ? "success" : "neutral"}>{t("biometric.tab.fingerprint")}: {biometric.fingerprintRegistered ? t("person.registered") : t("person.notRegistered")}</Badge>
                <Badge tone={biometric.faceRegistered ? "success" : "neutral"}>{t("biometric.tab.face")}: {biometric.faceRegistered ? t("person.registered") : t("person.notRegistered")}</Badge>
                <Badge tone={biometric.voiceRegistered ? "success" : "neutral"}>{t("biometric.tab.voice")}: {biometric.voiceRegistered ? t("person.registered") : t("person.notRegistered")}</Badge>
              </div>
              {biometric.vehicles.length ? (
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-navy">{t("person.associatedVehicles")}</p>
                  <ul className="mt-1 text-xs text-slate">
                    {biometric.vehicles.map((v) => (
                      <li key={v.id} className="font-mono">
                        {v.plateNumber} {v.vehicleMake ? `· ${v.vehicleMake} ${v.vehicleModel ?? ""}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="mt-3 text-xs text-slate">{t("person.biometricSearchAppearances", { n: biometric.searchAppearances })}</p>
            </Card>
          ) : null}
          {wanted.length > 0 ? (
            <Card title={t("wanted.title")} actions={<Badge tone="danger">{wanted.length}</Badge>}>
              <ul className="divide-y divide-line text-sm">
                {wanted.map((w) => {
                  const st = labelOf(WANTED_STATUS, w.status, locale);
                  const dl = labelOf(DANGER_LEVEL, w.dangerLevel, locale);
                  return (
                    <li key={w.id} className="py-1.5">
                      <Link href={`/wanted/${w.id}`} className="font-semibold text-blue hover:underline">
                        {w.number}
                      </Link>
                      <span className="block text-xs text-slate">{w.offense}</span>
                      <span className="mt-1 flex gap-1">
                        <Badge tone={st.tone}>{st.label}</Badge>
                        <Badge tone={dl.tone}>{dl.label}</Badge>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}
          {actor.permissions.has("persons:merge") && !p.mergedIntoId ? (
            <Card title={t("person.merge")}>
              <p className="mb-2 text-xs text-slate">
                {t("person.mergeKeep")}: <span className="font-mono">{p.number}</span>
              </p>
              <MergeForm keepId={p.id} />
            </Card>
          ) : null}
          <p className="text-xs text-slate">
            {t("person.registeredBy")} {p.createdBy?.username ?? "—"} · {fmtDateTime(p.createdAt, locale)}
          </p>
        </div>
      </div>
    </div>
  );
}

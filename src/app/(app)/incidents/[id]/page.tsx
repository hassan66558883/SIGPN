import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { IncidentStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { getIncident, INCIDENT_TRANSITIONS } from "@/server/ops/service";
import { officersOf, stationIdsForForms } from "@/server/ops/queries";
import { assignableInvestigators } from "@/server/complaints/queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, EmptyState, PageHeader, Stepper } from "@/components/ui";
import { INCIDENT_STATUS, INCIDENT_TYPE, PARTY_ROLE, SEVERITY, labelOf } from "@/lib/labels";
import { fmtDateTime, toInputDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { AddIncidentPersonForm, AddOfficerForm, EscalateForm, IncidentForm, IncidentStatusForm } from "../incident-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("incidents.col.incident") };
}

const STEPS: IncidentStatus[] = ["REPORTED", "RESPONDING", "ON_SCENE", "RESOLVED", "CLOSED"];
type NextStatus = "RESPONDING" | "ON_SCENE" | "RESOLVED" | "CLOSED";

export default async function IncidentPage({ params, searchParams }: PageProps<"/incidents/[id]">) {
  const actor = await requirePermission("incidents:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let i;
  try {
    i = await getIncident(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const canUpdate = actor.permissions.has("incidents:update") && i.status !== "CLOSED";
  const canEscalate = canUpdate && actor.permissions.has("cases:create") && !i.caseId && INCIDENT_TRANSITIONS[i.status].includes("ESCALATED");
  const stationIds = stationIdsForForms(actor, i.stationId);
  const [officers, users] = await Promise.all([canUpdate ? officersOf(stationIds) : Promise.resolve([]), canEscalate ? assignableInvestigators(actor, i.stationId) : Promise.resolve([])]);
  const st = labelOf(INCIDENT_STATUS, i.status, locale);
  const ty = labelOf(INCIDENT_TYPE, i.type, locale);
  const sv = labelOf(SEVERITY, i.severity, locale);
  const next = INCIDENT_TRANSITIONS[i.status].filter((s): s is NextStatus => s !== "ESCALATED");
  const stepIndex = i.status === "ESCALATED" ? 3 : STEPS.indexOf(i.status);
  const dispatched = new Set(i.officers.map((o) => o.officer.id));
  const officerOpts = officers.filter((o) => !dispatched.has(o.id)).map((o) => ({ id: o.id, label: `${o.rank.name} ${o.firstName} ${o.lastName} (${o.badgeNumber}) · ${o.station.code}` }));
  return (
    <div>
      <PageHeader
        eyebrow={t("incident.eyebrow")}
        title={i.title}
        subtitle={`${i.number} · ${i.station.name} · ${fmtDateTime(i.occurredAt, locale)}`}
        breadcrumbs={[{ href: "/incidents", label: t("incidents.title") }, { label: i.number }]}
        actions={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            <Badge tone={sv.tone}>{sv.label}</Badge>
            <Badge tone={ty.tone}>{ty.label}</Badge>
          </>
        }
      />
      {sp.created === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("incident.createdAlert", { number: i.number })}
        </Alert>
      ) : null}
      {i.case ? (
        <Alert tone="danger" className="mb-4">
          {t("incident.escalatedTo")}{" "}
          <Link href={`/cases/${i.case.id}`} className="font-semibold underline">
            {i.case.number}
          </Link>
        </Alert>
      ) : null}
      <div className="mb-5">
        <Stepper steps={[{ key: "r", label: t("incident.stepper.reported") }, { key: "g", label: t("incident.stepper.responding") }, { key: "s", label: t("incident.stepper.onScene") }, { key: "v", label: i.status === "ESCALATED" ? st.label : t("incident.stepper.resolved") }, { key: "c", label: t("incident.stepper.closed") }]} current={stepIndex} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("incident.facts")}>
            {canUpdate ? (
              <IncidentForm mode="edit" stations={[]} patrols={[]} values={{ id: i.id, type: i.type, severity: i.severity, title: i.title, description: i.description, occurredAt: toInputDateTime(i.occurredAt), locationText: i.locationText, latitude: i.latitude, longitude: i.longitude }} />
            ) : (
              <>
                {i.status === "CLOSED" ? <p className="mb-3 text-xs text-slate">{t("incident.readOnly")}</p> : null}
                <DL
                  items={[
                    { label: t("incident.occurredAt"), value: fmtDateTime(i.occurredAt, locale) },
                    { label: t("incident.location"), value: `${i.locationText}${i.latitude != null && i.longitude != null ? ` (${i.latitude}, ${i.longitude})` : ""}` },
                    { label: t("incident.reportedBy"), value: `${i.reportedBy.firstName} ${i.reportedBy.lastName}` },
                    { label: t("incident.reportedAt"), value: fmtDateTime(i.reportedAt, locale) },
                  ]}
                />
                <p className="mt-4 whitespace-pre-wrap text-sm text-ink">{i.description}</p>
              </>
            )}
          </Card>
          <Card title={t("incident.officers")}>
            {i.officers.length === 0 ? (
              <EmptyState>{t("incident.noOfficers")}</EmptyState>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {i.officers.map((o) => (
                  <li key={o.officer.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <Link href={`/officers/${o.officer.id}`} className="font-semibold text-blue hover:underline">
                      {o.officer.rank.name} {o.officer.firstName} {o.officer.lastName}
                    </Link>
                    <span className="text-xs text-slate">
                      {o.officer.badgeNumber}
                      {o.role ? ` · ${o.role}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {canUpdate && officerOpts.length ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-blue">{t("incident.addOfficer")}</summary>
                <div className="mt-2 rounded-md border border-line bg-mist p-3">
                  <AddOfficerForm incidentId={i.id} officers={officerOpts} />
                </div>
              </details>
            ) : null}
          </Card>
          <Card title={t("incident.persons")}>
            {i.persons.length === 0 ? (
              <EmptyState>{t("incident.noPersons")}</EmptyState>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {i.persons.map((p) => {
                  const r = labelOf(PARTY_ROLE, p.role, locale);
                  return (
                    <li key={p.person.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span>
                        <Link href={`/persons/${p.person.id}`} className="font-semibold text-blue hover:underline">
                          {p.person.lastName} {p.person.firstName}
                        </Link>
                        <span className="block text-xs text-slate">
                          {p.person.number}
                          {p.notes ? ` · ${p.notes}` : ""}
                        </span>
                      </span>
                      <Badge tone={r.tone}>{r.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2 text-xs text-slate">{t("person.presumption")}</p>
            {canUpdate ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-blue">{t("incident.addPerson")}</summary>
                <div className="mt-2 rounded-md border border-line bg-mist p-3">
                  <AddIncidentPersonForm incidentId={i.id} />
                </div>
              </details>
            ) : null}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title={t("incident.response")}>
            <DL
              cols={1}
              items={[
                { label: t("incidents.col.status"), value: <Badge tone={st.tone}>{st.label}</Badge> },
                { label: t("incident.linkedPatrol"), value: i.patrol ? <Link href={`/patrols/${i.patrol.id}`} className="text-blue hover:underline">{i.patrol.number}</Link> : "—" },
                { label: t("incident.linkedCase"), value: i.case ? <Link href={`/cases/${i.case.id}`} className="text-blue hover:underline">{i.case.number}</Link> : "—" },
                ...(i.resolvedAt ? [{ label: t("incident.resolvedAt"), value: fmtDateTime(i.resolvedAt, locale) }] : []),
              ]}
            />
            {i.report ? (
              <div className="mt-3 rounded-md border border-line bg-mist p-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate">{t("incident.interventionReport")}</p>
                <p className="whitespace-pre-wrap text-ink">{i.report}</p>
              </div>
            ) : null}
            {canUpdate && next.length ? (
              <div className="mt-4 border-t border-line pt-3">
                <IncidentStatusForm id={i.id} next={next} />
              </div>
            ) : null}
          </Card>
          {canEscalate ? (
            <Card title={t("incident.escalate")}>
              <EscalateForm id={i.id} users={users.map((u) => ({ id: u.id, label: `${u.firstName} ${u.lastName} (${u.role.code}${u.station ? ` · ${u.station.code}` : ""})` }))} />
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getPatrol } from "@/server/ops/service";
import { officersOf, stationIdsForForms, vehiclesOf, zonesOf } from "@/server/ops/queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, ButtonLink, Card, DL, EmptyState, PageHeader } from "@/components/ui";
import { INCIDENT_STATUS, PATROL_STATUS, SEVERITY, SHIFT, VEHICLE_STATUS, labelOf } from "@/lib/labels";
import { fmtDateTime, toInputDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { AddMemberForm, CancelPatrolForm, CompletePatrolForm, PatrolForm, StartPatrolForm } from "../patrol-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("patrols.col.patrol") };
}

export default async function PatrolPage({ params, searchParams }: PageProps<"/patrols/[id]">) {
  const actor = await requirePermission("patrols:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let p;
  try {
    p = await getPatrol(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const terminal = p.status === "COMPLETED" || p.status === "CANCELLED";
  const canManage = actor.permissions.has("patrols:manage") && !terminal;
  const stationIds = stationIdsForForms(actor, p.stationId);
  const [zones, officers, vehicles] = canManage ? await Promise.all([zonesOf([p.stationId]), officersOf(stationIds), vehiclesOf([p.stationId])]) : [[], [], []];
  const st = labelOf(PATROL_STATUS, p.status, locale);
  const sh = labelOf(SHIFT, p.shift, locale);
  const team = new Set([p.supervisor.id, ...p.officers.map((o) => o.officer.id)]);
  const officerOpts = officers.map((o) => ({ id: o.id, label: `${o.rank.name} ${o.firstName} ${o.lastName} (${o.badgeNumber}) · ${o.station.code}`, stationId: o.stationId }));
  return (
    <div>
      <PageHeader
        eyebrow={t("patrol.eyebrow")}
        title={`${p.number} · ${sh.label}`}
        subtitle={`${p.station.name} · ${fmtDateTime(p.plannedStart, locale)} → ${fmtDateTime(p.plannedEnd, locale)}`}
        breadcrumbs={[{ href: "/patrols", label: t("patrols.title") }, { label: p.number }]}
        actions={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            {p.zone ? <Badge tone="info">{p.zone.code} · {p.zone.name}</Badge> : null}
            {actor.permissions.has("incidents:create") && !terminal ? (
              <ButtonLink href={`/incidents/new?patrolId=${p.id}`} size="sm" variant="secondary">
                {t("patrol.reportIncident")}
              </ButtonLink>
            ) : null}
          </>
        }
      />
      {sp.created === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("patrol.createdAlert", { number: p.number })}
        </Alert>
      ) : null}
      {terminal ? (
        <Alert tone="neutral" className="mb-4">
          {t("patrol.readOnly")}
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("patrol.details")}>
            {canManage && p.status === "PLANNED" ? (
              <PatrolForm
                mode="edit"
                stations={[]}
                values={{ id: p.id, stationId: p.stationId, zoneId: p.zoneId, shift: p.shift, mission: p.mission, plannedStart: toInputDateTime(p.plannedStart), plannedEnd: toInputDateTime(p.plannedEnd), supervisorId: p.supervisor.id, vehicleId: p.vehicleId, notes: p.notes }}
                zones={zones.map((z) => ({ id: z.id, label: `${z.code} · ${z.name}` }))}
                officers={officerOpts}
                vehicles={vehicles.filter((v) => v.status === "AVAILABLE" || v.id === p.vehicleId).map((v) => ({ id: v.id, label: `${v.fleetNumber} · ${v.make} ${v.model} (${v.plateNumber})` }))}
              />
            ) : (
              <>
                <DL
                  items={[
                    { label: t("patrol.mission"), value: <span className="whitespace-pre-wrap">{p.mission}</span> },
                    { label: t("patrol.zone"), value: p.zone ? `${p.zone.code} · ${p.zone.name}` : t("patrol.noZone") },
                    { label: t("patrol.supervisor"), value: <Link href={`/officers/${p.supervisor.id}`} className="text-blue hover:underline">{p.supervisor.rank.name} {p.supervisor.firstName} {p.supervisor.lastName}</Link> },
                    { label: t("patrol.vehicle"), value: p.vehicle ? `${p.vehicle.fleetNumber} · ${p.vehicle.make} ${p.vehicle.model} (${p.vehicle.plateNumber}) — ${labelOf(VEHICLE_STATUS, p.vehicle.status, locale).label}` : t("patrol.noVehicle") },
                    { label: t("patrol.createdBy"), value: `${p.createdBy.firstName} ${p.createdBy.lastName}` },
                    ...(p.notes ? [{ label: t("patrol.notes"), value: <span className="whitespace-pre-wrap">{p.notes}</span> }] : []),
                  ]}
                />
              </>
            )}
          </Card>
          <Card title={t("patrol.incidents")} actions={actor.permissions.has("incidents:view") ? <Link href={`/incidents?q=${encodeURIComponent(p.number)}`} className="text-xs font-semibold text-blue hover:underline">{t("incidents.title")} →</Link> : null}>
            {p.incidents.length === 0 ? (
              <EmptyState>{t("patrol.noIncidents")}</EmptyState>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {p.incidents.map((i) => {
                  const ist = labelOf(INCIDENT_STATUS, i.status, locale);
                  const sv = labelOf(SEVERITY, i.severity, locale);
                  return (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span>
                        <Link href={`/incidents/${i.id}`} className="font-semibold text-blue hover:underline">
                          {i.number}
                        </Link>{" "}
                        <span className="text-ink">{i.title}</span>
                        <span className="block text-xs text-slate">{fmtDateTime(i.occurredAt, locale)}</span>
                      </span>
                      <span className="flex gap-1">
                        <Badge tone={sv.tone}>{sv.label}</Badge>
                        <Badge tone={ist.tone}>{ist.label}</Badge>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title={t("patrol.lifecycle")}>
            <DL
              cols={1}
              items={[
                { label: t("patrols.col.status"), value: <Badge tone={st.tone}>{st.label}</Badge> },
                { label: t("patrol.actualStart"), value: fmtDateTime(p.actualStart, locale) },
                { label: t("patrol.actualEnd"), value: fmtDateTime(p.actualEnd, locale) },
                ...(p.vehicle ? [{ label: `${t("patrol.startKm")} / ${t("patrol.endKm")}`, value: `${p.startKm ?? "—"} / ${p.endKm ?? "—"}` }] : []),
              ]}
            />
            {p.report ? (
              <div className="mt-3 rounded-md border border-line bg-mist p-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate">{t("patrol.report")}</p>
                <p className="whitespace-pre-wrap text-ink">{p.report}</p>
              </div>
            ) : null}
            {canManage && p.status === "PLANNED" ? (
              <div className="mt-4 border-t border-line pt-3">
                <StartPatrolForm id={p.id} hasVehicle={!!p.vehicleId} />
              </div>
            ) : null}
            {canManage && p.status === "ACTIVE" ? (
              <div className="mt-4 border-t border-line pt-3">
                <CompletePatrolForm id={p.id} hasVehicle={!!p.vehicleId} />
              </div>
            ) : null}
            {canManage ? (
              <details className="mt-4 border-t border-line pt-3">
                <summary className="cursor-pointer text-xs font-semibold text-danger">{t("patrol.cancel")}</summary>
                <div className="mt-2">
                  <CancelPatrolForm id={p.id} />
                </div>
              </details>
            ) : null}
          </Card>
          <Card title={t("patrol.team")}>
            <ul className="divide-y divide-line text-sm">
              <li className="flex items-center justify-between gap-2 py-1.5">
                <Link href={`/officers/${p.supervisor.id}`} className="font-semibold text-blue hover:underline">
                  {p.supervisor.rank.name} {p.supervisor.firstName} {p.supervisor.lastName}
                </Link>
                <Badge tone="violet">{t("patrol.supervisor")}</Badge>
              </li>
              {p.officers.map((o) => (
                <li key={o.officer.id} className="flex items-center justify-between gap-2 py-1.5">
                  <Link href={`/officers/${o.officer.id}`} className="text-blue hover:underline">
                    {o.officer.rank.name} {o.officer.firstName} {o.officer.lastName}
                  </Link>
                  <span className="text-xs text-slate">{o.role ?? "MEMBER"}</span>
                </li>
              ))}
            </ul>
            {canManage ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-blue">{t("patrol.addMember")}</summary>
                <div className="mt-2 rounded-md border border-line bg-mist p-3">
                  <AddMemberForm patrolId={p.id} officers={officerOpts.filter((o) => !team.has(o.id))} />
                </div>
              </details>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

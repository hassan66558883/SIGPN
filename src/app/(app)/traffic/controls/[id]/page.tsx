import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getControl } from "@/server/traffic/queries";
import { findWantedHits } from "@/server/traffic/enforcement";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, ButtonLink, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { TRAFFIC_CONTROL_OUTCOME, TRAFFIC_EVIDENCE_KIND, TRAFFIC_FINE_STATUS, TRAFFIC_VEHICLE_STATUS, TRAFFIC_VEHICLE_TYPE, DANGER_LEVEL, labelOf } from "@/lib/labels";
import { fmtBytes, fmtDate, fmtDateTime } from "@/lib/format";
import { fmtClassText, fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { EntityHistory } from "../../entity-history";
import { EvidenceForm } from "../../traffic-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.ctl.detail") };
}

export default async function ControlDetailPage({ params, searchParams }: PageProps<"/traffic/controls/[id]">) {
  const actor = await requirePermission("traffic:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let c;
  try {
    c = await getControl(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const hits = await findWantedHits(c.driverPersonId, c.plateNumber);
  const outcome = labelOf(TRAFFIC_CONTROL_OUTCOME, c.outcome, locale);
  const vStatus = c.vehicle ? labelOf(TRAFFIC_VEHICLE_STATUS, c.vehicle.status, locale) : null;
  const alertVehicle = c.vehicle && (c.vehicle.status === "STOLEN" || c.vehicle.status === "SEIZED");
  const canEvidence = actor.permissions.has("traffic:evidence_upload");
  const fine = c.ticket?.fine;
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("traffic.eyebrow")}
        title={c.number}
        subtitle={`${fmtDateTime(c.controlledAt, locale)} · ${c.location}`}
        breadcrumbs={[{ href: "/traffic/controls", label: t("traffic.controls.title") }, { label: c.number }]}
        actions={c.ticket ? <ButtonLink href={`/traffic/tickets/${c.ticket.id}`}>{t("traffic.ctl.viewPv")}</ButtonLink> : null}
      />
      {sp.created ? <Alert tone="success">{c.ticket ? t("traffic.ctl.createdWithPv", { pv: c.ticket.number }) : t("traffic.ctl.createdCompliant")}</Alert> : null}
      {hits.map((h) => {
        const dl = labelOf(DANGER_LEVEL, h.dangerLevel, locale);
        return (
          <Alert key={h.id} tone="danger" title={t("traffic.alert.wantedTitle")}>
            {t("traffic.alert.wantedBody", { name: h.name, number: h.number })} <Badge tone={dl.tone}>{dl.label}</Badge> — {h.offense}. {t("traffic.alert.wantedAction")}{" "}
            <Link href={`/wanted/${h.id}`} className="font-semibold underline">
              {h.number}
            </Link>
          </Alert>
        );
      })}
      {alertVehicle ? <Alert tone="danger">{t("traffic.alert.vehicleStatus", { status: vStatus?.label ?? "" })}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t("traffic.ctl.circumstances")}>
          <DL
            cols={1}
            items={[
              { label: t("traffic.ctl.outcome"), value: <Badge tone={outcome.tone}>{outcome.label}</Badge> },
              { label: t("traffic.ctl.when"), value: fmtDateTime(c.controlledAt, locale) },
              { label: t("traffic.ctl.location"), value: c.location },
              {
                label: t("traffic.ctl.gps"),
                value: c.latitude != null && c.longitude != null ? (
                  <a href={`https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=17/${c.latitude}/${c.longitude}`} target="_blank" rel="noopener noreferrer" className="font-mono text-blue hover:underline">
                    {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}
                  </a>
                ) : (
                  "—"
                ),
              },
              { label: t("traffic.col.officer"), value: `${c.officer.firstName} ${c.officer.lastName}${c.officer.officer ? ` · ${c.officer.officer.badgeNumber}` : ""}` },
              { label: t("traffic.ctl.station"), value: c.station.name },
            ]}
          />
        </Card>
        <Card title={t("traffic.ctl.driver")}>
          {c.driverPerson ? (
            <DL
              cols={1}
              items={[
                { label: t("traffic.driver.person"), value: `${c.driverPerson.lastName} ${c.driverPerson.firstName}` },
                { label: t("traffic.driver.personNumber"), value: <span className="font-mono">{c.driverPerson.number}</span> },
                { label: t("traffic.driver.licenseNumber"), value: c.driver?.licenseNumber ?? c.licenseNumber ?? "—" },
                { label: t("traffic.driver.licenseCategory"), value: c.driver?.licenseCategory ?? "—" },
                { label: t("traffic.driver.licenseExpiresAt"), value: c.driver?.licenseExpiresAt ? fmtDate(c.driver.licenseExpiresAt, locale) : "—" },
              ]}
            />
          ) : (
            <p className="text-sm text-slate">{t("traffic.ctl.noDriver")}</p>
          )}
          {c.driver ? (
            <p className="mt-3 text-sm">
              <Link href={`/traffic/drivers/${c.driver.id}`} className="font-semibold text-blue hover:underline">
                {t("traffic.driver.openProfile")}
              </Link>
            </p>
          ) : null}
        </Card>
        <Card title={t("traffic.ctl.vehicle")}>
          <DL
            cols={1}
            items={[
              { label: t("traffic.veh.plate"), value: <span className="font-mono font-bold">{c.plateNumber ?? "—"}</span> },
              { label: t("traffic.veh.type"), value: labelOf(TRAFFIC_VEHICLE_TYPE, c.vehicleType, locale).label },
              { label: t("traffic.veh.makeModel"), value: [c.vehicle?.make ?? c.vehicleMake, c.vehicle?.model].filter(Boolean).join(" ") || "—" },
              { label: t("traffic.veh.color"), value: c.vehicle?.color ?? c.vehicleColor ?? "—" },
              { label: t("traffic.veh.status"), value: vStatus ? <Badge tone={vStatus.tone}>{vStatus.label}</Badge> : "—" },
            ]}
          />
          {c.vehicle ? (
            <p className="mt-3 text-sm">
              <Link href={`/traffic/vehicles/${c.vehicle.id}`} className="font-semibold text-blue hover:underline">
                {t("traffic.veh.openProfile")}
              </Link>
            </p>
          ) : null}
        </Card>
      </div>

      <Card title={t("traffic.ctl.offences")} actions={fine ? <Badge tone={labelOf(TRAFFIC_FINE_STATUS, fine.status, locale).tone}>{labelOf(TRAFFIC_FINE_STATUS, fine.status, locale).label}</Badge> : null}>
        {!c.ticket ? (
          <EmptyState>{t("traffic.ctl.noOffence")}</EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>{t("traffic.col.offence")}</th>
                  <th>{t("traffic.col.class")}</th>
                  <th>{t("traffic.col.legalRef")}</th>
                  <th className="text-end">{t("traffic.col.flatFine")}</th>
                </tr>
              </thead>
              <tbody>
                {c.ticket.offences.map((o) => (
                  <tr key={o.id}>
                    <td data-label={t("traffic.col.offence")}>{o.name}</td>
                    <td data-label={t("traffic.col.class")}>{fmtClassText(o.classText)}</td>
                    <td data-label={t("traffic.col.legalRef")} className="text-xs">
                      {o.legalReference}
                    </td>
                    <td data-label={t("traffic.col.flatFine")} className="text-end font-semibold tabular-nums">
                      {o.amountFcfa === null ? <span className="text-violet">{o.amountText}</span> : fmtFcfa(o.amountFcfa)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <p className="mt-3 text-sm">
              {t("traffic.pv.total")} : <span className="text-lg font-extrabold tabular-nums text-navy">{c.ticket.totalFineFcfa > 0 ? fmtFcfa(c.ticket.totalFineFcfa) : "—"}</span>
              {fine ? (
                <>
                  {" · "}
                  <Link href={`/traffic/fines/${fine.id}`} className="font-mono font-semibold text-blue hover:underline">
                    {fine.number}
                  </Link>
                </>
              ) : null}
            </p>
            {c.ticket.hasNonSettleableOffence ? (
              <Alert tone="warning" className="mt-3">
                {t("traffic.pv.delitNotice")}
              </Alert>
            ) : null}
          </>
        )}
      </Card>

      {c.observations ? (
        <Card title={t("traffic.ctl.observations")}>
          <p className="whitespace-pre-wrap text-sm text-ink">{c.observations}</p>
        </Card>
      ) : null}

      <Card title={t("traffic.ev.title", { n: c.evidence.length })}>
        {c.evidence.length === 0 ? (
          <EmptyState>{t("traffic.ev.none")}</EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {c.evidence.map((e) => {
              const v = e.document.versions[0];
              const href = `/api/v1/documents/${e.documentId}/download`;
              return (
                <li key={e.id} className="overflow-hidden rounded-lg border border-line">
                  {e.kind === "PHOTO" ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={href} alt={e.caption ?? v?.fileName ?? ""} className="h-36 w-full bg-mist object-cover" loading="lazy" />
                    </a>
                  ) : (
                    <a href={href} className="flex h-36 items-center justify-center bg-mist text-sm font-semibold text-blue hover:underline">
                      {labelOf(TRAFFIC_EVIDENCE_KIND, e.kind, locale).label}
                    </a>
                  )}
                  <div className="p-2 text-xs text-slate">
                    <p className="truncate font-semibold text-ink">{e.caption ?? v?.fileName}</p>
                    <p>
                      {fmtDateTime(e.createdAt, locale)} · {e.uploadedBy.firstName} {e.uploadedBy.lastName}
                    </p>
                    {v ? (
                      <p className="font-mono" title={v.sha256}>
                        {fmtBytes(v.sizeBytes)} · {v.sha256.slice(0, 10)}…
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {canEvidence ? (
          <div className="mt-5 max-w-md border-t border-line pt-4">
            <h3 className="mb-2 text-sm font-bold text-navy">{t("traffic.ev.add")}</h3>
            <EvidenceForm controlId={c.id} />
          </div>
        ) : null}
      </Card>

      {c.case || c.incident ? (
        <Card title={t("traffic.ctl.links")}>
          <ul className="space-y-1 text-sm">
            {c.case ? (
              <li>
                {t("traffic.ctl.linkedCase")} :{" "}
                <Link href={`/cases/${c.case.id}`} className="font-mono font-semibold text-blue hover:underline">
                  {c.case.number}
                </Link>{" "}
                — {c.case.title}
              </li>
            ) : null}
            {c.incident ? (
              <li>
                {t("traffic.ctl.linkedIncident")} :{" "}
                <Link href={`/incidents/${c.incident.id}`} className="font-mono font-semibold text-blue hover:underline">
                  {c.incident.number}
                </Link>
              </li>
            ) : null}
          </ul>
        </Card>
      ) : null}

      <EntityHistory entities={[{ type: "TrafficControl", id: c.id }, ...(c.ticket ? [{ type: "TrafficTicket", id: c.ticket.id }] : []), ...(fine ? [{ type: "TrafficFine", id: fine.id }] : [])]} locale={locale} t={t} />
    </div>
  );
}

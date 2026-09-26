import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requirePermission } from "@/server/auth/dal";
import { getTicket } from "@/server/traffic/queries";
import { env } from "@/server/env";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, PageHeader, Table } from "@/components/ui";
import { TRAFFIC_FINE_STATUS, TRAFFIC_TICKET_STATUS, TRAFFIC_VEHICLE_TYPE, labelOf } from "@/lib/labels";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { fmtClassText, fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { EntityHistory } from "../../entity-history";
import { CancelTicketForm, OpenCaseButton, PrintButton } from "../../traffic-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.pv.detail") };
}

export default async function TicketDetailPage({ params }: PageProps<"/traffic/tickets/[id]">) {
  const actor = await requirePermission("traffic:view");
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  let pv;
  try {
    pv = await getTicket(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const verifyUrl = `${env.appUrl}/verify/pv/${pv.verificationToken}`;
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 220, errorCorrectionLevel: "M" });
  const st = labelOf(TRAFFIC_TICKET_STATUS, pv.status, locale);
  const fine = pv.fine;
  const fs = fine ? labelOf(TRAFFIC_FINE_STATUS, fine.status, locale) : null;
  const d = pv.driverPerson;
  const cni = d && pv.showIdentity ? d.identifiers.find((i) => i.type === "NATIONAL_ID")?.value : null;
  const canCancel = actor.permissions.has("traffic:ticket_cancel") && pv.status === "ISSUED" && (!fine || fine.amountPaidFcfa === 0);
  const canOpenCase = actor.permissions.has("cases:create") && !pv.control.caseId;
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("traffic.eyebrow")}
        title={pv.number}
        subtitle={`${t("traffic.pv.electronic")} · ${fmtDateTime(pv.issuedAt, locale)}`}
        breadcrumbs={[{ href: "/traffic/tickets", label: t("traffic.pv.listTitle") }, { label: pv.number }]}
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <a href={`/api/v1/traffic/tickets/${pv.id}/pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white hover:bg-blue-dark">
              {t("traffic.pv.viewPdf")}
            </a>
            <a href={`/api/v1/traffic/tickets/${pv.id}/pdf?download=1`} className="inline-flex items-center rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-navy hover:bg-mist">
              {t("common.download")} PDF
            </a>
            <PrintButton>{t("traffic.pv.print")}</PrintButton>
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={st.tone}>{st.label}</Badge>
        <Badge tone={pv.sealValid ? "success" : "danger"}>{pv.sealValid ? t("traffic.pv.sealValid") : t("traffic.pv.sealInvalid")}</Badge>
        {fs ? <Badge tone={fs.tone}>{fs.label}</Badge> : null}
      </div>
      {!pv.sealValid ? <Alert tone="danger">{t("traffic.pv.sealInvalidBody")}</Alert> : null}
      {pv.status === "CANCELLED" ? (
        <Alert tone="warning" title={t("traffic.pv.cancelledTitle")}>
          {pv.cancellationReason} — {pv.cancelledBy ? `${pv.cancelledBy.firstName} ${pv.cancelledBy.lastName}` : ""} {pv.cancelledAt ? `· ${fmtDateTime(pv.cancelledAt, locale)}` : ""}
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t("traffic.ctl.circumstances")}>
          <DL
            cols={1}
            items={[
              { label: t("traffic.pv.number"), value: <span className="font-mono">{pv.number}</span> },
              { label: t("traffic.ctl.when"), value: fmtDateTime(pv.control.controlledAt, locale) },
              { label: t("traffic.ctl.location"), value: pv.control.location },
              { label: t("traffic.col.station"), value: pv.station.name },
              { label: t("traffic.col.officer"), value: `${pv.issuedBy.firstName} ${pv.issuedBy.lastName}` },
              { label: t("traffic.pv.rankBadge"), value: [pv.issuedBy.officer?.rank.name, pv.issuedBy.officer?.badgeNumber].filter(Boolean).join(" · ") || "—" },
              { label: t("traffic.col.control"), value: <Link href={`/traffic/controls/${pv.control.id}`} className="font-mono text-blue hover:underline">{pv.control.number}</Link> },
            ]}
          />
        </Card>
        <Card title={t("traffic.ctl.driver")}>
          <DL
            cols={1}
            items={[
              { label: t("traffic.driver.person"), value: d ? `${d.lastName} ${d.firstName}` : "—" },
              { label: t("traffic.driver.birthDate"), value: d?.dateOfBirth && pv.showIdentity ? fmtDate(d.dateOfBirth, locale) : "—" },
              { label: t("traffic.driver.licenseNumber"), value: d?.trafficDriver?.licenseNumber ?? pv.control.licenseNumber ?? "—" },
              { label: t("traffic.driver.licenseCategory"), value: d?.trafficDriver?.licenseCategory ?? "—" },
              { label: t("traffic.driver.cni"), value: cni ?? "—" },
              { label: t("traffic.driver.phone"), value: d?.phone && pv.showIdentity ? d.phone : "—" },
            ]}
          />
        </Card>
        <Card title={t("traffic.ctl.vehicle")}>
          <DL
            cols={1}
            items={[
              { label: t("traffic.veh.plate"), value: <span className="font-mono font-bold">{pv.plateNumber ?? "—"}</span> },
              { label: t("traffic.veh.type"), value: labelOf(TRAFFIC_VEHICLE_TYPE, pv.control.vehicleType, locale).label },
              { label: t("traffic.veh.makeModel"), value: [pv.control.vehicle?.make ?? pv.control.vehicleMake, pv.control.vehicle?.model].filter(Boolean).join(" ") || "—" },
              { label: t("traffic.veh.color"), value: pv.control.vehicle?.color ?? pv.control.vehicleColor ?? "—" },
              { label: t("traffic.veh.registrationCard"), value: pv.control.vehicle?.registrationCardNumber ?? "—" },
            ]}
          />
        </Card>
      </div>

      <Card title={t("traffic.pv.offences")}>
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
            {pv.offences.map((o) => (
              <tr key={o.id}>
                <td data-label={t("traffic.col.offence")}>
                  {o.name}
                  <span className="block font-mono text-[11px] text-slate">{o.code}</span>
                </td>
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md bg-mist p-3">
          <span className="text-sm font-semibold text-navy">{t("traffic.pv.total")}</span>
          <span className="text-xl font-extrabold tabular-nums text-navy">{pv.totalFineFcfa > 0 ? fmtFcfa(pv.totalFineFcfa) : "—"}</span>
        </div>
        {pv.hasNonSettleableOffence ? (
          <Alert tone="warning" className="mt-3">
            {t("traffic.pv.delitNotice")}
          </Alert>
        ) : null}
        {fine ? (
          <p className="mt-3 text-sm">
            {t("traffic.col.fine")} :{" "}
            <Link href={`/traffic/fines/${fine.id}`} className="font-mono font-semibold text-blue hover:underline">
              {fine.number}
            </Link>{" "}
            — {fmtFcfa(fine.amountPaidFcfa)} / {fmtFcfa(fine.amountFcfa)}
            {fine.dueDate ? ` · ${t("traffic.fine.dueDate")} ${fmtDate(fine.dueDate, locale)}` : ""}
          </p>
        ) : null}
        {pv.observations ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-ink">
            <span className="font-semibold">{t("traffic.ctl.observations")} :</span> {pv.observations}
          </p>
        ) : null}
      </Card>

      <Card title={t("traffic.pv.verification")} description={t("traffic.pv.verificationHint")}>
        <div className="flex flex-wrap items-start gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={t("traffic.pv.qrAlt")} width={140} height={140} className="rounded-md border border-line" />
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p className="break-all font-mono text-xs text-blue">{verifyUrl}</p>
            <p className="text-xs text-slate">
              {t("traffic.pv.sealedBy", { name: `${pv.issuedBy.firstName} ${pv.issuedBy.lastName}`, date: fmtDateTime(pv.signedAt, locale) })}
            </p>
            <p className="break-all font-mono text-[11px] text-slate">SHA-256 {pv.contentHash}</p>
            <p className="text-xs text-slate">{t("traffic.pv.sealDisclaimer")}</p>
          </div>
        </div>
      </Card>

      {canCancel || canOpenCase ? (
        <Card title={t("traffic.pv.actions")} className="no-print">
          <div className="grid gap-6 md:grid-cols-2">
            {canOpenCase ? (
              <div>
                <h3 className="mb-1 text-sm font-bold text-navy">{t("traffic.pv.openCase")}</h3>
                <p className="mb-3 text-xs text-slate">{t("traffic.pv.openCaseHint")}</p>
                <OpenCaseButton ticketId={pv.id} />
              </div>
            ) : null}
            {canCancel ? (
              <div>
                <h3 className="mb-1 text-sm font-bold text-danger">{t("traffic.pv.cancel")}</h3>
                <CancelTicketForm ticketId={pv.id} />
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <EntityHistory entities={[{ type: "TrafficTicket", id: pv.id }, { type: "TrafficControl", id: pv.control.id }, ...(fine ? [{ type: "TrafficFine", id: fine.id }] : [])]} locale={locale} t={t} />
    </div>
  );
}

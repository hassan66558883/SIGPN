import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getVehicle } from "@/server/traffic/queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { DANGER_LEVEL, TRAFFIC_FINE_STATUS, TRAFFIC_TICKET_STATUS, TRAFFIC_VEHICLE_DOC_TYPE, TRAFFIC_VEHICLE_STATUS, TRAFFIC_VEHICLE_TYPE, labelOf } from "@/lib/labels";
import { fmtDate, fmtDateTime, toInputDate } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { VehicleDocumentForm, VehicleForm } from "../../traffic-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.veh.profile") };
}

export default async function VehicleDetailPage({ params, searchParams }: PageProps<"/traffic/vehicles/[id]">) {
  const actor = await requirePermission("traffic:vehicles_view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let v;
  try {
    v = await getVehicle(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const st = labelOf(TRAFFIC_VEHICLE_STATUS, v.status, locale);
  const now = new Date();
  const canManage = actor.permissions.has("traffic:vehicles_manage");
  const insExpired = v.insuranceExpiresAt && v.insuranceExpiresAt < now;
  const techExpired = v.technicalInspectionExpiresAt && v.technicalInspectionExpiresAt < now;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow={t("traffic.eyebrow")} title={v.plateNumber} subtitle={[v.make, v.model, v.color].filter(Boolean).join(" · ") || undefined} breadcrumbs={[{ href: "/traffic/vehicles", label: t("traffic.veh.listTitle") }, { label: v.plateNumber }]} />
      {sp.created ? <Alert tone="success">{t("traffic.veh.created")}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Badge tone={st.tone}>{st.label}</Badge>
        {insExpired ? <Badge tone="danger">{t("traffic.veh.insuranceExpiredBadge")}</Badge> : null}
        {techExpired ? <Badge tone="danger">{t("traffic.veh.inspectionExpiredBadge")}</Badge> : null}
      </div>
      {v.wanted.map((w) => (
        <Alert key={w.id} tone="danger" title={t("traffic.alert.wantedTitle")}>
          {t("traffic.alert.wantedVehicle", { number: w.number, name: `${w.person.lastName} ${w.person.firstName}` })} <Badge tone={labelOf(DANGER_LEVEL, w.dangerLevel, locale).tone}>{labelOf(DANGER_LEVEL, w.dangerLevel, locale).label}</Badge> — {w.offense}
        </Alert>
      ))}
      {v.status === "STOLEN" || v.status === "SEIZED" ? <Alert tone="danger">{t("traffic.alert.vehicleStatus", { status: st.label })}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("traffic.veh.identity")}>
          <DL
            cols={2}
            items={[
              { label: t("traffic.veh.plate"), value: <span className="font-mono font-bold">{v.plateNumber}</span> },
              { label: t("traffic.veh.registrationCard"), value: v.registrationCardNumber ?? "—" },
              { label: t("traffic.veh.makeModel"), value: [v.make, v.model].filter(Boolean).join(" ") || "—" },
              { label: t("traffic.veh.color"), value: v.color ?? "—" },
              { label: t("traffic.veh.type"), value: labelOf(TRAFFIC_VEHICLE_TYPE, v.vehicleType, locale).label },
              { label: t("traffic.veh.year"), value: v.year ?? "—" },
              { label: t("traffic.veh.chassis"), value: <span className="font-mono">{v.chassisNumber ?? "—"}</span> },
              { label: t("traffic.veh.owner"), value: v.owner ? (v.showOwner ? <Link href={`/persons/${v.owner.id}`} className="text-blue hover:underline">{v.owner.lastName} {v.owner.firstName}</Link> : `${v.owner.lastName} ${v.owner.firstName[0]}.`) : "—" },
              { label: t("traffic.veh.insurance"), value: `${v.insuranceCompany ?? "—"}${v.insurancePolicyNumber ? ` · ${v.insurancePolicyNumber}` : ""}` },
              { label: t("traffic.veh.insuranceExpires"), value: <span className={insExpired ? "font-semibold text-danger" : ""}>{v.insuranceExpiresAt ? fmtDate(v.insuranceExpiresAt, locale) : "—"}</span> },
              { label: t("traffic.veh.inspectionExpires"), value: <span className={techExpired ? "font-semibold text-danger" : ""}>{v.technicalInspectionExpiresAt ? fmtDate(v.technicalInspectionExpiresAt, locale) : "—"}</span> },
            ]}
          />
        </Card>
        {canManage ? (
          <Card title={t("traffic.veh.editTitle")}>
            <VehicleForm
              mode="edit"
              values={{ id: v.id, plateNumber: v.plateNumber, registrationCardNumber: v.registrationCardNumber ?? "", make: v.make ?? "", model: v.model ?? "", color: v.color ?? "", vehicleType: v.vehicleType, year: v.year ? String(v.year) : "", chassisNumber: v.chassisNumber ?? "", insuranceCompany: v.insuranceCompany ?? "", insurancePolicyNumber: v.insurancePolicyNumber ?? "", insuranceExpiresAt: toInputDate(v.insuranceExpiresAt), technicalInspectionExpiresAt: toInputDate(v.technicalInspectionExpiresAt), status: v.status, notes: v.notes ?? "" }}
            />
          </Card>
        ) : null}
      </div>

      <Card title={t("traffic.vdoc.title")} padded={false}>
        {v.documents.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("traffic.vdoc.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("traffic.vdoc.type")}</th>
                <th>{t("traffic.vdoc.number")}</th>
                <th>{t("traffic.vdoc.issuedAt")}</th>
                <th>{t("traffic.vdoc.expiresAt")}</th>
              </tr>
            </thead>
            <tbody>
              {v.documents.map((d) => (
                <tr key={d.id}>
                  <td data-label={t("traffic.vdoc.type")}>{labelOf(TRAFFIC_VEHICLE_DOC_TYPE, d.type, locale).label}</td>
                  <td data-label={t("traffic.vdoc.number")} className="font-mono text-xs">
                    {d.number ?? "—"}
                  </td>
                  <td data-label={t("traffic.vdoc.issuedAt")} className="text-xs">
                    {d.issuedAt ? fmtDate(d.issuedAt, locale) : "—"}
                  </td>
                  <td data-label={t("traffic.vdoc.expiresAt")} className={`text-xs ${d.expiresAt && d.expiresAt < now ? "font-semibold text-danger" : ""}`}>
                    {d.expiresAt ? fmtDate(d.expiresAt, locale) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {canManage ? (
          <div className="border-t border-line p-4 sm:p-5">
            <h3 className="mb-3 text-sm font-bold text-navy">{t("traffic.vdoc.add")}</h3>
            <div className="max-w-xl">
              <VehicleDocumentForm vehicleId={v.id} />
            </div>
          </div>
        ) : null}
      </Card>

      <Card title={t("traffic.veh.historyTickets")} description={t("traffic.driver.historyHint")} padded={false}>
        {v.tickets.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("traffic.pv.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("traffic.col.pv")}</th>
                <th>{t("traffic.col.offence")}</th>
                <th className="text-end">{t("traffic.col.amount")}</th>
                <th>{t("traffic.pv.status")}</th>
              </tr>
            </thead>
            <tbody>
              {v.tickets.map((x) => (
                <tr key={x.id}>
                  <td data-label={t("traffic.col.pv")}>
                    <Link href={`/traffic/tickets/${x.id}`} className="font-mono font-semibold text-blue hover:underline">
                      {x.number}
                    </Link>
                    <span className="block text-xs text-slate">{fmtDateTime(x.issuedAt, locale)}</span>
                  </td>
                  <td data-label={t("traffic.col.offence")} className="text-xs">
                    {x.offences.map((o) => o.name).join(" ; ")}
                  </td>
                  <td data-label={t("traffic.col.amount")} className="text-end tabular-nums">
                    {x.totalFineFcfa > 0 ? fmtFcfa(x.totalFineFcfa) : "—"}
                  </td>
                  <td data-label={t("traffic.pv.status")}>
                    <Badge tone={labelOf(TRAFFIC_TICKET_STATUS, x.status, locale).tone}>{labelOf(TRAFFIC_TICKET_STATUS, x.status, locale).label}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title={t("traffic.veh.historyFines")} padded={false}>
        {v.fines.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("traffic.fine.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("traffic.col.fine")}</th>
                <th className="text-end">{t("traffic.col.amount")}</th>
                <th>{t("traffic.fine.status")}</th>
              </tr>
            </thead>
            <tbody>
              {v.fines.map((f) => (
                <tr key={f.id}>
                  <td data-label={t("traffic.col.fine")}>
                    <Link href={`/traffic/fines/${f.id}`} className="font-mono font-semibold text-blue hover:underline">
                      {f.number}
                    </Link>
                  </td>
                  <td data-label={t("traffic.col.amount")} className="text-end tabular-nums">
                    {fmtFcfa(f.amountPaidFcfa)} / {fmtFcfa(f.amountFcfa)}
                  </td>
                  <td data-label={t("traffic.fine.status")}>
                    <Badge tone={labelOf(TRAFFIC_FINE_STATUS, f.status, locale).tone}>{labelOf(TRAFFIC_FINE_STATUS, f.status, locale).label}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

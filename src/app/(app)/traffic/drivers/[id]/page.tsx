import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getDriver } from "@/server/traffic/queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, EmptyState, PageHeader, StatCard, Table } from "@/components/ui";
import { DANGER_LEVEL, TRAFFIC_FINE_STATUS, TRAFFIC_PAYMENT_METHOD, TRAFFIC_TICKET_STATUS, labelOf } from "@/lib/labels";
import { fmtDate, fmtDateTime, toInputDate } from "@/lib/format";
import { fmtFcfa, licenceState } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { DriverForm } from "../../traffic-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.driver.profile") };
}

export default async function DriverDetailPage({ params, searchParams }: PageProps<"/traffic/drivers/[id]">) {
  const actor = await requirePermission("traffic:drivers_view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let d;
  try {
    d = await getDriver(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const h = d.history;
  const ls = licenceState(d.licenseExpiresAt);
  const cni = d.showIdentity ? d.person.identifiers.find((i) => i.type === "NATIONAL_ID")?.value : null;
  const outstanding = Math.max(0, h.totalFines - h.totalPaid);
  return (
    <div className="space-y-4">
      <PageHeader eyebrow={t("traffic.eyebrow")} title={`${d.person.lastName} ${d.person.firstName}`} subtitle={`${d.person.number}${d.licenseNumber ? ` · ${d.licenseNumber}` : ""}`} breadcrumbs={[{ href: "/traffic/drivers", label: t("traffic.driver.listTitle") }, { label: `${d.person.lastName} ${d.person.firstName}` }]} />
      {sp.created ? <Alert tone="success">{t("traffic.driver.created")}</Alert> : null}
      {d.wanted.map((w) => (
        <Alert key={w.id} tone="danger" title={t("traffic.alert.wantedTitle")}>
          {t("traffic.alert.wantedBody", { name: `${d.person.lastName} ${d.person.firstName}`, number: w.number })} <Badge tone={labelOf(DANGER_LEVEL, w.dangerLevel, locale).tone}>{labelOf(DANGER_LEVEL, w.dangerLevel, locale).label}</Badge> — {w.offense}
        </Alert>
      ))}
      {ls === "expired" ? <Alert tone="warning">{t("traffic.driver.licenceExpiredAlert")}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("traffic.driver.tickets")} value={h.tickets.length} tone="info" />
        <StatCard label={t("traffic.driver.totalFines")} value={<span className="text-2xl">{fmtFcfa(h.totalFines)}</span>} tone="neutral" />
        <StatCard label={t("traffic.kpi.paid")} value={<span className="text-2xl">{fmtFcfa(h.totalPaid)}</span>} tone="success" />
        <StatCard label={t("traffic.kpi.remaining")} value={<span className="text-2xl">{fmtFcfa(outstanding)}</span>} tone={outstanding > 0 ? "danger" : "neutral"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("traffic.driver.identity")}>
          <DL
            cols={2}
            items={[
              { label: t("traffic.driver.person"), value: <Link href={`/persons/${d.person.id}`} className="text-blue hover:underline">{d.person.lastName} {d.person.firstName}</Link> },
              { label: t("traffic.driver.birthDate"), value: d.showIdentity && d.person.dateOfBirth ? fmtDate(d.person.dateOfBirth, locale) : "—" },
              { label: t("traffic.driver.cni"), value: cni ?? "—" },
              { label: t("traffic.driver.phone"), value: d.showIdentity ? d.person.phone ?? "—" : "—" },
              { label: t("traffic.driver.address"), value: d.showIdentity ? [d.person.address, d.person.city].filter(Boolean).join(", ") || "—" : d.person.city ?? "—" },
              { label: t("traffic.driver.licenseNumber"), value: <span className="font-mono">{d.licenseNumber ?? "—"}</span> },
              { label: t("traffic.driver.licenseCategory"), value: d.licenseCategory ?? "—" },
              { label: t("traffic.driver.licenseIssuedAt"), value: d.licenseIssuedAt ? fmtDate(d.licenseIssuedAt, locale) : "—" },
              { label: t("traffic.driver.licenseExpiresAt"), value: d.licenseExpiresAt ? fmtDate(d.licenseExpiresAt, locale) : "—" },
              { label: t("traffic.driver.licenseIssuedBy"), value: d.licenseIssuedBy ?? "—" },
            ]}
          />
          {!d.showIdentity ? <p className="mt-3 text-xs text-slate">{t("traffic.driver.limitedView")}</p> : null}
        </Card>
        {actor.permissions.has("traffic:drivers_manage") ? (
          <Card title={t("traffic.driver.editTitle")}>
            <DriverForm mode="edit" values={{ id: d.id, licenseNumber: d.licenseNumber ?? "", licenseCategory: d.licenseCategory ?? "", licenseIssuedAt: toInputDate(d.licenseIssuedAt), licenseExpiresAt: toInputDate(d.licenseExpiresAt), licenseIssuedBy: d.licenseIssuedBy ?? "", notes: d.notes ?? "" }} />
          </Card>
        ) : null}
      </div>

      <Card title={t("traffic.driver.historyTickets")} description={t("traffic.driver.historyHint")} padded={false}>
        {h.tickets.length === 0 ? (
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
              {h.tickets.map((x) => (
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("traffic.driver.historyFines")} padded={false}>
          {h.fines.length === 0 ? (
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
                {h.fines.map((f) => (
                  <tr key={f.id}>
                    <td data-label={t("traffic.col.fine")}>
                      <Link href={`/traffic/fines/${f.id}`} className="font-mono font-semibold text-blue hover:underline">
                        {f.number}
                      </Link>
                      <span className="block text-xs text-slate">{f.ticket.number}</span>
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
        <Card title={t("traffic.driver.historyPayments")} padded={false}>
          {h.payments.length === 0 ? (
            <div className="p-5">
              <EmptyState>{t("traffic.pay.none")}</EmptyState>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t("traffic.pay.date")}</th>
                  <th>{t("traffic.pay.method")}</th>
                  <th className="text-end">{t("traffic.col.amount")}</th>
                  <th>{t("traffic.pay.receipt")}</th>
                </tr>
              </thead>
              <tbody>
                {h.payments.map((p) => (
                  <tr key={p.id} className={p.status === "VOIDED" ? "opacity-60" : ""}>
                    <td data-label={t("traffic.pay.date")} className="text-xs">
                      {fmtDate(p.paidAt, locale)}
                    </td>
                    <td data-label={t("traffic.pay.method")} className="text-xs">
                      {labelOf(TRAFFIC_PAYMENT_METHOD, p.method, locale).label}
                    </td>
                    <td data-label={t("traffic.col.amount")} className="text-end tabular-nums">
                      {fmtFcfa(p.amountFcfa)}
                    </td>
                    <td data-label={t("traffic.pay.receipt")} className="font-mono text-xs">
                      {p.receipt?.number ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

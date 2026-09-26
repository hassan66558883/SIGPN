import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requirePermission } from "@/server/auth/dal";
import { getReceipt } from "@/server/traffic/queries";
import { env } from "@/server/env";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, PageHeader } from "@/components/ui";
import { TRAFFIC_FINE_STATUS, TRAFFIC_PAYMENT_METHOD, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { PrintButton } from "../../traffic-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.rcpt.title") };
}

export default async function ReceiptPage({ params, searchParams }: PageProps<"/traffic/receipts/[id]">) {
  const actor = await requirePermission("traffic:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let r;
  try {
    r = await getReceipt(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const verifyUrl = `${env.appUrl}/verify/receipt/${r.verificationToken}`;
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 220, errorCorrectionLevel: "M" });
  const fs = labelOf(TRAFFIC_FINE_STATUS, r.fine.status, locale);
  const voided = r.payment.status === "VOIDED";
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        eyebrow={t("traffic.eyebrow")}
        title={r.number}
        subtitle={t("traffic.rcpt.title")}
        breadcrumbs={[{ href: "/traffic/fines", label: t("traffic.fine.listTitle") }, { href: `/traffic/fines/${r.fine.id}`, label: r.fine.number }, { label: r.number }]}
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <a href={`/api/v1/traffic/receipts/${r.id}/pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white hover:bg-blue-dark">
              {t("traffic.pv.viewPdf")}
            </a>
            <a href={`/api/v1/traffic/receipts/${r.id}/pdf?download=1`} className="inline-flex items-center rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-navy hover:bg-mist">
              {t("common.download")} PDF
            </a>
            <PrintButton>{t("traffic.pv.print")}</PrintButton>
          </div>
        }
      />
      {sp.created ? <Alert tone="success">{t("traffic.rcpt.created")}</Alert> : null}
      {voided ? <Alert tone="danger">{t("traffic.rcpt.voided")}</Alert> : null}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate">{t("traffic.rcpt.amountPaid")}</p>
            <p className={`text-4xl font-extrabold tabular-nums ${voided ? "text-slate line-through" : "text-navy"}`}>{fmtFcfa(r.amountFcfa)}</p>
            <p className="mt-2 text-sm text-slate">{fmtDateTime(r.payment.paidAt, locale)}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={t("traffic.pv.qrAlt")} width={130} height={130} className="rounded-md border border-line" />
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <DL
            cols={2}
            items={[
              { label: t("traffic.rcpt.number"), value: <span className="font-mono">{r.number}</span> },
              { label: t("traffic.col.pv"), value: <Link href={`/traffic/tickets/${r.fine.ticket.id}`} className="font-mono text-blue hover:underline">{r.fine.ticket.number}</Link> },
              { label: t("traffic.col.fine"), value: <Link href={`/traffic/fines/${r.fine.id}`} className="font-mono text-blue hover:underline">{r.fine.number}</Link> },
              { label: t("traffic.fine.status"), value: <Badge tone={fs.tone}>{fs.label}</Badge> },
              { label: t("traffic.pay.method"), value: labelOf(TRAFFIC_PAYMENT_METHOD, r.payment.method, locale).label },
              { label: t("traffic.pay.reference"), value: <span className="font-mono">{r.payment.transactionReference ?? "—"}</span> },
              { label: t("traffic.pay.point"), value: r.payment.paymentPoint ?? r.payment.station?.name ?? "—" },
              { label: t("traffic.pay.receivedBy"), value: `${r.payment.receivedBy.firstName} ${r.payment.receivedBy.lastName}${r.payment.receivedBy.officer ? ` · ${r.payment.receivedBy.officer.badgeNumber}` : ""}` },
              { label: t("traffic.col.driver"), value: r.fine.driverPerson ? `${r.fine.driverPerson.lastName} ${r.fine.driverPerson.firstName}` : "—" },
              { label: t("traffic.veh.plate"), value: <span className="font-mono">{r.fine.plateNumber ?? "—"}</span> },
            ]}
          />
        </div>
        <p className="mt-4 break-all font-mono text-[11px] text-slate">{verifyUrl}</p>
      </Card>
    </div>
  );
}

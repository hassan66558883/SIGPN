import type { Metadata } from "next";
import { headers } from "next/headers";
import { verifyReceiptByToken } from "@/server/traffic/queries";
import { contextFromHeaders } from "@/server/request-context";
import { enforceRateLimit } from "@/server/auth/rate-limit";
import { Alert, Badge, Card, DL } from "@/components/ui";
import { TRAFFIC_FINE_STATUS, TRAFFIC_PAYMENT_METHOD, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";

export const metadata: Metadata = { title: "Vérification reçu", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function VerifyReceiptPage({ params }: PageProps<"/verify/receipt/[token]">) {
  const [{ token }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  enforceRateLimit("api", contextFromHeaders(await headers()).ip);
  const r = await verifyReceiptByToken(token);
  if (!r) {
    return (
      <Alert tone="danger" title={t("traffic.verify.notFoundTitle")}>
        {t("traffic.verify.notFoundBody")}
      </Alert>
    );
  }
  const fs = labelOf(TRAFFIC_FINE_STATUS, r.fineStatus, locale);
  return (
    <div className="space-y-4">
      {r.voided ? (
        <Alert tone="warning" title={t("traffic.verify.receiptVoided")}>
          {t("traffic.verify.receiptVoidedBody")}
        </Alert>
      ) : (
        <Alert tone="success" title={t("traffic.verify.receiptAuthentic")}>
          {t("traffic.verify.receiptAuthenticBody")}
        </Alert>
      )}
      <Card title={t("traffic.verify.receiptTitle", { number: r.number })}>
        <DL
          cols={1}
          items={[
            { label: t("traffic.rcpt.amountPaid"), value: <span className="font-bold">{fmtFcfa(r.amountFcfa)}</span> },
            { label: t("traffic.pay.date"), value: fmtDateTime(r.issuedAt, locale) },
            { label: t("traffic.pay.method"), value: labelOf(TRAFFIC_PAYMENT_METHOD, r.method, locale).label },
            { label: t("traffic.col.pv"), value: <span className="font-mono">{r.ticketNumber}</span> },
            { label: t("traffic.col.fine"), value: <span className="font-mono">{r.fineNumber}</span> },
            { label: t("traffic.fine.status"), value: <Badge tone={fs.tone}>{fs.label}</Badge> },
          ]}
        />
      </Card>
    </div>
  );
}

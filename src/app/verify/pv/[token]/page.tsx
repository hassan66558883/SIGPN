import type { Metadata } from "next";
import { headers } from "next/headers";
import { verifyTicketByToken } from "@/server/traffic/queries";
import { contextFromHeaders } from "@/server/request-context";
import { enforceRateLimit } from "@/server/auth/rate-limit";
import { Alert, Badge, Card, DL } from "@/components/ui";
import { TRAFFIC_FINE_STATUS, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtClassText, fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";

export const metadata: Metadata = { title: "Vérification PV", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Public check of a PV from its QR code. Shows authenticity and the offence lines only — no identity data beyond masked initials. */
export default async function VerifyTicketPage({ params }: PageProps<"/verify/pv/[token]">) {
  const [{ token }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  enforceRateLimit("api", contextFromHeaders(await headers()).ip);
  const r = await verifyTicketByToken(token);
  if (!r) {
    return (
      <Alert tone="danger" title={t("traffic.verify.notFoundTitle")}>
        {t("traffic.verify.notFoundBody")}
      </Alert>
    );
  }
  const fs = r.fineStatus ? labelOf(TRAFFIC_FINE_STATUS, r.fineStatus, locale) : null;
  return (
    <div className="space-y-4">
      {r.sealValid && !r.cancelled ? (
        <Alert tone="success" title={t("traffic.verify.authentic")}>
          {t("traffic.verify.authenticBody")}
        </Alert>
      ) : r.sealValid && r.cancelled ? (
        <Alert tone="warning" title={t("traffic.verify.cancelled")}>
          {t("traffic.verify.cancelledBody")}
        </Alert>
      ) : (
        <Alert tone="danger" title={t("traffic.verify.tampered")}>
          {t("traffic.verify.tamperedBody")}
        </Alert>
      )}
      <Card title={t("traffic.verify.pvTitle", { number: r.number })}>
        <DL
          cols={1}
          items={[
            { label: t("traffic.ctl.when"), value: fmtDateTime(r.issuedAt, locale) },
            { label: t("traffic.col.station"), value: r.station },
            { label: t("traffic.veh.plate"), value: <span className="font-mono">{r.plateNumber ?? "—"}</span> },
            { label: t("traffic.driver.person"), value: r.driverInitials ?? "—" },
            { label: t("traffic.pv.total"), value: <span className="font-bold">{r.totalFineFcfa > 0 ? fmtFcfa(r.totalFineFcfa) : "—"}</span> },
            { label: t("traffic.fine.status"), value: fs ? <Badge tone={fs.tone}>{fs.label}</Badge> : "—" },
          ]}
        />
        <ul className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
          {r.offences.map((o, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {o.name} <span className="text-xs text-slate">({fmtClassText(o.classText)})</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{o.amountText}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate">{t("traffic.verify.privacy")}</p>
      </Card>
    </div>
  );
}

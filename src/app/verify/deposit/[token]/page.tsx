import type { Metadata } from "next";
import { headers } from "next/headers";
import { verifySlipByToken } from "@/server/traffic/cash-queries";
import { contextFromHeaders } from "@/server/request-context";
import { enforceRateLimit } from "@/server/auth/rate-limit";
import { Alert, Badge, Card, DL } from "@/components/ui";
import { CASH_DEPOSIT_METHOD, CASH_DEPOSIT_STATUS, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";

export const metadata: Metadata = { title: "Vérification bordereau", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function VerifyDepositPage({ params }: PageProps<"/verify/deposit/[token]">) {
  const [{ token }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  enforceRateLimit("api", contextFromHeaders(await headers()).ip);
  const s = await verifySlipByToken(token);
  if (!s) {
    return (
      <Alert tone="danger" title={t("traffic.verify.notFoundTitle")}>
        {t("cash.verify.notFoundBody")}
      </Alert>
    );
  }
  const d = s.deposit;
  const st = labelOf(CASH_DEPOSIT_STATUS, d.status, locale);
  return (
    <div className="space-y-4">
      {d.status === "REJECTED" ? (
        <Alert tone="warning" title={t("cash.verify.rejectedTitle")}>
          {t("cash.verify.rejectedBody")}
        </Alert>
      ) : (
        <Alert tone="success" title={t("cash.verify.authentic")}>
          {d.status === "VALIDATED" ? t("cash.verify.validatedBody") : t("cash.verify.pendingBody")}
        </Alert>
      )}
      <Card title={t("cash.verify.title", { number: s.number })}>
        <DL
          cols={1}
          items={[
            { label: t("cash.col.deposit"), value: <span className="font-mono">{d.number}</span> },
            { label: t("cash.kpi.deposited"), value: <span className="font-bold">{fmtFcfa(d.amountDepositedFcfa)}</span> },
            { label: t("cash.kpi.collected"), value: fmtFcfa(d.collectedFcfa) },
            { label: t("cash.col.date"), value: fmtDateTime(d.depositedAt, locale) },
            { label: t("cash.dep.method"), value: labelOf(CASH_DEPOSIT_METHOD, d.method, locale).label },
            { label: t("cash.col.unit"), value: d.station.name },
            { label: t("cash.col.agent"), value: `${d.agent.firstName.slice(0, 1)}. ${d.agent.lastName}` },
            { label: t("cash.col.status"), value: <Badge tone={st.tone}>{st.label}</Badge> },
          ]}
        />
      </Card>
    </div>
  );
}

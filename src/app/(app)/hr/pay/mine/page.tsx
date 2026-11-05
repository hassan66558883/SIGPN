import type { Metadata } from "next";
import { requireActor } from "@/server/auth/dal";
import { myPay } from "@/server/hr/pay";
import { Alert, Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { fmtFcfa } from "@/lib/traffic-format";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.pay.mine") };
}

type Detail = { items: { name: string; kind: string; amount: number }[]; benefits: number };

/** Self-service: an officer sees the validated pay lines that concern them, nothing else. */
export default async function MyPayPage() {
  const actor = await requireActor();
  const t = await getT();
  if (!actor.officerId) {
    return (
      <div>
        <PageHeader eyebrow={t("hr.section")} title={t("hr.pay.mine")} />
        <Alert tone="info">{t("hr.leave.notLinked")}</Alert>
      </div>
    );
  }
  const lines = await myPay(actor);
  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.pay.mine")} subtitle={t("hr.pay.mineHint")} />
      <Card padded={false}>
        {lines.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("hr.pay.noLines")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("hr.pay.period")}</th>
                <th>{t("hr.pay.base")}</th>
                <th>{t("hr.pay.gross")}</th>
                <th>{t("hr.pay.deductions")}</th>
                <th>{t("hr.pay.net")}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const d = l.detail as unknown as Detail;
                return (
                  <tr key={l.id}>
                    <td data-label={t("hr.pay.period")} className="font-mono">
                      {l.run.period}
                    </td>
                    <td data-label={t("hr.pay.base")} className="font-mono text-xs">
                      {fmtFcfa(l.base)}
                    </td>
                    <td data-label={t("hr.pay.gross")} className="font-mono text-xs">
                      {fmtFcfa(l.gross)}
                      <span className="block text-[11px] text-slate">{d.items.filter((i) => i.kind !== "DEDUCTION").map((i) => `${i.name} ${fmtFcfa(i.amount)}`).join(" · ")}</span>
                    </td>
                    <td data-label={t("hr.pay.deductions")} className="font-mono text-xs">
                      {fmtFcfa(l.deductions)}
                    </td>
                    <td data-label={t("hr.pay.net")} className="font-mono text-xs font-semibold">
                      {fmtFcfa(l.net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

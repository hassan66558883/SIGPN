import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { listOnlinePayments } from "@/server/traffic/online-payments";
import { Alert, Badge, Card, EmptyState, PageHeader, Pagination, Select, StatCard, Table } from "@/components/ui";
import { TRAFFIC_PAYMENT_METHOD, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import type { MessageKey } from "@/lib/i18n";
import { CheckButton } from "./check-button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("traffic.online.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);
const STATUSES = ["PENDING", "SUCCEEDED", "FAILED", "EXPIRED"] as const;
const TONE = { PENDING: "warning", SUCCEEDED: "success", FAILED: "danger", EXPIRED: "neutral" } as const;

export default async function OnlinePaymentsPage({ searchParams }: PageProps<"/traffic/online-payments">) {
  const actor = await requirePermission("traffic:payment_record");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const status = STATUSES.find((s) => s === str(p.status));
  const refundOnly = str(p.refund) === "1";
  const page = Number(p.page ?? 1) || 1;
  const { rows, total, pending, refunds } = await listOnlinePayments(actor, { status, refundOnly, q: str(p.q), page, pageSize: 25 });
  const hrefFor = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/traffic/online-payments?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("traffic.eyebrow")} title={t("traffic.online.title")} subtitle={t("traffic.online.subtitle", { n: total })} />
      {refunds > 0 ? (
        <Alert tone="danger" className="mb-4">
          {t("traffic.online.refundBanner", { n: refunds })} <Link className="font-bold underline" href="/traffic/online-payments?refund=1">{t("traffic.online.refundOnly")}</Link>
        </Alert>
      ) : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <StatCard label={t("traffic.online.pendingKpi")} value={<span className="text-2xl">{pending}</span>} tone="warning" />
        <StatCard label={t("traffic.online.refundKpi")} value={<span className="text-2xl">{refunds}</span>} tone={refunds ? "danger" : "success"} />
      </div>
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={str(p.q) ?? ""} placeholder={t("traffic.online.searchPh")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="status" defaultValue={status ?? ""} placeholder={t("traffic.fine.allStatuses")} options={STATUSES.map((s) => ({ value: s, label: t(`traffic.online.status.${s}` as MessageKey) }))} aria-label={t("traffic.online.col.status")} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="refund" value="1" defaultChecked={refundOnly} /> {t("traffic.online.refundOnly")}
          </label>
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white sm:col-start-4">{t("common.filter")}</button>
        </form>
      </Card>
      <Card padded={false}>
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("traffic.online.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("traffic.online.col.number")}</th>
                <th>{t("traffic.online.col.fine")}</th>
                <th className="text-end">{t("traffic.online.col.amount")}</th>
                <th>{t("traffic.online.col.method")}</th>
                <th>{t("traffic.online.col.status")}</th>
                <th>{t("traffic.online.col.ref")}</th>
                <th>{t("traffic.online.col.date")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const refund = r.status === "FAILED" && r.failureReason?.startsWith("REFUND_REQUIRED");
                return (
                  <tr key={r.id}>
                    <td data-label={t("traffic.online.col.number")} className="font-mono text-xs">{r.number}</td>
                    <td data-label={t("traffic.online.col.fine")}>
                      <Link href={`/traffic/fines/${r.fine.id}`} className="font-mono text-xs underline">{r.fine.number}</Link>
                      <span className="block text-xs text-slate">{r.fine.ticket.number}{r.fine.plateNumber ? ` · ${r.fine.plateNumber}` : ""}</span>
                    </td>
                    <td data-label={t("traffic.online.col.amount")} className="text-end">{fmtFcfa(r.amountFcfa)}</td>
                    <td data-label={t("traffic.online.col.method")}>
                      {labelOf(TRAFFIC_PAYMENT_METHOD, r.method, locale).label}
                      {r.payerPhoneMasked ? <span className="block font-mono text-xs text-slate">{r.payerPhoneMasked}</span> : null}
                    </td>
                    <td data-label={t("traffic.online.col.status")}>
                      <Badge tone={refund ? "danger" : TONE[r.status]}>{refund ? t("traffic.online.refundFlag") : t(`traffic.online.status.${r.status}` as MessageKey)}</Badge>
                      {r.failureReason && !refund ? <span className="block text-xs text-slate">{r.failureReason}</span> : null}
                      {refund ? <span className="block text-xs text-danger">{r.failureReason?.replace("REFUND_REQUIRED: ", "")}</span> : null}
                    </td>
                    <td data-label={t("traffic.online.col.ref")} className="font-mono text-xs">{r.providerReference ?? "—"}<span className="block text-slate">{r.provider}</span></td>
                    <td data-label={t("traffic.online.col.date")} className="text-xs">{fmtDateTime(r.createdAt, locale)}</td>
                    <td>{r.status === "PENDING" ? <CheckButton id={r.id} label={t("traffic.online.check")} /> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <Pagination page={page} pageSize={25} total={total} hrefFor={hrefFor} t={t} />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { listElements } from "@/server/hr/pay";
import { getRequestContext } from "@/server/request-context";
import { Badge, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { PAY_APPROVAL, PAY_KIND, labelOf, optionsOf } from "@/lib/labels";
import { fmtFcfa } from "@/lib/traffic-format";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { DecideForm, EndElementForm } from "../pay-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.pay.elements") };
}

export default async function PayElementsPage({ searchParams }: PageProps<"/hr/pay/elements">) {
  const actor = await requirePermission("hr:pay_view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const status = (["PENDING", "ACTIVE", "REJECTED"] as const).find((s) => s === p.status);
  const { items, total, page, pageSize } = await listElements(actor, { status, page: Number(p.page ?? 1) || 1 }, await getRequestContext());
  const canValidate = actor.permissions.has("hr:pay_validate");
  const canManage = actor.permissions.has("hr:pay_manage");
  const qs = (n: number) => `/hr/pay/elements?${new URLSearchParams({ ...(status ? { status } : {}), page: String(n) }).toString()}`;
  return (
    <div>
      <PageHeader eyebrow={t("hr.pay.title")} title={t("hr.pay.elements")} subtitle={t("hr.pay.elementsHint", { n: total })} breadcrumbs={[{ href: "/hr/pay", label: t("hr.pay.title") }, { label: t("hr.pay.elements") }]} />
      <Card className="mb-4">
        <form method="get" className="flex flex-wrap gap-3">
          <Select name="status" defaultValue={status ?? ""} placeholder={t("hr.transfers.allStatuses")} options={optionsOf(PAY_APPROVAL, locale)} aria-label={t("hr.transfers.allStatuses")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
            {t("common.filter")}
          </button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("hr.pay.noElements")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("hr.transfers.col.officer")}</th>
                <th>{t("hr.pay.element")}</th>
                <th>{t("hr.leave.period")}</th>
                <th>{t("hr.transfers.col.status")}</th>
                <th>{t("hr.leave.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => {
                const st = labelOf(PAY_APPROVAL, e.status, locale);
                const kind = labelOf(PAY_KIND, e.component.kind, locale);
                return (
                  <tr key={e.id}>
                    <td data-label={t("hr.transfers.col.officer")}>
                      <Link href={`/hr/dossiers/${e.officer.id}`} className="font-semibold text-blue hover:underline">
                        {e.officer.lastName}, {e.officer.firstName}
                      </Link>
                      <span className="block font-mono text-[11px] text-slate">{e.officer.badgeNumber}</span>
                    </td>
                    <td data-label={t("hr.pay.element")} className="text-xs">
                      <Badge tone={kind.tone}>{kind.label}</Badge> {e.component.name}
                      <span className="block text-slate">{e.component.calculation === "FIXED" ? fmtFcfa(e.value ?? e.component.defaultValue) : `${e.value ?? e.component.defaultValue} %`}</span>
                      <span className="block text-slate">{e.reason}</span>
                    </td>
                    <td data-label={t("hr.leave.period")} className="text-xs">
                      {fmtDate(e.startDate, locale)} → {e.endDate ? fmtDate(e.endDate, locale) : "∞"}
                    </td>
                    <td data-label={t("hr.transfers.col.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                      <span className="block text-[11px] text-slate">{e.requestedBy?.username}</span>
                    </td>
                    <td data-label={t("hr.leave.actions")} className="min-w-[240px] space-y-2">
                      {e.status === "PENDING" && canValidate && e.requestedById !== actor.id ? <DecideForm id={e.id} kind="element" /> : null}
                      {e.status === "ACTIVE" && canManage && !e.endDate ? <EndElementForm id={e.id} /> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <div className="px-4 pb-3">
          <Pagination page={page} pageSize={pageSize} total={total} hrefFor={qs} t={t} />
        </div>
      </Card>
    </div>
  );
}

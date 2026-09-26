import type { Metadata } from "next";
import Link from "next/link";
import type { TrafficCashRegisterStatus } from "@/generated/prisma/client";
import { listRegisters, myRegister } from "@/server/traffic/cash-queries";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { CASH_REGISTER_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { CASH_ANY, CashTabs, day, qsBuilder, requireCash, str } from "../cash-nav";
import { CloseRegisterForm, OpenRegisterForm } from "../cash-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.nav.registers") };
}

export default async function RegistersPage({ searchParams }: PageProps<"/traffic/cash/registers">) {
  const actor = await requireCash(CASH_ANY);
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), status: str(p.status) as TrafficCashRegisterStatus | undefined, from: day(str(p.from)), to: day(str(p.to)), page: Number(p.page ?? 1) || 1 };
  const [{ items, total, page, pageSize }, mine] = await Promise.all([listRegisters(actor, filter), myRegister(actor)]);
  const canField = actor.permissions.has("cash:register");
  return (
    <div>
      <PageHeader eyebrow={t("cash.eyebrow")} title={t("cash.nav.registers")} subtitle={t("cash.reg.subtitle", { n: total })} />
      <CashTabs actor={actor} current="/traffic/cash/registers" t={t} />

      {canField ? (
        <Card className="mb-4" title={t("cash.reg.mine")}>
          {mine && mine.status === "OPEN" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/traffic/cash/registers/${mine.id}`} className="font-mono text-lg font-bold text-blue hover:underline">
                  {mine.number}
                </Link>
                <Badge tone="success">{t("cash.reg.openBadge")}</Badge>
                <span className="text-sm text-slate">{t("cash.reg.openedAt", { date: fmtDateTime(mine.openedAt, locale) })}</span>
              </div>
              <p className="text-2xl font-extrabold tabular-nums text-navy">
                {fmtFcfa(mine.collected)} <span className="text-sm font-normal text-slate">— {t("cash.reg.paymentsCount", { n: mine.count })}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/traffic/fines?status=TO_PAY" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
                  {t("cash.reg.collectCta")}
                </Link>
              </div>
              <details className="rounded-md border border-line p-3">
                <summary className="cursor-pointer text-sm font-semibold text-danger">{t("cash.reg.closeTitle")}</summary>
                <div className="mt-3 max-w-xl">
                  <CloseRegisterForm registerId={mine.id} collected={mine.collected} count={mine.count} />
                </div>
              </details>
            </div>
          ) : mine && mine.status === "BLOCKED" ? (
            <Alert tone="danger">
              {t("cash.reg.blockedNotice", { number: mine.number })}
            </Alert>
          ) : (
            <div className="max-w-2xl space-y-3">
              <p className="text-sm text-slate">{t("cash.reg.noneOpen")}</p>
              <OpenRegisterForm />
            </div>
          )}
        </Card>
      ) : null}

      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("cash.reg.searchPh")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="status" defaultValue={filter.status ?? ""} placeholder={t("cash.allStatuses")} options={optionsOf(CASH_REGISTER_STATUS, locale)} aria-label={t("cash.col.status")} />
          <Button type="submit">{t("common.filter")}</Button>
          <input type="date" name="from" defaultValue={str(p.from) ?? ""} className="input" aria-label={t("traffic.filter.from")} />
          <input type="date" name="to" defaultValue={str(p.to) ?? ""} className="input" aria-label={t("traffic.filter.to")} />
        </form>
      </Card>

      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("cash.reg.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("cash.col.register")}</th>
                <th>{t("cash.col.agent")}</th>
                <th>{t("cash.col.unit")}</th>
                <th>{t("cash.col.opened")}</th>
                <th>{t("cash.col.closed")}</th>
                <th className="text-end">{t("cash.col.payments")}</th>
                <th className="text-end">{t("cash.col.collected")}</th>
                <th>{t("cash.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const st = labelOf(CASH_REGISTER_STATUS, r.status, locale);
                return (
                  <tr key={r.id}>
                    <td data-label={t("cash.col.register")}>
                      <Link href={`/traffic/cash/registers/${r.id}`} className="font-mono font-semibold text-blue hover:underline">
                        {r.number}
                      </Link>
                    </td>
                    <td data-label={t("cash.col.agent")} className="text-xs">
                      {r.agent.firstName} {r.agent.lastName}
                      <span className="block font-mono text-slate">{r.agentBadge ?? "—"}</span>
                    </td>
                    <td data-label={t("cash.col.unit")} className="text-xs">
                      {r.station.name}
                    </td>
                    <td data-label={t("cash.col.opened")} className="text-xs">
                      {fmtDateTime(r.openedAt, locale)}
                    </td>
                    <td data-label={t("cash.col.closed")} className="text-xs">
                      {r.closedAt ? fmtDateTime(r.closedAt, locale) : "—"}
                    </td>
                    <td data-label={t("cash.col.payments")} className="text-end tabular-nums">
                      {r.paymentsCount}
                    </td>
                    <td data-label={t("cash.col.collected")} className="text-end font-semibold tabular-nums">
                      {fmtFcfa(r.collectedFcfa)}
                    </td>
                    <td data-label={t("cash.col.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <div className="px-4 pb-3">
          <Pagination page={page} pageSize={pageSize} total={total} hrefFor={qsBuilder("/traffic/cash/registers", p)} t={t} />
        </div>
      </Card>
    </div>
  );
}

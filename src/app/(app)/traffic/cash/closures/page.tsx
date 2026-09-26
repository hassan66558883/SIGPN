import type { Metadata } from "next";
import Link from "next/link";
import { listClosures, myRegister } from "@/server/traffic/cash-queries";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Pagination, Table } from "@/components/ui";
import { CASH_REGISTER_STATUS, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { fmtFcfa } from "@/lib/traffic-format";
import { getLocale, getT } from "@/server/i18n";
import { CASH_ANY, CashTabs, day, qsBuilder, requireCash, str } from "../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.nav.closures") };
}

export default async function ClosuresPage({ searchParams }: PageProps<"/traffic/cash/closures">) {
  const actor = await requireCash(CASH_ANY);
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = { q: str(p.q), from: day(str(p.from)), to: day(str(p.to)), page: Number(p.page ?? 1) || 1 };
  const [{ items, total, page, pageSize }, mine] = await Promise.all([listClosures(actor, filter), myRegister(actor)]);
  return (
    <div>
      <PageHeader eyebrow={t("cash.eyebrow")} title={t("cash.nav.closures")} subtitle={t("cash.clo.subtitle", { n: total })} />
      <CashTabs actor={actor} current="/traffic/cash/closures" t={t} />
      {mine && mine.status === "OPEN" ? (
        <Alert tone="info" className="mb-4">
          {t("cash.clo.openNotice", { number: mine.number, amount: fmtFcfa(mine.collected) })}{" "}
          <Link href={`/traffic/cash/registers/${mine.id}`} className="font-semibold underline">
            {t("cash.clo.goClose")}
          </Link>
        </Alert>
      ) : null}
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("cash.reg.searchPh")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <input type="date" name="from" defaultValue={str(p.from) ?? ""} className="input" aria-label={t("traffic.filter.from")} />
          <input type="date" name="to" defaultValue={str(p.to) ?? ""} className="input" aria-label={t("traffic.filter.to")} />
          <Button type="submit" className="sm:col-start-4">
            {t("common.filter")}
          </Button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("cash.clo.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("cash.col.closure")}</th>
                <th>{t("cash.col.agent")}</th>
                <th>{t("cash.col.unit")}</th>
                <th>{t("cash.col.closed")}</th>
                <th className="text-end">{t("cash.col.payments")}</th>
                <th className="text-end">{t("cash.col.cash")}</th>
                <th className="text-end">{t("cash.col.electronic")}</th>
                <th className="text-end">{t("cash.col.mobile")}</th>
                <th className="text-end">{t("cash.col.collected")}</th>
                <th>{t("cash.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const st = labelOf(CASH_REGISTER_STATUS, c.register.status, locale);
                return (
                  <tr key={c.id}>
                    <td data-label={t("cash.col.closure")}>
                      <Link href={`/traffic/cash/closures/${c.id}`} className="font-mono font-semibold text-blue hover:underline">
                        {c.number}
                      </Link>
                      <span className="block font-mono text-xs text-slate">{c.register.number}</span>
                    </td>
                    <td data-label={t("cash.col.agent")} className="text-xs">
                      {c.register.agent.firstName} {c.register.agent.lastName}
                      <span className="block font-mono text-slate">{c.register.agentBadge ?? "—"}</span>
                    </td>
                    <td data-label={t("cash.col.unit")} className="text-xs">
                      {c.register.station.name}
                    </td>
                    <td data-label={t("cash.col.closed")} className="text-xs">
                      {fmtDateTime(c.closedAt, locale)}
                    </td>
                    <td data-label={t("cash.col.payments")} className="text-end tabular-nums">
                      {c.paymentsCount}
                    </td>
                    <td data-label={t("cash.col.cash")} className="text-end tabular-nums">
                      {fmtFcfa(c.cashFcfa)}
                    </td>
                    <td data-label={t("cash.col.electronic")} className="text-end tabular-nums">
                      {fmtFcfa(c.electronicFcfa)}
                    </td>
                    <td data-label={t("cash.col.mobile")} className="text-end tabular-nums">
                      {fmtFcfa(c.mobileMoneyFcfa)}
                    </td>
                    <td data-label={t("cash.col.collected")} className="text-end font-semibold tabular-nums">
                      {fmtFcfa(c.collectedFcfa)}
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
          <Pagination page={page} pageSize={pageSize} total={total} hrefFor={qsBuilder("/traffic/cash/closures", p)} t={t} />
        </div>
      </Card>
    </div>
  );
}

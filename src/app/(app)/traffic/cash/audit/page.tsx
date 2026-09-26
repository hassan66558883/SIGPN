import type { Metadata } from "next";
import { prisma } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";
import { Badge, Button, Card, EmptyState, PageHeader, Pagination, Table } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { CashTabs, day, qsBuilder, requireCash, str } from "../cash-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cash.nav.audit") };
}

const PAGE = 30;
const FINANCIAL: Prisma.AuditLogWhereInput = { OR: [{ module: "traffic_cash" }, { action: { in: ["TRAFFIC_PAYMENT_RECORDED", "TRAFFIC_PAYMENT_VOIDED"] } }] };

export default async function CashAuditPage({ searchParams }: PageProps<"/traffic/cash/audit">) {
  const actor = await requireCash(["audit:view"]);
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const q = str(p.q);
  const from = day(str(p.from));
  const to = day(str(p.to));
  const page = Math.max(1, Number(p.page ?? 1) || 1);
  const where: Prisma.AuditLogWhereInput = {
    AND: [
      FINANCIAL,
      q ? { OR: [{ action: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }, { entityLabel: { contains: q, mode: "insensitive" } }, { actorLabel: { contains: q, mode: "insensitive" } }] } : {},
      from || to ? { at: { gte: from ? new Date(new Date(from).setHours(0, 0, 0, 0)) : undefined, lte: to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : undefined } } : {},
    ],
  };
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { at: "desc" }, skip: (page - 1) * PAGE, take: PAGE, select: { id: true, at: true, actorLabel: true, action: true, entityLabel: true, summary: true, before: true, after: true, ipAddress: true, outcome: true } }),
    prisma.auditLog.count({ where }),
  ]);
  const roleOf = (after: unknown) => (after && typeof after === "object" && "role" in after ? String((after as { role: unknown }).role) : "—");
  return (
    <div>
      <PageHeader eyebrow={t("cash.eyebrow")} title={t("cash.nav.audit")} subtitle={t("cash.audit.subtitle", { n: total })} />
      <CashTabs actor={actor} current="/traffic/cash/audit" t={t} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={q ?? ""} placeholder={t("cash.audit.searchPh")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <input type="date" name="from" defaultValue={str(p.from) ?? ""} className="input" aria-label={t("traffic.filter.from")} />
          <input type="date" name="to" defaultValue={str(p.to) ?? ""} className="input" aria-label={t("traffic.filter.to")} />
          <Button type="submit" className="sm:col-start-4">
            {t("common.filter")}
          </Button>
        </form>
      </Card>
      <Card padded={false}>
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("cash.audit.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("cash.audit.when")}</th>
                <th>{t("cash.audit.who")}</th>
                <th>{t("cash.audit.action")}</th>
                <th>{t("cash.audit.ref")}</th>
                <th>{t("cash.audit.detail")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label={t("cash.audit.when")} className="whitespace-nowrap text-xs">
                    {fmtDateTime(r.at, locale)}
                  </td>
                  <td data-label={t("cash.audit.who")} className="text-xs">
                    {r.actorLabel}
                    <span className="block text-slate">
                      {roleOf(r.after)} · {r.ipAddress ?? "—"}
                    </span>
                  </td>
                  <td data-label={t("cash.audit.action")} className="text-xs">
                    <Badge tone={r.outcome === "SUCCESS" ? "neutral" : "danger"}>{r.action}</Badge>
                  </td>
                  <td data-label={t("cash.audit.ref")} className="font-mono text-xs">
                    {r.entityLabel ?? "—"}
                  </td>
                  <td data-label={t("cash.audit.detail")} className="text-xs">
                    {r.summary}
                    {r.before || r.after ? (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-blue">{t("cash.audit.values")}</summary>
                        <div className="mt-1 grid gap-2 sm:grid-cols-2">
                          <pre className="overflow-x-auto rounded bg-mist p-2 text-[11px]" dir="ltr">{t("cash.audit.before")}: {JSON.stringify(r.before ?? null, null, 1)}</pre>
                          <pre className="overflow-x-auto rounded bg-mist p-2 text-[11px]" dir="ltr">{t("cash.audit.after")}: {JSON.stringify(r.after ?? null, null, 1)}</pre>
                        </div>
                      </details>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <div className="px-4 pb-3">
          <Pagination page={page} pageSize={PAGE} total={total} hrefFor={qsBuilder("/traffic/cash/audit", p)} t={t} />
        </div>
      </Card>
    </div>
  );
}

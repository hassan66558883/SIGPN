import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { auditModules, listAuditLogs } from "@/server/admin/queries";
import { Badge, Card, EmptyState, PageHeader, Pagination, Select, Table, ButtonLink } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { AUDIT_OUTCOME, labelOf, optionsOf } from "@/lib/labels";
import type { AuditOutcome } from "@/generated/prisma/client";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("audit.title") };
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  const actor = await requirePermission("audit:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const filter = {
    q: str(p.q),
    module: str(p.module),
    action: str(p.action),
    entityType: str(p.entityType),
    entityId: str(p.entityId),
    outcome: str(p.outcome) as AuditOutcome | undefined,
    from: str(p.from) ? new Date(String(p.from)) : undefined,
    to: str(p.to) ? new Date(`${p.to}T23:59:59`) : undefined,
    page: Number(p.page ?? 1) || 1,
  };
  const [{ items, total, page, pageSize }, modules] = await Promise.all([listAuditLogs(filter), auditModules()]);
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/audit?${s.toString()}`;
  };
  const exportQs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") exportQs.set(k, v);
  return (
    <div>
      <PageHeader
        eyebrow={t("audit.eyebrow")}
        title={t("audit.title")}
        subtitle={t("audit.subtitle")}
        actions={
          actor.permissions.has("audit:export") ? (
            <ButtonLink href={`/api/v1/audit/export?${exportQs.toString()}`} variant="secondary" size="sm">
              {t("audit.export")}
            </ButtonLink>
          ) : null
        }
      />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input name="q" defaultValue={filter.q ?? ""} placeholder={t("audit.searchPlaceholder")} className="input lg:col-span-2" aria-label={t("common.search")} />
          <Select name="module" defaultValue={filter.module ?? ""} placeholder={t("audit.allModules")} options={modules.map((m) => ({ value: m, label: m }))} aria-label={t("audit.allModules")} />
          <Select name="outcome" defaultValue={filter.outcome ?? ""} placeholder={t("audit.allOutcomes")} options={optionsOf(AUDIT_OUTCOME, locale)} aria-label={t("audit.allOutcomes")} />
          <input name="from" type="date" defaultValue={str(p.from) ?? ""} className="input" aria-label={t("audit.from")} />
          <input name="to" type="date" defaultValue={str(p.to) ?? ""} className="input" aria-label={t("audit.to")} />
          <input name="action" defaultValue={filter.action ?? ""} placeholder={t("audit.actionPlaceholder")} className="input" />
          <input name="entityType" defaultValue={filter.entityType ?? ""} placeholder={t("audit.entityType")} className="input" />
          <input name="entityId" defaultValue={filter.entityId ?? ""} placeholder={t("audit.entityId")} className="input" />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
            {t("common.filter")}
          </button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("audit.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("audit.col.when")}</th>
                <th>{t("audit.col.actor")}</th>
                <th>{t("audit.col.action")}</th>
                <th>{t("audit.col.entity")}</th>
                <th>{t("audit.col.summary")}</th>
                <th>{t("audit.col.outcome")}</th>
                <th>{t("audit.col.ip")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const o = labelOf(AUDIT_OUTCOME, a.outcome, locale);
                return (
                  <tr key={a.id}>
                    <td data-label={t("audit.col.when")} className="whitespace-nowrap text-xs">
                      {fmtDateTime(a.at, locale)}
                    </td>
                    <td data-label={t("audit.col.actor")} className="text-xs">
                      {a.actorLabel}
                    </td>
                    <td data-label={t("audit.col.action")}>
                      <span className="text-xs text-slate">{a.module}</span>
                      <br />
                      <span className="font-mono text-xs text-blue">{a.action}</span>
                    </td>
                    <td data-label={t("audit.col.entity")} className="text-xs">
                      {a.entityType ? (
                        <>
                          {a.entityType} <span className="text-slate">{a.entityLabel ?? a.entityId}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label={t("audit.col.summary")} className="max-w-md text-xs">
                      {a.summary}
                      {a.before || a.after ? (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[11px] text-slate">{t("common.details")}</summary>
                          <pre className="mt-1 max-h-48 overflow-auto rounded bg-mist p-2 text-[10px] leading-tight">{JSON.stringify({ before: a.before ?? undefined, after: a.after ?? undefined }, null, 1)}</pre>
                        </details>
                      ) : null}
                    </td>
                    <td data-label={t("audit.col.outcome")}>
                      <Badge tone={o.tone}>{o.label}</Badge>
                    </td>
                    <td data-label={t("audit.col.ip")} className="text-xs">
                      {a.ipAddress ?? "—"}
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

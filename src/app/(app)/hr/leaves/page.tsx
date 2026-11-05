import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { listLeaves } from "@/server/hr/attendance";
import { LEAVE_STATUSES, LEAVE_TYPES } from "@/server/hr/attendance-schemas";
import { Alert, Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { LEAVE_STATUS, LEAVE_TYPE, labelOf, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { LeaveCancelForm, LeaveDecisionForm } from "../attendance/attendance-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.leave.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function LeavesPage({ searchParams }: PageProps<"/hr/leaves">) {
  const actor = await requirePermission("hr:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const status = LEAVE_STATUSES.find((s) => s === p.status);
  const type = LEAVE_TYPES.find((s) => s === p.type);
  const { items, total, page, pageSize } = await listLeaves(actor, { q: str(p.q), status, type, page: Number(p.page ?? 1) || 1 });
  const canApprove = actor.permissions.has("hr:leave_approve");
  const qs = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (typeof v === "string" && v && k !== "page") s.set(k, v);
    s.set("page", String(n));
    return `/hr/leaves?${s.toString()}`;
  };
  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.leave.title")} subtitle={t("hr.leave.subtitle", { n: total })} actions={<ButtonLink href="/hr/leaves/new">{t("hr.leave.new")}</ButtonLink>} />
      {p.created === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("hr.leave.created")}
        </Alert>
      ) : null}
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={str(p.q) ?? ""} placeholder={t("officers.searchPlaceholder")} className="input" aria-label={t("common.search")} />
          <Select name="status" defaultValue={status ?? ""} placeholder={t("hr.transfers.allStatuses")} options={optionsOf(LEAVE_STATUS, locale)} aria-label={t("hr.transfers.allStatuses")} />
          <Select name="type" defaultValue={type ?? ""} placeholder={t("hr.leave.allTypes")} options={optionsOf(LEAVE_TYPE, locale)} aria-label={t("hr.leave.allTypes")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
            {t("common.filter")}
          </button>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("hr.leave.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("hr.transfers.col.number")}</th>
                <th>{t("hr.transfers.col.officer")}</th>
                <th>{t("hr.leave.type")}</th>
                <th>{t("hr.leave.period")}</th>
                <th>{t("hr.transfers.col.status")}</th>
                <th>{t("hr.leave.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => {
                const st = labelOf(LEAVE_STATUS, l.status, locale);
                const own = l.officerId === actor.officerId || l.requestedById === actor.id;
                const open = l.status === "REQUESTED" || l.status === "APPROVED";
                return (
                  <tr key={l.id}>
                    <td data-label={t("hr.transfers.col.number")} className="font-mono text-xs">
                      {l.number}
                    </td>
                    <td data-label={t("hr.transfers.col.officer")}>
                      <Link href={`/hr/dossiers/${l.officer.id}`} className="font-semibold text-blue hover:underline">
                        {l.officer.lastName}, {l.officer.firstName}
                      </Link>
                      <span className="block font-mono text-[11px] text-slate">{l.officer.badgeNumber}</span>
                    </td>
                    <td data-label={t("hr.leave.type")} className="text-xs">
                      {labelOf(LEAVE_TYPE, l.type, locale).label}
                      {l.reason ? <span className="block text-slate">{l.reason}</span> : null}
                    </td>
                    <td data-label={t("hr.leave.period")} className="text-xs">
                      {fmtDate(l.startDate, locale)} → {fmtDate(l.endDate, locale)}
                      <span className="block text-slate">{t("hr.leave.days", { n: l.days })}</span>
                    </td>
                    <td data-label={t("hr.transfers.col.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {l.decisionNote ? <span className="block text-xs text-slate">{l.decisionNote}</span> : null}
                    </td>
                    <td data-label={t("hr.leave.actions")} className="min-w-[220px] space-y-2">
                      {l.status === "REQUESTED" && canApprove && !own ? <LeaveDecisionForm id={l.id} /> : null}
                      {open && (own || canApprove) ? <LeaveCancelForm id={l.id} /> : null}
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

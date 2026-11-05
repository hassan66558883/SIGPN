import type { Metadata } from "next";
import { requireActor } from "@/server/auth/dal";
import { leaveBalance, myLeaves } from "@/server/hr/attendance";
import { Alert, Badge, ButtonLink, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { LEAVE_STATUS, LEAVE_TYPE, labelOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { LeaveCancelForm } from "../../attendance/attendance-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.leave.mine") };
}

/** Self-service: any user linked to an officer record sees and files their own leave requests. */
export default async function MyLeavesPage() {
  const actor = await requireActor();
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  if (!actor.officerId) {
    return (
      <div>
        <PageHeader eyebrow={t("hr.section")} title={t("hr.leave.mine")} />
        <Alert tone="info">{t("hr.leave.notLinked")}</Alert>
      </div>
    );
  }
  const [items, bal] = await Promise.all([myLeaves(actor), leaveBalance(actor.officerId)]);
  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.leave.mine")} actions={<ButtonLink href="/hr/leaves/new">{t("hr.leave.new")}</ButtonLink>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label={t("hr.leave.entitlement", { y: bal.year })} value={bal.entitlement} />
        <StatCard label={t("hr.leave.used")} value={bal.used} />
        <StatCard label={t("hr.leave.remaining")} value={bal.remaining} tone={bal.remaining > 0 ? "success" : "danger"} />
      </div>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("hr.leave.none")}</EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {items.map((l) => {
              const st = labelOf(LEAVE_STATUS, l.status, locale);
              return (
                <li key={l.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{l.number}</span>
                    <span className="font-semibold">{labelOf(LEAVE_TYPE, l.type, locale).label}</span>
                    <span className="text-xs text-slate">
                      {fmtDate(l.startDate, locale)} → {fmtDate(l.endDate, locale)} · {t("hr.leave.days", { n: l.days })}
                    </span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  {l.decisionNote ? <p className="text-xs text-slate">{l.decisionNote}</p> : null}
                  {l.status === "REQUESTED" || l.status === "APPROVED" ? <LeaveCancelForm id={l.id} /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

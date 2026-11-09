import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { listApprovals } from "@/server/approvals/service";
import { Alert, Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { APPROVAL_KIND, APPROVAL_STATUS, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { ApprovalDecisionForm, CancelApprovalForm } from "./approval-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("approvals.title") };
}

export default async function ApprovalsPage({ searchParams }: PageProps<"/approvals">) {
  const actor = await requirePermission("approvals:view");
  const [sp, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const canDecide = actor.permissions.has("approvals:decide");
  const seesAll = actor.permissions.has("security:manage");
  const asked = Array.isArray(sp.view) ? sp.view[0] : sp.view;
  const view: "todo" | "mine" | "all" = asked === "all" && seesAll ? "all" : asked === "mine" || !canDecide ? "mine" : "todo";
  const items = await listApprovals(actor, view);
  const tabs: { key: typeof view; label: string }[] = [...(canDecide ? [{ key: "todo" as const, label: t("approvals.todo") }] : []), { key: "mine", label: t("approvals.mine") }, ...(seesAll ? [{ key: "all" as const, label: t("approvals.all") }] : [])];
  const name = (u: { firstName: string; lastName: string; username: string }) => `${u.firstName} ${u.lastName} (${u.username})`;
  return (
    <div>
      <PageHeader eyebrow={t("approvals.eyebrow")} title={t("approvals.title")} subtitle={t("approvals.subtitle")} />
      {sp.requested === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("approvals.requested")}
        </Alert>
      ) : null}
      <div className="mb-4 flex gap-2" role="tablist">
        {tabs.map((tab) => (
          <Link key={tab.key} href={`/approvals?view=${tab.key}`} role="tab" aria-selected={view === tab.key} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === tab.key ? "bg-navy text-white" : "bg-surface text-ink hover:bg-line"}`}>
            {tab.label}
          </Link>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState>{view === "todo" ? t("approvals.noneTodo") : t("approvals.none")}</EmptyState>
      ) : (
        <div className="space-y-4">
          {items.map((a) => {
            const st = labelOf(APPROVAL_STATUS, a.status, locale);
            const kind = labelOf(APPROVAL_KIND, a.kind, locale);
            return (
              <Card key={a.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={kind.tone}>{kind.label}</Badge>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <Badge>{t("approvals.progress", { n: a.approvalsSoFar, m: a.requiredApprovals })}</Badge>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">{a.summary}</p>
                <p className="text-xs text-slate">
                  {t("approvals.requestedBy", { who: name(a.requestedBy) })} · {fmtDateTime(a.createdAt, locale)} · {t("approvals.expires", { when: fmtDateTime(a.expiresAt, locale) })}
                </p>
                {a.failureReason ? (
                  <Alert tone="danger" className="mt-2">
                    {a.failureReason}
                  </Alert>
                ) : null}
                {a.decisions.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate">
                    {a.decisions.map((d) => (
                      <li key={d.id}>
                        {d.vote === "APPROVE" ? t("approvals.approvedBy") : t("approvals.rejectedBy")} {name(d.approver)} · {fmtDateTime(d.createdAt, locale)}
                        {d.comment ? ` — ${d.comment}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {a.canDecide ? (
                  <div className="mt-3 max-w-xl border-t border-line pt-3">
                    <ApprovalDecisionForm id={a.id} />
                  </div>
                ) : null}
                {a.status === "PENDING" && a.requestedById === actor.id ? (
                  <div className="mt-3">
                    <CancelApprovalForm id={a.id} />
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

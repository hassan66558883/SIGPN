import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { myTasks } from "@/server/cases/queries";
import { Badge, Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { PRIORITY, TASK_STATUS, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { TaskStatusForm } from "../cases/case-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("tasks.title") };
}

export default async function TasksPage() {
  const actor = await requirePermission("investigations:view");
  const [tasks, t, locale] = await Promise.all([myTasks(actor), getT(), getLocale()]);
  return (
    <div>
      <PageHeader eyebrow={t("case.eyebrow")} title={t("tasks.title")} subtitle={t("tasks.subtitle", { n: tasks.length })} />
      <Card padded={false}>
        {tasks.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("tasks.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("case.taskTitle")}</th>
                <th>{t("cases.col.case")}</th>
                <th>{t("case.priority")}</th>
                <th>{t("case.taskDue")}</th>
                <th>{t("case.status")}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((x) => {
                const ts = labelOf(TASK_STATUS, x.status, locale);
                const pr = labelOf(PRIORITY, x.priority, locale);
                const overdue = x.dueAt && x.dueAt < new Date();
                return (
                  <tr key={x.id}>
                    <td data-label={t("case.taskTitle")}>
                      <span className="font-semibold text-ink">{x.title}</span>
                      {x.description ? <span className="block text-xs text-slate">{x.description}</span> : null}
                    </td>
                    <td data-label={t("cases.col.case")}>
                      <Link href={`/cases/${x.case.id}?tab=tasks`} className="font-semibold text-blue hover:underline">
                        {x.case.number}
                      </Link>
                      <span className="block text-xs text-slate">{x.case.title}</span>
                    </td>
                    <td data-label={t("case.priority")}>
                      <Badge tone={pr.tone}>{pr.label}</Badge>
                    </td>
                    <td data-label={t("case.taskDue")} className="text-xs">
                      {fmtDateTime(x.dueAt, locale)}
                      {overdue ? <Badge tone="danger" className="ms-1">{t("tasks.overdue")}</Badge> : null}
                    </td>
                    <td data-label={t("case.status")}>
                      <Badge tone={ts.tone}>{ts.label}</Badge>
                      {actor.permissions.has("cases:update") ? (
                        <div className="mt-1">
                          <TaskStatusForm taskId={x.id} current={x.status} />
                        </div>
                      ) : null}
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

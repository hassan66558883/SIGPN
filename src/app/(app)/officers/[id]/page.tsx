import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getOfficer } from "@/server/org/service";
import { officerAssignments, orgReferences } from "@/server/org/queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { deactivateOfficerAction, reactivateOfficerAction } from "@/server/org/actions";
import { DUTY_STATUS, GENDER, labelOf } from "@/lib/labels";
import { fmtDate, fmtDateTime, toInputDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { AssignmentForm, DutyStatusForm, OfficerForm } from "../officer-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("officers.col.officer") };
}

export default async function OfficerPage({ params, searchParams }: PageProps<"/officers/[id]">) {
  const actor = await requirePermission("officers:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let o;
  try {
    o = await getOfficer(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const canManage = actor.permissions.has("officers:manage");
  const [history, refs] = await Promise.all([officerAssignments(id), canManage ? orgReferences(actor) : Promise.resolve(null)]);
  const ds = labelOf(DUTY_STATUS, o.dutyStatus, locale);
  return (
    <div>
      <PageHeader
        eyebrow={t("nav.section.resources")}
        title={`${o.rank.name} ${o.firstName} ${o.lastName}`}
        subtitle={`${o.badgeNumber} · ${o.station.name}${o.department ? ` / ${o.department.name}` : ""} · ${o.station.region.name}`}
        breadcrumbs={[{ href: "/officers", label: t("officers.title") }, { label: o.badgeNumber }]}
        actions={
          <>
            <Badge tone={ds.tone}>{ds.label}</Badge>
            {!o.isActive ? <Badge tone="danger">{t("officer.inactive")}</Badge> : null}
            {o.commandsStation ? <Badge tone="violet">{t("officer.commands", { station: o.commandsStation.name })}</Badge> : null}
            {o.headsDepartment ? <Badge tone="info">{t("officer.heads", { department: o.headsDepartment.name })}</Badge> : null}
          </>
        }
      />
      {sp.created === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("officer.createdAlert")}
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("officer.profile")}>
            {canManage && refs ? (
              <OfficerForm
                refs={refs}
                mode="edit"
                values={{ id: o.id, badgeNumber: o.badgeNumber, firstName: o.firstName, lastName: o.lastName, gender: o.gender, dateOfBirth: toInputDate(o.dateOfBirth), phone: o.phone, email: o.email, hiredAt: toInputDate(o.hiredAt), specialties: o.specialties, notes: o.notes }}
              />
            ) : (
              <DL
                items={[
                  { label: t("officer.badge"), value: o.badgeNumber },
                  { label: t("officer.gender"), value: labelOf(GENDER, o.gender, locale).label },
                  { label: t("officer.dateOfBirth"), value: fmtDate(o.dateOfBirth, locale) },
                  { label: t("officer.hiredAt"), value: fmtDate(o.hiredAt, locale) },
                  { label: t("officer.phone"), value: o.phone ?? "—" },
                  { label: t("officer.email"), value: o.email ?? "—" },
                  { label: t("officer.specialties"), value: o.specialties ?? "—" },
                ]}
              />
            )}
          </Card>
          <Card title={t("officer.history")} padded={false}>
            {history.length === 0 ? (
              <div className="p-5">
                <EmptyState>{t("officer.noHistory")}</EmptyState>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>{t("officer.col.from")}</th>
                    <th>{t("officer.col.to")}</th>
                    <th>{t("officer.col.where")}</th>
                    <th>{t("officer.col.rank")}</th>
                    <th>{t("officer.col.position")}</th>
                    <th>{t("officer.col.by")}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((a) => (
                    <tr key={a.id}>
                      <td data-label={t("officer.col.from")} className="text-xs">
                        {fmtDate(a.startDate, locale)}
                      </td>
                      <td data-label={t("officer.col.to")} className="text-xs">
                        {a.endDate ? fmtDate(a.endDate, locale) : <Badge tone="success">{t("officer.current")}</Badge>}
                      </td>
                      <td data-label={t("officer.col.where")} className="text-xs">
                        {a.station.name}
                        {a.department ? <span className="block text-slate">{a.department.name}</span> : null}
                      </td>
                      <td data-label={t("officer.col.rank")} className="text-xs">
                        {a.rank?.name ?? "—"}
                      </td>
                      <td data-label={t("officer.col.position")} className="text-xs">
                        {a.position ?? "—"}
                        {a.reason ? <span className="block text-slate">{a.reason}</span> : null}
                      </td>
                      <td data-label={t("officer.col.by")} className="text-xs">
                        {a.createdBy?.username ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title={t("officer.posting")}>
            <DL cols={1} items={[{ label: t("officer.station"), value: <Link href={`/admin/organization/stations/${o.station.id}`} className="text-blue hover:underline">{o.station.name}</Link> }, { label: t("officer.department"), value: o.department?.name ?? "—" }, { label: t("officer.rank"), value: `${o.rank.name} (${o.rank.code})` }, { label: t("officer.dutyStatus"), value: <Badge tone={ds.tone}>{ds.label}</Badge> }]} />
            {canManage && refs && o.isActive ? (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-blue">{t("officer.newAssignment")}</summary>
                <div className="mt-3 rounded-md border border-line bg-mist p-3">
                  <AssignmentForm officerId={o.id} refs={refs} current={{ stationId: o.stationId, departmentId: o.departmentId, rankId: o.rankId }} />
                </div>
              </details>
            ) : null}
          </Card>
          {canManage ? (
            <Card title={t("officer.dutyStatus")}>
              {o.isActive ? <DutyStatusForm officerId={o.id} current={o.dutyStatus} /> : null}
              <div className="mt-4 border-t border-line pt-3">
                {o.isActive ? (
                  <ActionButton action={deactivateOfficerAction} fields={{ officerId: o.id }} variant="danger" size="sm" confirm={t("officer.deactivateConfirm")}>
                    {t("officer.deactivate")}
                  </ActionButton>
                ) : (
                  <ActionButton action={reactivateOfficerAction} fields={{ officerId: o.id }} variant="success" size="sm">
                    {t("officer.reactivate")}
                  </ActionButton>
                )}
              </div>
            </Card>
          ) : null}
          <Card title={t("officer.account")}>
            {o.user ? (
              <p className="text-sm">
                <Link href={`/admin/users/${o.user.id}`} className="font-mono text-blue hover:underline">
                  {o.user.username}
                </Link>{" "}
                <Badge tone={o.user.status === "ACTIVE" ? "success" : "warning"}>{o.user.status}</Badge>
              </p>
            ) : (
              <p className="text-sm text-slate">
                {t("officer.noAccount")}{" "}
                {actor.permissions.has("users:create") ? (
                  <Link href={`/admin/users/new?officerId=${o.id}`} className="font-semibold text-blue hover:underline">
                    {t("officer.createAccount")}
                  </Link>
                ) : null}
              </p>
            )}
            <p className="mt-3 text-xs text-slate">{fmtDateTime(o.createdAt, locale)}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

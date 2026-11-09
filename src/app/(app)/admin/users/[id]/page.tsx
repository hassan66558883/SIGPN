import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getUser, listUserSessions } from "@/server/admin/users";
import { referenceLists } from "@/server/admin/queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, PageHeader, Table } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { resetUserMfaAction, revokeUserSessionsAction, setUserStatusAction, updateUserAction } from "@/server/admin/actions";
import { fmtDateTime } from "@/lib/format";
import { USER_STATUS, labelOf } from "@/lib/labels";
import { UserForm } from "../user-form";
import { IssueResetButton } from "./issue-reset";
import { getLocale, getT } from "@/server/i18n";
import { roleName } from "@/lib/i18n/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("users.col.user") };
}

export default async function UserDetailPage({ params, searchParams }: PageProps<"/admin/users/[id]">) {
  const actor = await requirePermission("users:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let user;
  try {
    user = await getUser(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const [refs, sessions] = await Promise.all([referenceLists({ grantableBy: actor, keepRoleId: user.roleId }), actor.permissions.has("users:manage_sessions") ? listUserSessions(actor, id) : Promise.resolve([])]);
  const st = labelOf(USER_STATUS, user.status, locale);
  const canStatus = actor.permissions.has("users:manage_status") && user.id !== actor.id;
  return (
    <div>
      <PageHeader
        eyebrow={t("admin.eyebrow")}
        title={`${user.firstName} ${user.lastName}`}
        subtitle={`@${user.username} · ${user.email} · ${roleName(user.role.code, user.role.name, locale)}`}
        breadcrumbs={[{ href: "/admin/users", label: t("users.title") }, { label: user.username }]}
        actions={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            {user.mfaEnabled ? <Badge tone="success">{t("user.mfaOn")}</Badge> : user.role.requiresMfa ? <Badge tone="danger">{t("user.mfaMissing")}</Badge> : null}
          </>
        }
      />
      {sp.created === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("user.createdAlert")}
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("user.accountDetails")}>
            {actor.permissions.has("users:update") ? (
              <UserForm action={updateUserAction} refs={refs} mode="edit" values={{ id: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, roleId: user.roleId, regionId: user.regionId, adminDepartmentId: user.adminDepartmentId, stationId: user.stationId }} />
            ) : (
              <DL items={[{ label: t("account.role"), value: roleName(user.role.code, user.role.name, locale) }, { label: t("account.region"), value: user.region?.name ?? "—" }, { label: t("account.station"), value: user.station?.name ?? "—" }, { label: t("user.phone"), value: user.phone ?? "—" }]} />
            )}
          </Card>
          {sessions.length ? (
            <Card
              title={t("user.sessionsCard")}
              actions={
                <ActionButton action={revokeUserSessionsAction} fields={{ id: user.id }} variant="secondary" size="sm" confirm={t("user.revokeAllConfirm")}>
                  {t("user.revokeAll")}
                </ActionButton>
              }
            >
              <Table>
                <thead>
                  <tr>
                    <th>{t("account.col.started")}</th>
                    <th>{t("user.col.lastSeen")}</th>
                    <th>{t("sec.col.ip")}</th>
                    <th>{t("account.col.mfa")}</th>
                    <th>{t("user.col.state")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td data-label={t("account.col.started")} className="text-xs">
                        {fmtDateTime(s.createdAt, locale)}
                      </td>
                      <td data-label={t("user.col.lastSeen")} className="text-xs">
                        {fmtDateTime(s.lastSeenAt, locale)}
                      </td>
                      <td data-label={t("sec.col.ip")} className="text-xs">
                        {s.ipAddress ?? "—"}
                      </td>
                      <td data-label={t("account.col.mfa")}>{s.mfaVerified ? t("common.yes") : t("common.no")}</td>
                      <td data-label={t("user.col.state")}>{s.revokedAt ? <Badge>{t("common.revoked")} · {s.revokedReason}</Badge> : s.expiresAt < new Date() ? <Badge>{t("common.expired")}</Badge> : <Badge tone="success">{t("common.active")}</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          ) : null}
        </div>
        <div className="space-y-4">
          <Card title={t("user.securityStatus")}>
            <DL
              cols={1}
              items={[
                { label: t("users.col.lastSignIn"), value: user.lastLoginAt ? t("user.lastSignInFrom", { when: fmtDateTime(user.lastLoginAt, locale), ip: user.lastLoginIp ?? "?" }) : t("common.never") },
                { label: t("user.passwordChanged"), value: fmtDateTime(user.passwordChangedAt, locale) },
                { label: t("user.mustChange"), value: user.mustChangePassword ? t("common.yes") : t("common.no") },
                { label: t("user.failedLogins"), value: `${user.failedLoginCount}${user.lockedUntil ? t("user.lockedUntil", { when: fmtDateTime(user.lockedUntil, locale) }) : ""}` },
                { label: t("user.created"), value: fmtDateTime(user.createdAt, locale) },
              ]}
            />
          </Card>
          <Card title={t("user.actions")}>
            <div className="flex flex-col gap-3">
              {canStatus && user.status !== "ACTIVE" ? (
                <ActionButton action={setUserStatusAction} fields={{ id: user.id, status: "ACTIVE", reason: "admin" }} variant="success" size="sm">
                  {user.status === "LOCKED" ? t("user.unlock") : t("user.activate")}
                </ActionButton>
              ) : null}
              {canStatus && user.status === "ACTIVE" ? (
                <ActionButton action={setUserStatusAction} fields={{ id: user.id, status: "SUSPENDED", reason: "admin" }} variant="warning" size="sm" confirm={t("user.suspendConfirm")}>
                  {t("user.suspend")}
                </ActionButton>
              ) : null}
              {canStatus && user.status !== "DISABLED" ? (
                <ActionButton action={setUserStatusAction} fields={{ id: user.id, status: "DISABLED", reason: "admin" }} variant="danger" size="sm" confirm={t("user.disableConfirm")}>
                  {t("user.disable")}
                </ActionButton>
              ) : null}
              {actor.permissions.has("users:reset_password") ? <IssueResetButton userId={user.id} /> : null}
              {actor.permissions.has("security:manage") && user.mfaEnabled ? (
                <ActionButton action={resetUserMfaAction} fields={{ id: user.id }} variant="secondary" size="sm" confirm={t("user.resetMfaConfirm")}>
                  {t("user.resetMfa")}
                </ActionButton>
              ) : null}
              {!canStatus && user.id === actor.id ? <p className="text-xs text-slate">{t("user.cannotSelf")}</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

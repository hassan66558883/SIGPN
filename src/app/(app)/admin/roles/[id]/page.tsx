import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getRole, permissionCatalogGrouped } from "@/server/admin/roles";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { setRoleActiveAction, setRolePermissionsAction } from "@/server/admin/actions";
import { SCOPE_LEVEL, labelOf } from "@/lib/labels";
import { RoleForm } from "../role-form";
import { getLocale, getT } from "@/server/i18n";
import { roleDescription, roleName } from "@/lib/i18n/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("roles.crumb") };
}

export default async function RoleDetailPage({ params, searchParams }: PageProps<"/admin/roles/[id]">) {
  const actor = await requirePermission("roles:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let role;
  try {
    role = await getRole(id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const groups = permissionCatalogGrouped(locale);
  const canManage = actor.permissions.has("roles:manage");
  const locked = role.code === "SUPER_ADMIN";
  const sc = labelOf(SCOPE_LEVEL, role.scopeLevel, locale);
  const held = new Set(role.permissionCodes);
  const displayName = roleName(role.code, role.name, locale);
  const displayDescription = roleDescription(role.code, role.description, locale);
  return (
    <div>
      <PageHeader
        eyebrow={t("admin.eyebrow")}
        title={displayName}
        subtitle={displayDescription ?? role.code}
        breadcrumbs={[{ href: "/admin/roles", label: t("roles.crumb") }, { label: role.code }]}
        actions={
          <>
            <Badge tone={sc.tone}>{sc.label}</Badge>
            {role.requiresMfa ? <Badge tone="warning">{t("role.mfaRequired")}</Badge> : null}
            {role.isSystem ? <Badge>{t("role.systemRole")}</Badge> : null}
            <Badge tone="info">{t("common.userCount", { n: role._count.users })}</Badge>
          </>
        }
      />
      {sp.created === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("role.createdAlert")}
        </Alert>
      ) : null}
      {locked ? (
        <Alert tone="info" className="mb-4">
          {t("role.lockedAlert")}
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card title={t("role.settings")}>
            {canManage && !locked ? (
              <RoleForm mode="edit" role={{ id: role.id, name: role.name, description: role.description, scopeLevel: role.scopeLevel, requiresMfa: role.requiresMfa }} />
            ) : (
              <p className="text-sm text-slate">{displayDescription ?? t("common.noDescription")}</p>
            )}
          </Card>
          {canManage && !role.isSystem ? (
            <Card title={t("role.availability")}>
              <ActionButton action={setRoleActiveAction} fields={{ id: role.id, isActive: role.isActive ? "0" : "1" }} variant={role.isActive ? "warning" : "success"} size="sm">
                {role.isActive ? t("role.deactivate") : t("role.activate")}
              </ActionButton>
            </Card>
          ) : null}
        </div>
        <Card className="lg:col-span-2" title={t("role.permissionsTitle", { n: role.permissionCodes.length })} description={canManage && !locked ? t("role.permissionsDesc") : undefined}>
          {canManage && !locked ? (
            <ActionForm action={setRolePermissionsAction}>
              <input type="hidden" name="id" value={role.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                {groups.map((g) => (
                  <fieldset key={g.module} className="rounded-md border border-line p-3">
                    <legend className="px-1 text-xs font-bold uppercase tracking-wide text-navy">{g.module}</legend>
                    <ul className="space-y-1">
                      {g.items.map((p) => {
                        const grantable = actor.permissions.has(p.code);
                        return (
                          <li key={p.code}>
                            <label className={`flex items-start gap-2 text-sm ${grantable ? "" : "opacity-50"}`} title={grantable ? p.description : `${p.description}${t("role.notHeld")}`}>
                              <input type="checkbox" name="permissions" value={p.code} defaultChecked={held.has(p.code)} disabled={!grantable && !held.has(p.code)} className="mt-0.5" />
                              <span>
                                <span className="font-mono text-xs text-ink">{p.code}</span>
                                <span className="block text-xs text-slate">{p.description}</span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                ))}
              </div>
              <SubmitButton pendingText={t("common.saving")}>{t("role.savePermissions")}</SubmitButton>
            </ActionForm>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map((g) => (
                <div key={g.module} className="rounded-md border border-line p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-navy">{g.module}</p>
                  <ul className="mt-1 space-y-0.5">
                    {g.items.map((p) => (
                      <li key={p.code} className={`text-xs ${held.has(p.code) ? "text-ink" : "text-slate/50 line-through"}`}>
                        {p.code}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

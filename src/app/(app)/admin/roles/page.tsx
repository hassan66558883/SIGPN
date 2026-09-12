import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { listRoles } from "@/server/admin/roles";
import { Badge, Card, PageHeader, Table } from "@/components/ui";
import { SCOPE_LEVEL, labelOf } from "@/lib/labels";
import { RoleForm } from "./role-form";
import { getLocale, getT } from "@/server/i18n";
import { roleName } from "@/lib/i18n/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("roles.title") };
}

export default async function RolesPage() {
  const actor = await requirePermission("roles:view");
  const [roles, t, locale] = await Promise.all([listRoles(), getT(), getLocale()]);
  return (
    <div>
      <PageHeader
        eyebrow={t("admin.eyebrow")}
        title={t("roles.title")}
        subtitle={t("roles.subtitle")}
        actions={
          <Link href="/admin/permissions" className="text-sm font-semibold text-blue hover:underline">
            {t("roles.catalogLink")}
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" padded={false}>
          <Table>
            <thead>
              <tr>
                <th>{t("roles.col.role")}</th>
                <th>{t("roles.col.scope")}</th>
                <th>{t("roles.col.mfa")}</th>
                <th>{t("roles.col.permissions")}</th>
                <th>{t("roles.col.users")}</th>
                <th>{t("roles.col.state")}</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => {
                const sc = labelOf(SCOPE_LEVEL, r.scopeLevel, locale);
                return (
                  <tr key={r.id}>
                    <td data-label={t("roles.col.role")}>
                      <Link href={`/admin/roles/${r.id}`} className="font-semibold text-blue hover:underline">
                        {roleName(r.code, r.name, locale)}
                      </Link>
                      <span className="block font-mono text-[11px] text-slate">
                        {r.code}
                        {r.isSystem ? t("roles.system") : ""}
                      </span>
                    </td>
                    <td data-label={t("roles.col.scope")}>
                      <Badge tone={sc.tone}>{sc.label}</Badge>
                    </td>
                    <td data-label={t("roles.col.mfa")}>{r.requiresMfa ? <Badge tone="warning">{t("common.required")}</Badge> : "—"}</td>
                    <td data-label={t("roles.col.permissions")}>{r._count.permissions}</td>
                    <td data-label={t("roles.col.users")}>{r._count.users}</td>
                    <td data-label={t("roles.col.state")}>{r.isActive ? <Badge tone="success">{t("common.active")}</Badge> : <Badge>{t("common.inactive")}</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
        {actor.permissions.has("roles:manage") ? (
          <Card title={t("roles.createTitle")} description={t("roles.createDesc")}>
            <RoleForm mode="create" />
          </Card>
        ) : null}
      </div>
    </div>
  );
}

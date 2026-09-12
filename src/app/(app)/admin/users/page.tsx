import type { Metadata } from "next";
import Link from "next/link";
import type { UserStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { listUsers } from "@/server/admin/users";
import { referenceLists } from "@/server/admin/queries";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, Table } from "@/components/ui";
import { fmtRelative } from "@/lib/format";
import { USER_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { getLocale, getT } from "@/server/i18n";
import { roleName } from "@/lib/i18n/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("users.title") };
}

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const actor = await requirePermission("users:view");
  const [p, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const q = typeof p.q === "string" ? p.q : undefined;
  const status = typeof p.status === "string" && p.status ? (p.status as UserStatus) : undefined;
  const roleId = typeof p.roleId === "string" && p.roleId ? p.roleId : undefined;
  const page = Number(p.page ?? 1) || 1;
  const [{ items, total, pageSize }, refs] = await Promise.all([listUsers(actor, { q, status, roleId, page }), referenceLists()]);
  const qs = (n: number) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(roleId ? { roleId } : {}), page: String(n) }).toString()}`;
  return (
    <div>
      <PageHeader eyebrow={t("admin.eyebrow")} title={t("users.title")} subtitle={t("users.subtitle", { n: total })} actions={actor.permissions.has("users:create") ? <ButtonLink href="/admin/users/new">{t("users.new")}</ButtonLink> : null} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={q ?? ""} placeholder={t("users.searchPlaceholder")} className="input sm:col-span-2" aria-label={t("common.search")} />
          <Select name="status" defaultValue={status ?? ""} placeholder={t("users.allStatuses")} options={optionsOf(USER_STATUS, locale)} aria-label={t("users.col.status")} />
          <div className="flex gap-2">
            <Select name="roleId" defaultValue={roleId ?? ""} placeholder={t("users.allRoles")} options={refs.roles.map((r) => ({ value: r.id, label: roleName(r.code, r.name, locale) }))} aria-label={t("users.col.role")} />
            <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
              {t("common.filter")}
            </button>
          </div>
        </form>
      </Card>
      <Card padded={false}>
        {items.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("users.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("users.col.user")}</th>
                <th>{t("users.col.role")}</th>
                <th>{t("users.col.scope")}</th>
                <th>{t("users.col.status")}</th>
                <th>{t("users.col.mfa")}</th>
                <th>{t("users.col.lastSignIn")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const st = labelOf(USER_STATUS, u.status, locale);
                return (
                  <tr key={u.id}>
                    <td data-label={t("users.col.user")}>
                      <Link href={`/admin/users/${u.id}`} className="font-semibold text-blue hover:underline">
                        {u.lastName}, {u.firstName}
                      </Link>
                      <span className="block text-xs text-slate">
                        @{u.username} · {u.email}
                      </span>
                    </td>
                    <td data-label={t("users.col.role")}>{roleName(u.role.code, u.role.name, locale)}</td>
                    <td data-label={t("users.col.scope")} className="text-xs">
                      {u.station?.name ?? u.region?.name ?? t("common.national")}
                    </td>
                    <td data-label={t("users.col.status")}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {u.mustChangePassword ? <Badge className="ms-1">{t("users.pwdChange")}</Badge> : null}
                    </td>
                    <td data-label={t("users.col.mfa")}>{u.mfaEnabled ? <Badge tone="success">{t("common.on")}</Badge> : u.role.requiresMfa ? <Badge tone="danger">{t("common.missing")}</Badge> : <Badge>{t("common.off")}</Badge>}</td>
                    <td data-label={t("users.col.lastSignIn")} className="text-xs">
                      {u.lastLoginAt ? fmtRelative(u.lastLoginAt, locale) : t("common.never")}
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

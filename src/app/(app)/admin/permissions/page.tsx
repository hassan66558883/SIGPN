import type { Metadata } from "next";
import { Fragment } from "react";
import { requirePermission } from "@/server/auth/dal";
import { listRoles, permissionCatalogGrouped } from "@/server/admin/roles";
import { prisma } from "@/server/db";
import { Card, PageHeader } from "@/components/ui";
import { getLocale, getT } from "@/server/i18n";
import { roleName } from "@/lib/i18n/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("matrix.title") };
}

export default async function PermissionsPage() {
  await requirePermission("permissions:view");
  const locale = await getLocale();
  const [groups, roles, grants, t] = await Promise.all([permissionCatalogGrouped(locale), listRoles(), prisma.rolePermission.findMany({ select: { roleId: true, permission: { select: { code: true } } } }), getT()]);
  const has = new Set(grants.map((g) => `${g.roleId}:${g.permission.code}`));
  return (
    <div>
      <PageHeader eyebrow={t("admin.eyebrow")} title={t("matrix.title")} subtitle={t("matrix.subtitle", { p: groups.reduce((n, g) => n + g.items.length, 0), r: roles.length })} breadcrumbs={[{ href: "/admin/roles", label: t("roles.crumb") }, { label: t("matrix.crumb") }]} />
      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="table text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-mist">{t("matrix.permission")}</th>
                {roles.map((r) => (
                  <th key={r.id} className="whitespace-nowrap text-center" title={roleName(r.code, r.name, locale)}>
                    {r.code.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.module}>
                  <tr>
                    <td colSpan={roles.length + 1} className="bg-mist-2 font-bold uppercase tracking-wide text-navy">
                      {g.module}
                    </td>
                  </tr>
                  {g.items.map((p) => (
                    <tr key={p.code}>
                      <td className="sticky left-0 bg-white font-mono" title={p.description}>
                        {p.code}
                      </td>
                      {roles.map((r) => (
                        <td key={r.id} className="text-center">
                          {has.has(`${r.id}:${p.code}`) ? <span className="font-bold text-success">✓</span> : <span className="text-line">·</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

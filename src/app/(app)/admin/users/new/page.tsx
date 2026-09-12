import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { referenceLists } from "@/server/admin/queries";
import { prisma } from "@/server/db";
import { Alert, Card, PageHeader } from "@/components/ui";
import { createUserAction } from "@/server/admin/actions";
import { UserForm, type UserFormValues } from "../user-form";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("userNew.title") };
}

export default async function NewUserPage({ searchParams }: PageProps<"/admin/users/new">) {
  await requirePermission("users:create");
  const [refs, t, sp] = await Promise.all([referenceLists(), getT(), searchParams]);
  // Optional pre-fill from an officer record (link "Create an account" on the officer page).
  let values: UserFormValues = {};
  let officerLabel: string | null = null;
  if (typeof sp.officerId === "string" && sp.officerId) {
    const o = await prisma.officer.findFirst({ where: { id: sp.officerId, deletedAt: null, userId: null }, select: { id: true, badgeNumber: true, firstName: true, lastName: true, email: true, phone: true, stationId: true, station: { select: { regionId: true, adminDepartmentId: true } } } });
    if (o) {
      values = { officerId: o.id, firstName: o.firstName, lastName: o.lastName, email: o.email ?? "", phone: o.phone, stationId: o.stationId, regionId: o.station.regionId, adminDepartmentId: o.station.adminDepartmentId, username: `${o.firstName}.${o.lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, "") };
      officerLabel = `${o.badgeNumber} · ${o.firstName} ${o.lastName}`;
    }
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={t("admin.eyebrow")} title={t("userNew.title")} breadcrumbs={[{ href: "/admin/users", label: t("users.title") }, { label: t("userNew.crumb") }]} />
      {officerLabel ? (
        <Alert tone="info" className="mb-4">
          {t("officer.account")}: {officerLabel}
        </Alert>
      ) : null}
      <Card>
        <UserForm action={createUserAction} refs={refs} mode="create" values={values} />
      </Card>
    </div>
  );
}

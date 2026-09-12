import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { referenceLists } from "@/server/admin/queries";
import { Card, PageHeader } from "@/components/ui";
import { createUserAction } from "@/server/admin/actions";
import { UserForm } from "../user-form";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("userNew.title") };
}

export default async function NewUserPage() {
  await requirePermission("users:create");
  const [refs, t] = await Promise.all([referenceLists(), getT()]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={t("admin.eyebrow")} title={t("userNew.title")} breadcrumbs={[{ href: "/admin/users", label: t("users.title") }, { label: t("userNew.crumb") }]} />
      <Card>
        <UserForm action={createUserAction} refs={refs} mode="create" />
      </Card>
    </div>
  );
}

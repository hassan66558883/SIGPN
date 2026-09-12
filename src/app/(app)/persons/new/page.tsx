import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { prisma } from "@/server/db";
import { Card, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { PersonCreateForm } from "../person-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("persons.new") };
}

export default async function NewPersonPage() {
  await requirePermission("persons:create");
  const [t, regions] = await Promise.all([getT(), prisma.region.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t("person.eyebrow")} title={t("persons.new")} breadcrumbs={[{ href: "/persons", label: t("persons.title") }, { label: t("userNew.crumb") }]} />
      <Card>
        <PersonCreateForm regions={regions} />
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { Card, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { DriverForm } from "../../traffic-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.driver.new") };
}

export default async function NewDriverPage() {
  await requirePermission("traffic:drivers_manage");
  const t = await getT();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={t("traffic.eyebrow")} title={t("traffic.driver.new")} breadcrumbs={[{ href: "/traffic/drivers", label: t("traffic.driver.listTitle") }, { label: t("traffic.driver.new") }]} />
      <Card>
        <DriverForm mode="create" />
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { Card, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { VehicleForm } from "../../traffic-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.veh.new") };
}

export default async function NewVehiclePage() {
  await requirePermission("traffic:vehicles_manage");
  const t = await getT();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={t("traffic.eyebrow")} title={t("traffic.veh.new")} breadcrumbs={[{ href: "/traffic/vehicles", label: t("traffic.veh.listTitle") }, { label: t("traffic.veh.new") }]} />
      <Card>
        <VehicleForm mode="create" />
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { orgReferences } from "@/server/org/queries";
import { Card, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { ComplaintForm } from "../complaint-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("complaints.new") };
}

export default async function NewComplaintPage() {
  const actor = await requirePermission("complaints:create");
  const [t, refs] = await Promise.all([getT(), orgReferences(actor)]);
  const stations = refs.stations.filter((s) => s.type !== "HEADQUARTERS" && s.type !== "PROVINCIAL_DIRECTION" && s.type !== "DEPARTMENTAL_DIRECTION");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t("complaint.eyebrow")} title={t("complaints.new")} breadcrumbs={[{ href: "/complaints", label: t("complaints.title") }, { label: t("userNew.crumb") }]} />
      <Card>
        <ComplaintForm mode="create" stations={stations.length ? stations : refs.stations} />
      </Card>
    </div>
  );
}

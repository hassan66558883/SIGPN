import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { orgReferences } from "@/server/org/queries";
import { Card, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { OfficerForm } from "../officer-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("officerNew.title") };
}

export default async function NewOfficerPage() {
  const actor = await requirePermission("officers:manage");
  const [refs, t] = await Promise.all([orgReferences(actor), getT()]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={t("nav.section.resources")} title={t("officerNew.title")} breadcrumbs={[{ href: "/officers", label: t("officers.title") }, { label: t("officerNew.crumb") }]} />
      <Card>
        <OfficerForm refs={refs} mode="create" />
      </Card>
    </div>
  );
}

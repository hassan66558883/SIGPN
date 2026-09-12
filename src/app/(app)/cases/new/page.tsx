import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { orgReferences } from "@/server/org/queries";
import { assignableInvestigators } from "@/server/complaints/queries";
import { Card, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { CaseCreateForm } from "../case-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cases.new") };
}

export default async function NewCasePage() {
  const actor = await requirePermission("cases:create");
  const [t, refs, users] = await Promise.all([getT(), orgReferences(actor), assignableInvestigators(actor)]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t("case.eyebrow")} title={t("cases.new")} breadcrumbs={[{ href: "/cases", label: t("cases.title") }, { label: t("userNew.crumb") }]} />
      <Card>
        <CaseCreateForm stations={refs.stations} departments={refs.departments} users={users.map((u) => ({ id: u.id, label: `${u.firstName} ${u.lastName} (${u.role.code}${u.station ? ` · ${u.station.code}` : ""})` }))} canSensitive={actor.permissions.has("cases:view_sensitive")} defaultStationId={actor.stationId} />
      </Card>
    </div>
  );
}

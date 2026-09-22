import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { listCases } from "@/server/cases/queries";
import { stationStorageLocations } from "@/server/evidence/queries";
import { Card, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { NewEvidenceForm } from "../evidence-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("evidence.new") };
}

export default async function NewEvidencePage({ searchParams }: PageProps<"/evidence/new">) {
  const actor = await requirePermission("evidence:create");
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const caseId = typeof sp.caseId === "string" ? sp.caseId : undefined;
  const [{ items: cases }, locations] = await Promise.all([listCases(actor, { pageSize: 50 }), stationStorageLocations(actor.stationId ? [actor.stationId] : [])]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t("evidence.eyebrow")} title={t("evidence.new")} breadcrumbs={[{ href: "/evidence", label: t("evidence.title") }, { label: t("evidence.new") }]} />
      <Card>
        <NewEvidenceForm caseId={caseId} cases={cases.map((c) => ({ id: c.id, label: `${c.number} · ${c.title.slice(0, 60)}` }))} locations={locations.map((l) => ({ id: l.id, label: `${l.code} · ${l.name}` }))} />
      </Card>
    </div>
  );
}

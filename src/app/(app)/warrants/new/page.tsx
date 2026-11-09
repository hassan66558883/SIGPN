import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { listCases } from "@/server/cases/queries";
import { Card, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { NewWarrantForm } from "../warrant-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("warrants.new") };
}

export default async function NewWarrantPage() {
  const actor = await requirePermission("warrants:create");
  const t = await getT();
  const { items: cases } = await listCases(actor, { pageSize: 50 });
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t("warrants.eyebrow")} title={t("warrants.new")} breadcrumbs={[{ href: "/warrants", label: t("warrants.title") }, { label: t("warrants.new") }]} />
      <Card>
        <NewWarrantForm cases={cases.map((c) => ({ id: c.id, label: `${c.number} · ${c.title.slice(0, 60)}` }))} />
      </Card>
    </div>
  );
}

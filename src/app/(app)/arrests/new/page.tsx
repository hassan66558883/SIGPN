import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { listCases } from "@/server/cases/queries";
import { listWarrants } from "@/server/warrants/service";
import { selectableOfficers } from "@/server/arrests/service";
import { Card, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { NewArrestForm } from "../arrest-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("arrests.new") };
}

export default async function NewArrestPage() {
  const actor = await requirePermission("arrests:create");
  const t = await getT();
  const canSeeWarrants = actor.permissions.has("warrants:view");
  const [{ items: cases }, warrants, officers] = await Promise.all([
    listCases(actor, { pageSize: 50 }),
    canSeeWarrants ? listWarrants(actor, { status: "ACTIVE", pageSize: 100 }) : Promise.resolve({ items: [] }),
    selectableOfficers(actor),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t("arrests.eyebrow")} title={t("arrests.new")} breadcrumbs={[{ href: "/arrests", label: t("arrests.title") }, { label: t("arrests.new") }]} />
      <Card>
        <NewArrestForm
          hasOwnOfficer={!!actor.officerId}
          cases={cases.map((c) => ({ id: c.id, label: `${c.number} · ${c.title.slice(0, 60)}` }))}
          warrants={warrants.items.map((w) => ({ id: w.id, label: `${w.number} · ${w.person ? `${w.person.lastName} ${w.person.firstName}` : "—"}` }))}
          officers={officers.map((o) => ({ id: o.id, label: `${o.badgeNumber} · ${o.lastName} ${o.firstName}` }))}
        />
      </Card>
    </div>
  );
}

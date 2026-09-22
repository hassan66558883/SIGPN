import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { officersOf, operationalStations, vehiclesOf, zonesOf } from "@/server/ops/queries";
import { Card, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { PatrolForm } from "../patrol-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("patrols.new") };
}

export default async function NewPatrolPage() {
  const actor = await requirePermission("patrols:manage");
  const [t, stations] = await Promise.all([getT(), operationalStations(actor)]);
  const ids = stations.map((s) => s.id);
  const [zones, officers, vehicles] = await Promise.all([zonesOf(ids), officersOf(ids), vehiclesOf(ids)]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t("patrol.eyebrow")} title={t("patrols.new")} breadcrumbs={[{ href: "/patrols", label: t("patrols.title") }, { label: t("userNew.crumb") }]} />
      <Card>
        <PatrolForm
          mode="create"
          values={{ stationId: actor.stationId }}
          stations={stations.map((s) => ({ id: s.id, label: `${s.code} · ${s.name}` }))}
          zones={zones.map((z) => ({ id: z.id, label: `${z.code} · ${z.name}`, stationId: z.stationId }))}
          officers={officers.map((o) => ({ id: o.id, label: `${o.rank.name} ${o.firstName} ${o.lastName} (${o.badgeNumber}) · ${o.station.code}`, stationId: o.stationId }))}
          vehicles={vehicles.filter((v) => v.status === "AVAILABLE").map((v) => ({ id: v.id, label: `${v.fleetNumber} · ${v.make} ${v.model} (${v.plateNumber})`, stationId: v.stationId }))}
        />
      </Card>
    </div>
  );
}

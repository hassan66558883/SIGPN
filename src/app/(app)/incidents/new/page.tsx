import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { activePatrolsOf, operationalStations } from "@/server/ops/queries";
import { Card, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { IncidentForm } from "../incident-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("incidents.new") };
}

export default async function NewIncidentPage({ searchParams }: PageProps<"/incidents/new">) {
  const actor = await requirePermission("incidents:create");
  const [t, sp, stations] = await Promise.all([getT(), searchParams, operationalStations(actor)]);
  const patrols = await activePatrolsOf(stations.map((s) => s.id));
  const patrolId = typeof sp.patrolId === "string" ? sp.patrolId : undefined;
  const preset = patrolId ? patrols.find((p) => p.id === patrolId) : undefined;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t("incident.eyebrow")} title={t("incidents.new")} breadcrumbs={[{ href: "/incidents", label: t("incidents.title") }, { label: t("userNew.crumb") }]} />
      <Card>
        <IncidentForm mode="create" values={{ stationId: preset?.stationId ?? actor.stationId, patrolId }} stations={stations.map((s) => ({ id: s.id, label: `${s.code} · ${s.name}` }))} patrols={patrols.map((p) => ({ id: p.id, label: `${p.number} · ${p.mission.slice(0, 60)}`, stationId: p.stationId }))} />
      </Card>
    </div>
  );
}

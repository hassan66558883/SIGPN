import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { prisma } from "@/server/db";
import { selectableViolations } from "@/server/traffic/queries";
import { PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { ControlForm } from "../../traffic-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("traffic.controls.new") };
}

export default async function NewControlPage() {
  const actor = await requirePermission("traffic:control_create");
  const t = await getT();
  const [violations, stations] = await Promise.all([
    selectableViolations(),
    actor.stationId
      ? prisma.station.findMany({ where: { id: actor.stationId }, select: { id: true, code: true, name: true } })
      : prisma.station.findMany({ where: { isActive: true, ...(actor.stationIds ? { id: { in: actor.stationIds } } : {}), ...(actor.scopeLevel === "REGIONAL" && actor.regionId ? { regionId: actor.regionId } : {}) }, orderBy: { name: "asc" }, take: 100, select: { id: true, code: true, name: true } }),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t("traffic.eyebrow")} title={t("traffic.controls.new")} subtitle={t("traffic.ctl.subtitle")} breadcrumbs={[{ href: "/traffic/controls", label: t("traffic.controls.title") }, { label: t("traffic.controls.new") }]} />
      <ControlForm
        canPhotos={actor.permissions.has("traffic:evidence_upload")}
        stations={stations.map((s) => ({ id: s.id, label: `${s.code} · ${s.name}` }))}
        violations={violations.map((v) => ({ id: v.id, code: v.code, name: v.name, classText: v.classText, offenceClass: v.offenceClass, fineAmountFcfa: v.fineAmountFcfa, fineAmountText: v.fineAmountText, category: v.category.code, reference: v.legalReference.reference }))}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { listCases } from "@/server/cases/queries";
import { prisma } from "@/server/db";
import { Card, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { WantedPersonForm } from "../wanted-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("wanted.new") };
}

export default async function NewWantedPage() {
  const actor = await requirePermission("wanted:create");
  const t = await getT();
  const [{ items: cases }, stations] = await Promise.all([
    listCases(actor, { pageSize: 50 }),
    actor.stationId
      ? prisma.station.findMany({ where: { id: actor.stationId }, select: { id: true, code: true, name: true } })
      : prisma.station.findMany({ where: { isActive: true, ...(actor.stationIds ? { id: { in: actor.stationIds } } : {}) }, orderBy: { name: "asc" }, take: 100, select: { id: true, code: true, name: true } }),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t("wanted.eyebrow")} title={t("wanted.new")} breadcrumbs={[{ href: "/wanted", label: t("wanted.title") }, { label: t("wanted.new") }]} />
      <Card>
        <WantedPersonForm mode="create" cases={cases.map((c) => ({ id: c.id, label: `${c.number} · ${c.title.slice(0, 60)}` }))} stations={stations.map((s) => ({ id: s.id, label: `${s.code} · ${s.name}` }))} />
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { listControls } from "@/server/biometric/control";
import { PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { ControlConsole } from "./control-console";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("bc.title") };
}

export default async function BiometricControlPage({ searchParams }: PageProps<"/biometric/control">) {
  const actor = await requirePermission("biometric:control");
  const [sp, t] = await Promise.all([searchParams, getT()]);
  const rows = await listControls(actor, 20);
  const focus = typeof sp.focus === "string" ? sp.focus : undefined;
  return (
    <div>
      <PageHeader eyebrow={t("bc.eyebrow")} title={t("bc.title")} subtitle={t("bc.subtitle")} />
      <ControlConsole actorId={actor.id} canReview={actor.permissions.has("biometric:verify")} focusId={focus} initial={rows.map((r) => ({ id: r.id, number: r.number, modality: r.modality, result: r.result, status: r.status, createdAt: r.createdAt.toISOString() }))} />
    </div>
  );
}

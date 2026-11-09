import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/dal";
import { arrestsAvailableForDetention } from "@/server/detention/service";
import { Card, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { StartDetentionForm } from "../detention-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("detention.new") };
}

export default async function NewDetentionPage({ searchParams }: PageProps<"/detention/new">) {
  const actor = await requirePermission("detention:manage");
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const arrests = await arrestsAvailableForDetention(actor);
  const wanted = typeof sp.arrestId === "string" ? sp.arrestId : undefined;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={t("detention.eyebrow")} title={t("detention.new")} breadcrumbs={[{ href: "/detention", label: t("detention.title") }, { label: t("detention.new") }]} />
      <Card>
        <StartDetentionForm
          defaultArrestId={wanted && arrests.some((a) => a.id === wanted) ? wanted : undefined}
          arrests={arrests.map((a) => ({ id: a.id, label: `${a.number} · ${a.person.lastName} ${a.person.firstName}` }))}
        />
      </Card>
    </div>
  );
}

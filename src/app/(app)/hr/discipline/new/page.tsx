import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { listDossiers } from "@/server/hr/service";
import { getOfficer } from "@/server/org/service";
import { NotFoundError } from "@/server/errors";
import { Alert, Card, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { OpenCaseForm } from "../discipline-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.dis.new") };
}

export default async function NewCasePage({ searchParams }: PageProps<"/hr/discipline/new">) {
  const actor = await requirePermission("hr:discipline_manage");
  const [p, t] = await Promise.all([searchParams, getT()]);
  const officerId = typeof p.officerId === "string" ? p.officerId : "";
  const q = typeof p.q === "string" ? p.q.trim() : "";
  const crumbs = [{ href: "/hr/discipline", label: t("hr.dis.title") }, { label: t("hr.dis.new") }];
  if (!officerId) {
    const found = q ? await listDossiers(actor, { q, pageSize: 10 }) : null;
    return (
      <div>
        <PageHeader eyebrow={t("hr.section")} title={t("hr.dis.new")} breadcrumbs={crumbs} />
        <Card>
          <form method="get" className="flex flex-wrap gap-3">
            <input name="q" defaultValue={q} placeholder={t("officers.searchPlaceholder")} className="input min-w-[260px] flex-1" aria-label={t("common.search")} />
            <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
              {t("common.search")}
            </button>
          </form>
          {found ? (
            <ul className="mt-4 divide-y divide-line text-sm">
              {found.items.map((o) => (
                <li key={o.id} className="py-2">
                  <Link href={`/hr/discipline/new?officerId=${o.id}`} className="font-semibold text-blue hover:underline">
                    {o.lastName}, {o.firstName}
                  </Link>
                  <span className="ms-2 font-mono text-xs text-slate">{o.badgeNumber}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </div>
    );
  }
  let o;
  try {
    o = await getOfficer(actor, officerId);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.dis.new")} subtitle={`${o.rank.name} ${o.firstName} ${o.lastName} · ${o.badgeNumber}`} breadcrumbs={crumbs} />
      <Alert tone="warning" className="mb-4">
        {t("hr.dis.confidential")}
      </Alert>
      <Card>
        <OpenCaseForm officerId={officerId} />
      </Card>
    </div>
  );
}

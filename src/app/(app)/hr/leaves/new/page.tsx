import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/server/auth/dal";
import { leaveBalance } from "@/server/hr/attendance";
import { listDossiers } from "@/server/hr/service";
import { getOfficer } from "@/server/org/service";
import { NotFoundError } from "@/server/errors";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { LeaveRequestForm } from "../../attendance/attendance-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.leave.new") };
}

export default async function NewLeavePage({ searchParams }: PageProps<"/hr/leaves/new">) {
  const actor = await requireActor();
  const [p, t] = await Promise.all([searchParams, getT()]);
  const canFileForOthers = actor.permissions.has("hr:leave_request") && actor.permissions.has("hr:view");
  const officerId = (typeof p.officerId === "string" && p.officerId) || actor.officerId || "";
  const q = typeof p.q === "string" ? p.q.trim() : "";

  if (!officerId) {
    const found = canFileForOthers && q ? await listDossiers(actor, { q, pageSize: 10 }) : null;
    return (
      <div>
        <PageHeader eyebrow={t("hr.section")} title={t("hr.leave.new")} breadcrumbs={[{ href: "/hr/leaves", label: t("hr.leave.title") }, { label: t("hr.leave.new") }]} />
        <Card>
          {canFileForOthers ? (
            <>
              <form method="get" className="flex flex-wrap gap-3">
                <input name="q" defaultValue={q} placeholder={t("officers.searchPlaceholder")} className="input min-w-[260px] flex-1" aria-label={t("common.search")} />
                <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
                  {t("common.search")}
                </button>
              </form>
              {found ? (
                <ul className="mt-4 divide-y divide-line text-sm">
                  {found.items.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center gap-2 py-2">
                      <Link href={`/hr/leaves/new?officerId=${o.id}`} className="font-semibold text-blue hover:underline">
                        {o.lastName}, {o.firstName}
                      </Link>
                      <span className="font-mono text-xs text-slate">{o.badgeNumber}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <EmptyState>{t("hr.leave.noOfficer")}</EmptyState>
          )}
        </Card>
      </div>
    );
  }

  let name = "";
  try {
    if (officerId !== actor.officerId) {
      if (!canFileForOthers) notFound();
      const o = await getOfficer(actor, officerId);
      name = `${o.rank.name} ${o.firstName} ${o.lastName} · ${o.badgeNumber}`;
    } else {
      name = actor.fullName;
    }
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const balance = await leaveBalance(officerId);
  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.leave.new")} subtitle={name} breadcrumbs={[{ href: "/hr/leaves", label: t("hr.leave.title") }, { label: t("hr.leave.new") }]} />
      <Card>
        <LeaveRequestForm officerId={officerId} balance={balance} />
      </Card>
    </div>
  );
}

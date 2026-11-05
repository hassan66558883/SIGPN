import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { prisma } from "@/server/db";
import { listDossiers } from "@/server/hr/service";
import { getOfficer } from "@/server/org/service";
import { listPositions } from "@/server/org/personnel";
import { NotFoundError } from "@/server/errors";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui";
import { getT } from "@/server/i18n";
import { ProposeTransferForm } from "../transfer-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.transfers.new") };
}

export default async function NewTransferPage({ searchParams }: PageProps<"/hr/transfers/new">) {
  const actor = await requirePermission("hr:transfer_propose");
  const [p, t] = await Promise.all([searchParams, getT()]);
  const officerId = typeof p.officerId === "string" ? p.officerId : "";
  const q = typeof p.q === "string" ? p.q.trim() : "";

  if (!officerId) {
    const found = q ? await listDossiers(actor, { q, pageSize: 10 }) : null;
    return (
      <div>
        <PageHeader eyebrow={t("hr.section")} title={t("hr.transfers.new")} breadcrumbs={[{ href: "/hr/transfers", label: t("hr.transfers.title") }, { label: t("hr.transfers.new") }]} />
        <Card>
          <form method="get" className="flex flex-wrap gap-3">
            <input name="q" defaultValue={q} placeholder={t("officers.searchPlaceholder")} className="input min-w-[260px] flex-1" aria-label={t("common.search")} />
            <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
              {t("common.search")}
            </button>
          </form>
          {found ? (
            found.items.length === 0 ? (
              <div className="mt-4">
                <EmptyState>{t("hr.dossiers.none")}</EmptyState>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-line text-sm">
                {found.items.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-2 py-2">
                    <Link href={`/hr/transfers/new?officerId=${o.id}`} className="font-semibold text-blue hover:underline">
                      {o.lastName}, {o.firstName}
                    </Link>
                    <span className="font-mono text-xs text-slate">{o.badgeNumber}</span>
                    <span className="ms-auto text-xs text-slate">
                      {o.rank.name} · {o.station.name}
                    </span>
                  </li>
                ))}
              </ul>
            )
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
  const [stations, departments, positions, open] = await Promise.all([
    prisma.station.findMany({ where: { isActive: true, status: "ACTIVE" }, orderBy: [{ name: "asc" }], select: { id: true, code: true, name: true } }),
    prisma.department.findMany({ where: { isActive: true, station: { isActive: true } }, orderBy: { name: "asc" }, select: { id: true, name: true, stationId: true } }),
    listPositions(),
    prisma.transferRequest.findFirst({ where: { officerId, status: { in: ["PROPOSED", "HR_APPROVED", "APPROVED"] } }, select: { id: true, number: true } }),
  ]);
  return (
    <div>
      <PageHeader
        eyebrow={t("hr.section")}
        title={t("hr.transfers.new")}
        subtitle={`${o.rank.name} ${o.firstName} ${o.lastName} · ${o.badgeNumber} · ${o.station.name}`}
        breadcrumbs={[{ href: "/hr/transfers", label: t("hr.transfers.title") }, { label: t("hr.transfers.new") }]}
      />
      {open ? (
        <Alert tone="warning" className="mb-4">
          {t("hr.transfers.openHint")}{" "}
          <Link href={`/hr/transfers/${open.id}`} className="font-semibold underline">
            {open.number}
          </Link>
        </Alert>
      ) : null}
      <Alert tone="info" className="mb-4">
        {t("hr.transfers.circuit")}
      </Alert>
      <Card>
        <ProposeTransferForm
          officerId={officerId}
          stations={stations.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))}
          departments={departments.map((d) => ({ value: d.id, label: d.name, stationId: d.stationId }))}
          positions={positions.filter((x) => x.isActive).map((x) => ({ value: x.id, label: x.name }))}
        />
      </Card>
    </div>
  );
}

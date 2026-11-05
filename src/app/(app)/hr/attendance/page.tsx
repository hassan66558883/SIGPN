import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { prisma } from "@/server/db";
import { getRollCall, utcDay } from "@/server/hr/attendance";
import { orgReferences } from "@/server/org/queries";
import { Alert, ButtonLink, Card, EmptyState, PageHeader, Select } from "@/components/ui";
import { getT } from "@/server/i18n";
import { RollCallForm } from "./attendance-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.att.title") };
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export default async function AttendancePage({ searchParams }: PageProps<"/hr/attendance">) {
  const actor = await requirePermission("hr:view");
  const [p, t] = await Promise.all([searchParams, getT()]);
  const refs = await orgReferences(actor);
  const stationId = str(p.stationId) ?? actor.stationId ?? undefined;
  const parsed = str(p.date) ? new Date(String(p.date)) : new Date();
  const date = utcDay(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
  const dateStr = date.toISOString().slice(0, 10);
  const canRecord = actor.permissions.has("hr:attendance_record");
  const sheet = stationId && refs.stations.some((s) => s.id === stationId) ? await getRollCall(actor, stationId, date) : null;
  const counts = sheet ? await prisma.attendanceRecord.groupBy({ by: ["status"], where: { stationId: sheet.station.id, date }, _count: { _all: true } }) : [];
  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.att.title")} subtitle={t("hr.att.subtitle")} actions={<ButtonLink href="/hr/attendance/stats" variant="secondary" size="sm">{t("hr.att.stats")}</ButtonLink>} />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-3">
          <Select name="stationId" defaultValue={stationId ?? ""} placeholder={t("hr.att.chooseStation")} options={refs.stations.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))} aria-label={t("hr.att.chooseStation")} />
          <input name="date" type="date" defaultValue={dateStr} max={new Date().toISOString().slice(0, 10)} className="input" aria-label={t("hr.att.date")} />
          <button type="submit" className="rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white">
            {t("common.filter")}
          </button>
        </form>
      </Card>
      {!sheet ? (
        <EmptyState>{t("hr.att.pick")}</EmptyState>
      ) : (
        <Card title={`${sheet.station.name} — ${dateStr}`} description={counts.length ? counts.map((c) => `${c.status}: ${c._count._all}`).join(" · ") : undefined}>
          {sheet.officers.length === 0 ? (
            <EmptyState>{t("hr.att.noOfficers")}</EmptyState>
          ) : canRecord ? (
            <RollCallForm
              stationId={sheet.station.id}
              date={dateStr}
              rows={sheet.officers.map((o) => ({ id: o.id, badgeNumber: o.badgeNumber, name: `${o.lastName}, ${o.firstName}`, rank: o.rank, status: o.record?.status ?? null, lateMinutes: o.record?.lateMinutes ?? null, note: o.record?.note ?? null, locked: !!o.record?.leaveId }))}
            />
          ) : (
            <>
              <Alert tone="info" className="mb-3">
                {t("hr.att.readOnly")}
              </Alert>
              <ul className="divide-y divide-line text-sm">
                {sheet.officers.map((o) => (
                  <li key={o.id} className="flex justify-between py-1.5">
                    <Link href={`/hr/dossiers/${o.id}`} className="text-blue hover:underline">
                      {o.lastName}, {o.firstName}
                    </Link>
                    <span className="text-xs text-slate">{o.record?.status ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { prisma } from "@/server/db";
import { rotationOverview } from "@/server/hr/rotation";
import { listPositions } from "@/server/org/personnel";
import { Alert, Badge, Card, EmptyState, PageHeader, StatCard, Table } from "@/components/ui";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { roleName } from "@/lib/i18n/catalog";
import { RotationSettingsForm, RunRotationForm } from "./rotation-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.rot.title") };
}

export default async function RotationPage() {
  const actor = await requirePermission("hr:view");
  const [o, t, locale] = await Promise.all([rotationOverview(actor), getT(), getLocale()]);
  const canConfig = actor.permissions.has("hr:auto_assign_config");
  const canRun = actor.permissions.has("hr:transfer_review") && o.cfg.enabled;
  const [positions, validatorRoles, stations] = canConfig
    ? await Promise.all([listPositions(), prisma.role.findMany({ where: { isActive: true, permissions: { some: { permission: { code: "hr:transfer_validate" } } } }, select: { code: true, name: true }, orderBy: { name: "asc" } }), prisma.station.findMany({ where: { isActive: true, status: "ACTIVE" }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } })])
    : [[], [], []];
  const months = (d: Date | null) => (d ? Math.floor((Date.now() - d.getTime()) / (30.44 * 86_400_000)) : 0);
  const last = o.lastRun;
  return (
    <div>
      <PageHeader eyebrow={t("hr.section")} title={t("hr.rot.title")} subtitle={t("hr.rot.subtitle")} actions={canRun ? <RunRotationForm /> : null} />
      <Alert tone={o.cfg.enabled ? "success" : "warning"} className="mb-4" title={`${t("hr.rot.flag")} = ${o.cfg.enabled ? t("hr.rot.on") : t("hr.rot.off")}`}>
        {o.cfg.enabled ? t("hr.rot.onHint") : t("hr.rot.offHint")}
      </Alert>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label={t("hr.rot.due")} value={o.dueCount} tone={o.dueCount ? "danger" : "neutral"} hint={t("hr.rot.dueHint", { n: o.cfg.durationMonths })} />
        <StatCard label={t("hr.rot.upcoming")} value={o.upcomingCount} tone={o.upcomingCount ? "warning" : "neutral"} hint={t("hr.rot.upcomingHint", { n: o.cfg.durationMonths, d: o.cfg.warningDays })} />
        <StatCard label={t("hr.rot.lastRun")} value={last ? fmtDateTime(last.at, locale) : "—"} hint={last ? t("hr.rot.runSummary", { p: last.proposals, a: last.upcomingAlerts, e: last.executedDue, f: last.failedExecutions }) : t("hr.rot.neverRun")} />
      </div>
      <Card title={t("hr.rot.list")} padded={false} className="mb-4">
        {o.rows.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t("hr.rot.none")}</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("hr.rot.col.officer")}</th>
                <th>{t("hr.col.posting")}</th>
                <th>{t("hr.rot.col.since")}</th>
                <th>{t("hr.rot.col.months")}</th>
                <th>{t("hr.rot.col.state")}</th>
              </tr>
            </thead>
            <tbody>
              {o.rows.map((r) => {
                const due = !!r.currentPostSince && r.currentPostSince <= o.dueCutoff;
                return (
                  <tr key={r.id}>
                    <td data-label={t("hr.rot.col.officer")}>
                      <Link href={`/hr/dossiers/${r.id}`} className="font-semibold text-blue hover:underline">
                        {r.lastName}, {r.firstName}
                      </Link>
                      <span className="block font-mono text-[11px] text-slate">
                        {r.badgeNumber} · {r.rank.name}
                      </span>
                    </td>
                    <td data-label={t("hr.col.posting")} className="text-xs">
                      {r.station.name}
                    </td>
                    <td data-label={t("hr.rot.col.since")} className="text-xs">
                      {fmtDate(r.currentPostSince, locale)}
                    </td>
                    <td data-label={t("hr.rot.col.months")} className="text-xs">
                      {months(r.currentPostSince)}
                    </td>
                    <td data-label={t("hr.rot.col.state")} className="space-x-1">
                      <Badge tone={due ? "danger" : "warning"}>{due ? t("hr.rot.state.due") : t("hr.rot.state.upcoming")}</Badge>
                      {r.rotationExceptions.length ? <Badge tone="info">{t("hr.rot.state.exception")}</Badge> : null}
                      {r.transferRequests[0] ? (
                        <Link href={`/hr/transfers/${r.transferRequests[0].id}`}>
                          <Badge tone="violet">{t("hr.rot.state.open", { n: r.transferRequests[0].number })}</Badge>
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <Card title={t("hr.rot.config")}>
        {canConfig ? (
          <RotationSettingsForm
            values={o.cfg}
            positions={positions.filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name }))}
            validators={validatorRoles.map((r) => ({ value: r.code, label: roleName(r.code, r.name, locale) }))}
            stations={stations.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))}
          />
        ) : (
          <p className="text-sm text-slate">{t("hr.rot.cfg.readonly")}</p>
        )}
      </Card>
    </div>
  );
}

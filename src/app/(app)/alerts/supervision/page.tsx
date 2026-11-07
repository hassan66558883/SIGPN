import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { supervisionOverview } from "@/server/alerts/service";
import { prisma } from "@/server/db";
import { Badge, Card, EmptyState, PageHeader, StatCard, Table } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { DANGER_LEVEL, labelOf } from "@/lib/labels";
import type { MessageKey } from "@/lib/i18n";
import { SimulationForm, UnitOfflineButton } from "../alerts-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("sup.title") };
}

const STATUSES = ["PENDING", "DELIVERED", "READ", "ACKNOWLEDGED", "FAILED"] as const;
const KINDS = ["PUBLISHED", "UPDATED", "SUSPENDED", "REACTIVATED", "WITHDRAWN", "EXPIRED", "CLOSED"] as const;
const PERIODS = [1, 7, 30, 90, 365] as const;

const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function SupervisionPage({ searchParams }: PageProps<"/alerts/supervision">) {
  const actor = await requirePermission("alerts:supervise");
  const [sp, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const days = PERIODS.find((p) => String(p) === one(sp.days)) ?? 30;
  const status = STATUSES.find((s) => s === one(sp.status));
  const kind = KINDS.find((k) => k === one(sp.kind));
  const regionId = actor.scopeLevel === "NATIONAL" ? one(sp.region) : undefined;
  const stationId = one(sp.station);
  const [ov, regions] = await Promise.all([supervisionOverview(actor, { days, status, kind, regionId, stationId }), actor.scopeLevel === "NATIONAL" ? prisma.region.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([])]);
  const canSim = actor.permissions.has("alerts:simulate");
  const pendingTotal = ov.units.reduce((s, u) => s + u.pending, 0);
  const byRegion = new Map<string, typeof ov.units>();
  for (const u of ov.units) byRegion.set(u.region.name, [...(byRegion.get(u.region.name) ?? []), u]);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("alerts.eyebrow")} title={t("sup.title")} subtitle={t("sup.subtitle")} />
      <form method="get" className="flex flex-wrap items-end gap-3" aria-label={t("sup.filters")}>
        <div>
          <label htmlFor="f-days" className="label">{t("sup.period")}</label>
          <select id="f-days" name="days" defaultValue={String(days)} className="input">
            {PERIODS.map((p) => <option key={p} value={p}>{p} j</option>)}
          </select>
        </div>
        {regions.length ? (
          <div>
            <label htmlFor="f-region" className="label">{t("sup.province")}</label>
            <select id="f-region" name="region" defaultValue={regionId ?? ""} className="input">
              <option value="">{t("sup.all")}</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        ) : null}
        <div>
          <label htmlFor="f-station" className="label">{t("sup.unit")}</label>
          <select id="f-station" name="station" defaultValue={stationId ?? ""} className="input">
            <option value="">{t("sup.all")}</option>
            {ov.units.map((u) => <option key={u.id} value={u.id}>{u.code} · {u.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-status" className="label">{t("sup.status")}</label>
          <select id="f-status" name="status" defaultValue={status ?? ""} className="input">
            <option value="">{t("sup.all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`alerts.status.${s}` as MessageKey)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-kind" className="label">{t("sup.kind")}</label>
          <select id="f-kind" name="kind" defaultValue={kind ?? ""} className="input">
            <option value="">{t("sup.all")}</option>
            {KINDS.map((k) => <option key={k} value={k}>{t(`alerts.kind.${k}` as MessageKey)}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy hover:brightness-110">{t("sup.apply")}</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("sup.unitsOnline")} value={ov.online} tone="success" />
        <StatCard label={t("sup.unitsOffline")} value={ov.offline} tone={ov.offline ? "warning" : "neutral"} />
        <StatCard label={t("sup.alertsCount")} value={ov.alerts.length} tone="info" />
        <StatCard label={t("sup.pendingTotal")} value={pendingTotal} tone={pendingTotal ? "danger" : "neutral"} />
      </div>

      <Card title={t("sup.alertsTable")} padded={false}>
        {ov.alerts.length === 0 ? (
          <div className="p-5"><EmptyState>{t("sup.noAlerts")}</EmptyState></div>
        ) : (
          <Table className="responsive-table">
            <thead>
              <tr>
                <th>{t("sup.col.alert")}</th>
                <th>{t("sup.col.date")}</th>
                <th>{t("sup.col.scope")}</th>
                <th>{t("sup.col.received")}</th>
                <th>{t("sup.col.read")}</th>
                <th>{t("sup.col.acked")}</th>
                <th>{t("sup.col.failed")}</th>
                <th>{t("sup.col.pending")}</th>
              </tr>
            </thead>
            <tbody>
              {ov.alerts.map((a) => {
                const dl = labelOf(DANGER_LEVEL, a.priority, locale);
                const received = a.counts.DELIVERED + a.counts.READ + a.counts.ACKNOWLEDGED;
                return (
                  <tr key={a.id}>
                    <td data-label={t("sup.col.alert")}>
                      <Link href={`/alerts/supervision/${a.id}`} className="font-semibold text-ink hover:underline">{a.number}</Link>
                      <div className="flex flex-wrap gap-1 pt-1">
                        <Badge tone="info">{t(`alerts.kind.${a.kind}` as MessageKey)}</Badge>
                        <Badge tone={dl.tone}>{dl.label}</Badge>
                        {a.isSimulation ? <Badge tone="violet">{t("alerts.simulation")}</Badge> : null}
                      </div>
                    </td>
                    <td data-label={t("sup.col.date")} className="text-xs">{fmtDateTime(a.createdAt, locale)}</td>
                    <td data-label={t("sup.col.scope")} className="text-xs">{t(`scope.${a.diffusion}` as MessageKey)} · {a.total}</td>
                    <td data-label={t("sup.col.received")} className="tabular-nums">{received}</td>
                    <td data-label={t("sup.col.read")} className="tabular-nums">{a.counts.READ + a.counts.ACKNOWLEDGED}</td>
                    <td data-label={t("sup.col.acked")} className="tabular-nums">{a.counts.ACKNOWLEDGED}</td>
                    <td data-label={t("sup.col.failed")} className="tabular-nums">{a.counts.FAILED}</td>
                    <td data-label={t("sup.col.pending")} className={a.counts.PENDING ? "font-bold tabular-nums text-danger" : "tabular-nums"}>{a.counts.PENDING}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title={t("sup.unitsTable")} padded={false}>
        {[...byRegion.entries()].map(([region, units]) => (
          <div key={region} className="border-b border-line last:border-b-0">
            <p className="bg-mist px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate">{region}</p>
            <ul className="divide-y divide-line">
              {units.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold text-ink">{u.code}</span> <span className="text-slate">{u.name}</span>
                    <span className="block text-xs text-slate">{t("sup.lastSeen")} {u.lastSeenAt ? fmtDateTime(u.lastSeenAt, locale) : t("sup.never")}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {u.pending ? <Badge tone="danger">{u.pending} {t("sup.col.pending").toLowerCase()}</Badge> : null}
                    <Badge tone={u.online ? "success" : "warning"}>{u.online ? "● " + t("sup.online") : "○ " + t("sup.offline")}</Badge>
                    {canSim ? <UnitOfflineButton id={u.id} offline={u.simulatedOffline} /> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Card>

      {canSim ? (
        <Card title={t("sup.simTitle")} description={t("sup.simHint")}>
          <SimulationForm units={ov.units.map((u) => ({ id: u.id, label: `${u.code} · ${u.name}` }))} />
        </Card>
      ) : null}
    </div>
  );
}

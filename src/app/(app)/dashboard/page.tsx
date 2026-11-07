import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { prisma } from "@/server/db";
import { biometricDashboardStats } from "@/server/biometric/queries";
import { wantedDashboardStats } from "@/server/wanted/queries";
import { trafficSummary } from "@/server/traffic/stats";
import { fmtFcfa } from "@/lib/traffic-format";
import { Card, PageHeader, StatCard, EmptyState } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { roleName } from "@/lib/i18n/catalog";
import { operationalStats } from "@/server/dashboard/stats";
import { DASH_PERIODS, parsePeriod } from "@/lib/dash-period";
import { ColumnChart, HBarList, CHART } from "@/components/charts";
import { INCIDENT_TYPE, labelOf } from "@/lib/labels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.dashboard") };
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const actor = await requirePermission("dashboard:view");
  const sp = await searchParams;
  const days = parsePeriod(typeof sp.days === "string" ? sp.days : undefined);
  const national = actor.scopeLevel === "NATIONAL";
  const regions = national ? await prisma.region.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [];
  const regionId = national && typeof sp.region === "string" && regions.some((r) => r.id === sp.region) ? sp.region : undefined;
  const ops = await operationalStats(actor, { days, regionId });
  const canViewBiometric = actor.permissions.has("biometric:history_view");
  const canViewWanted = actor.permissions.has("wanted:view");
  const canViewTraffic = actor.permissions.has("traffic:dashboard");
  const [t, locale, users, activeSessions, recentAudit, notifications, biometric, wanted, traffic] = await Promise.all([
    getT(),
    getLocale(),
    prisma.user.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    actor.permissions.has("audit:view") ? prisma.auditLog.findMany({ orderBy: { at: "desc" }, take: 8 }) : Promise.resolve([]),
    prisma.notification.findMany({ where: { userId: actor.id, readAt: null }, orderBy: { createdAt: "desc" }, take: 5 }),
    canViewBiometric ? biometricDashboardStats(actor) : Promise.resolve(null),
    canViewWanted ? wantedDashboardStats(actor) : Promise.resolve(null),
    canViewTraffic ? trafficSummary(actor) : Promise.resolve(null),
  ]);
  return (
    <div>
      <PageHeader eyebrow={t("dash.eyebrow")} title={t("dash.welcome", { name: actor.firstName })} subtitle={`${roleName(actor.roleCode, actor.roleName, locale)} · ${actor.stationName ?? actor.regionName ?? t("dash.nationalScope")}`} />
      <section aria-label={t("dash.ops.title")} className="mb-8">
        <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="dash-days" className="label">{t("dash.ops.period")}</label>
            <select id="dash-days" name="days" defaultValue={String(ops.days)} className="input">
              {DASH_PERIODS.map((d) => (
                <option key={d} value={d}>{t(`dash.ops.p${d}` as "dash.ops.p7")}</option>
              ))}
            </select>
          </div>
          {national ? (
            <div>
              <label htmlFor="dash-region" className="label">{t("dash.ops.region")}</label>
              <select id="dash-region" name="region" defaultValue={regionId ?? ""} className="input">
                <option value="">{t("dash.ops.allRegions")}</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="pb-2 text-xs text-slate">{t("dash.ops.scopeNote")}</p>
          )}
          <button type="submit" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy hover:brightness-110">{t("dash.ops.apply")}</button>
        </form>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ops.officers !== null ? <StatCard label={t("dash.ops.officers")} value={ops.officers.toLocaleString(locale)} tone="info" href="/officers" /> : null}
          {ops.stations !== null ? <StatCard label={t("dash.ops.stations")} value={ops.stations.toLocaleString(locale)} tone="neutral" /> : null}
          {ops.incidents !== null ? <StatCard label={`${t("dash.ops.incidents")} · ${t(`dash.ops.p${ops.days}` as "dash.ops.p7")}`} value={ops.incidents.toLocaleString(locale)} tone="warning" href="/incidents" /> : null}
          {ops.cases !== null ? <StatCard label={t("dash.ops.cases")} value={ops.cases.toLocaleString(locale)} tone="violet" href="/cases" /> : null}
          {ops.complaints !== null ? <StatCard label={`${t("dash.ops.complaints")} · ${t(`dash.ops.p${ops.days}` as "dash.ops.p7")}`} value={ops.complaints.toLocaleString(locale)} tone="info" href="/complaints" /> : null}
          {ops.wanted !== null ? <StatCard label={t("dash.ops.wanted")} value={ops.wanted.toLocaleString(locale)} tone="danger" href="/wanted?status=ACTIVE" /> : null}
        </div>
        {ops.trend && ops.byType ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card title={t("dash.ops.trend")}>
              <ColumnChart series={[{ name: t("dash.ops.series"), color: CHART.blue, points: ops.trend }]} format={(n) => n.toLocaleString(locale)} title={t("dash.ops.trend")} tableLabel={t("dash.ops.trendTable")} />
            </Card>
            <Card title={t("dash.ops.byType")}>
              <HBarList empty={t("dash.ops.none")} format={(n) => n.toLocaleString(locale)} color={CHART.orange} rows={ops.byType.slice(0, 8).map((r) => ({ label: labelOf(INCIDENT_TYPE, r.type, locale).label, value: r.count }))} />
            </Card>
          </div>
        ) : null}
        {ops.recentIncidents || ops.recentWanted ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {ops.recentIncidents ? (
              <Card title={t("dash.ops.recentIncidents")}>
                {ops.recentIncidents.length === 0 ? (
                  <EmptyState>{t("dash.ops.none")}</EmptyState>
                ) : (
                  <ul className="divide-y divide-line text-sm">
                    {ops.recentIncidents.map((i) => (
                      <li key={i.id} className="py-2">
                        <Link href={`/incidents/${i.id}`} className="font-semibold text-ink hover:underline">{i.title}</Link>
                        <p className="text-xs text-slate">{i.number} · {labelOf(INCIDENT_TYPE, i.type, locale).label} · {i.station.name} · {fmtDateTime(i.occurredAt, locale)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ) : null}
            {ops.recentWanted ? (
              <Card title={t("dash.ops.recentWanted")}>
                {ops.recentWanted.length === 0 ? (
                  <EmptyState>{t("dash.ops.none")}</EmptyState>
                ) : (
                  <ul className="divide-y divide-line text-sm">
                    {ops.recentWanted.map((w) => (
                      <li key={w.id} className="py-2">
                        <Link href={`/wanted/${w.id}`} className="font-semibold text-ink hover:underline">{w.person.lastName} {w.person.firstName}</Link>
                        <p className="text-xs text-slate">{w.number} · {w.offense} · {fmtDateTime(w.issuedAt, locale)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ) : null}
          </div>
        ) : null}
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dash.activeUsers")} value={users} tone="info" href={actor.permissions.has("users:view") ? "/admin/users" : undefined} />
        <StatCard label={t("dash.activeSessions")} value={activeSessions} tone="success" />
        <StatCard label={t("dash.unread")} value={notifications.length} tone={notifications.length ? "warning" : "neutral"} href="/notifications" />
        <StatCard label={t("dash.yourPermissions")} value={actor.permissions.size} tone="violet" href="/account" />
      </div>
      {biometric ? (
        <div className="mt-6">
          <Card title={t("biometric.title")} description={t("biometric.subtitle")}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label={t("biometric.stat.fingerprint")} value={biometric.byType.FINGERPRINT} tone="info" href="/biometric?tab=fingerprint" />
              <StatCard label={t("biometric.stat.face")} value={biometric.byType.FACE} tone="violet" href="/biometric?tab=face" />
              <StatCard label={t("biometric.stat.voice")} value={biometric.byType.VOICE} tone="info" href="/biometric?tab=voice" />
              <StatCard label={t("biometric.stat.anpr")} value={biometric.byType.ANPR} tone="neutral" href="/biometric?tab=anpr" />
              <StatCard label={t("biometric.stat.potential")} value={biometric.potentialMatches} tone="warning" href="/biometric?tab=history" />
              <StatCard label={t("biometric.stat.verified")} value={biometric.verifiedMatches} tone="success" href="/biometric?tab=history" />
              <StatCard label={t("biometric.stat.pending")} value={biometric.pendingVerification} tone="danger" href="/biometric?tab=history" />
            </div>
          </Card>
        </div>
      ) : null}
      {wanted ? (
        <div className="mt-6">
          <Card title={t("wanted.title")}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label={t("wanted.stat.active")} value={wanted.active} tone="danger" href="/wanted?status=ACTIVE" />
              <StatCard label={t("wanted.stat.highPriority")} value={wanted.highPriority} tone="warning" href="/wanted?dangerLevel=HIGH" />
              <StatCard label={t("wanted.stat.recentlyAdded")} value={wanted.recentlyAdded} tone="info" href="/wanted" />
              <StatCard label={t("wanted.stat.located")} value={wanted.located} tone="warning" href="/wanted?status=LOCATED" />
              <StatCard label={t("wanted.stat.apprehended")} value={wanted.apprehended} tone="success" href="/wanted?status=ARRESTED" />
              <StatCard label={t("wanted.stat.cancelled")} value={wanted.cancelled} tone="neutral" href="/wanted?status=CANCELLED" />
            </div>
          </Card>
        </div>
      ) : null}
      {traffic ? (
        <div className="mt-6">
          <Card title={t("traffic.dash.cardTitle")} description={t("traffic.dash.cardSubtitle")} actions={<Link href="/traffic" className="text-xs font-semibold text-blue hover:underline">{t("traffic.dash.open")}</Link>}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label={t("traffic.kpi.controls")} value={traffic.controls30} tone="info" href="/traffic/controls" />
              <StatCard label={t("traffic.kpi.tickets")} value={traffic.tickets30} tone="neutral" href="/traffic/tickets" />
              <StatCard label={t("traffic.kpi.unpaid")} value={traffic.unpaidCount} tone="danger" href="/traffic/fines?status=TO_PAY" />
              <StatCard label={t("traffic.kpi.remaining")} value={<span className="text-2xl">{fmtFcfa(traffic.outstandingFcfa)}</span>} tone="warning" href="/traffic/fines" />
            </div>
          </Card>
        </div>
      ) : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title={t("dash.latestNotifications")}>
          {notifications.length === 0 ? (
            <EmptyState>{t("dash.noUnread")}</EmptyState>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {notifications.map((n) => (
                <li key={n.id} className="py-2">
                  <p className="font-semibold text-ink">{n.title}</p>
                  <p className="text-slate">{n.body}</p>
                  <p className="text-xs text-slate">{fmtDateTime(n.createdAt, locale)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {actor.permissions.has("audit:view") ? (
          <Card title={t("dash.recentAudit")}>
            {recentAudit.length === 0 ? (
              <EmptyState>{t("dash.noAudit")}</EmptyState>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {recentAudit.map((a) => (
                  <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      <span className="font-mono text-xs text-blue">{a.action}</span> <span className="text-ink">{a.summary}</span>
                    </span>
                    <span className="text-xs text-slate">{fmtDateTime(a.at, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : (
          <Card title={t("dash.modulesTitle")}>
            <p className="text-sm text-slate">{t("dash.modulesText")}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

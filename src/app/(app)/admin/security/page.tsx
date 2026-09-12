import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { listActiveSessions, securityOverview } from "@/server/admin/queries";
import { Badge, Card, EmptyState, PageHeader, StatCard, Table } from "@/components/ui";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { env } from "@/server/env";
import { LIMITS } from "@/server/auth/rate-limit";
import { getLocale, getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("sec.title") };
}

export default async function SecurityPage() {
  await requirePermission("security:view");
  const [o, sessions, t, locale] = await Promise.all([securityOverview(), listActiveSessions(), getT(), getLocale()]);
  return (
    <div>
      <PageHeader eyebrow={t("admin.eyebrow")} title={t("sec.title")} subtitle={t("sec.subtitle")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("sec.activeSessions")} value={o.activeSessions} tone="info" />
        <StatCard label={t("sec.failed24h")} value={o.failed24h} tone={o.failed24h > 20 ? "danger" : "warning"} hint={t("sec.successful", { n: o.success24h })} />
        <StatCard label={t("sec.locked")} value={o.lockedAccounts.length} tone={o.lockedAccounts.length ? "danger" : "success"} />
        <StatCard label={t("sec.mfaCoverage")} value={`${o.mfaEnabled}/${o.totalUsers}`} tone={o.rolesRequiringMfa ? "warning" : "success"} hint={o.rolesRequiringMfa ? t("sec.notEnrolled", { n: o.rolesRequiringMfa }) : t("sec.allEnrolled")} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title={t("sec.policy")}>
          <ul className="space-y-1 text-sm text-ink">
            <li>{t("sec.policy1", { n: env.login.maxFailures, m: env.login.lockMinutes })}</li>
            <li>{t("sec.policy2", { n: env.session.idleMinutes, m: env.session.absoluteHours })}</li>
            <li>{t("sec.policy3", { n: env.password.minLength, h: env.password.historySize, d: env.password.maxAgeDays })}</li>
            <li>{t("sec.policy4")}</li>
            <li>{t("sec.policy5", { a: LIMITS.loginIdentifier.limit, b: LIMITS.loginIp.limit })}</li>
            <li>{t("sec.policy6", { n: o.pendingResets, k: o.apiKeys })}</li>
          </ul>
        </Card>
        <Card title={t("sec.lockedCard")}>
          {o.lockedAccounts.length === 0 ? (
            <EmptyState>{t("sec.noLocked")}</EmptyState>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {o.lockedAccounts.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-2">
                  <Link href={`/admin/users/${u.id}`} className="font-semibold text-blue hover:underline">
                    {u.username}
                  </Link>
                  <span className="text-xs text-slate">{t("sec.failuresUntil", { n: u.failedLoginCount, when: fmtDateTime(u.lockedUntil, locale) })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={t("sec.denied")}>
          {o.recentDenied.length === 0 ? (
            <EmptyState>{t("sec.noDenied")}</EmptyState>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {o.recentDenied.map((a) => (
                <li key={a.id} className="py-2">
                  <p className="text-ink">{a.summary}</p>
                  <p className="text-xs text-slate">
                    {a.actorLabel} · {fmtRelative(a.at, locale)} · {a.ipAddress ?? "?"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={t("sec.topIps")}>
          {o.topFailingIps.length === 0 ? (
            <EmptyState>{t("sec.noFailed")}</EmptyState>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {o.topFailingIps.map((r) => (
                <li key={r.ipAddress ?? "?"} className="flex justify-between py-1.5">
                  <span className="font-mono">{r.ipAddress ?? t("sec.unknown")}</span>
                  <Badge tone={r._count > 10 ? "danger" : "warning"}>{r._count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card className="mt-4" title={t("sec.recentAttempts")} padded={false}>
        <Table>
          <thead>
            <tr>
              <th>{t("sec.col.when")}</th>
              <th>{t("sec.col.identifier")}</th>
              <th>{t("sec.col.ip")}</th>
              <th>{t("sec.col.result")}</th>
            </tr>
          </thead>
          <tbody>
            {o.recentAttempts.map((a) => (
              <tr key={a.id}>
                <td data-label={t("sec.col.when")} className="text-xs">
                  {fmtDateTime(a.createdAt, locale)}
                </td>
                <td data-label={t("sec.col.identifier")} className="font-mono text-xs">
                  {a.identifier}
                </td>
                <td data-label={t("sec.col.ip")} className="text-xs">
                  {a.ipAddress ?? "—"}
                </td>
                <td data-label={t("sec.col.result")}>{a.success ? <Badge tone="success">{a.reason ?? t("sec.success")}</Badge> : <Badge tone="danger">{a.reason ?? t("sec.failed")}</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card className="mt-4" title={t("sec.activeSessionsCount", { n: sessions.length })} padded={false}>
        <Table>
          <thead>
            <tr>
              <th>{t("sec.col.user")}</th>
              <th>{t("sec.col.role")}</th>
              <th>{t("sec.col.started")}</th>
              <th>{t("sec.col.lastSeen")}</th>
              <th>{t("sec.col.ip")}</th>
              <th>{t("account.col.mfa")}</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td data-label={t("sec.col.user")}>
                  <Link href={`/admin/users/${s.user.id}`} className="text-blue hover:underline">
                    {s.user.username}
                  </Link>
                </td>
                <td data-label={t("sec.col.role")} className="text-xs">
                  {s.user.role.code}
                </td>
                <td data-label={t("sec.col.started")} className="text-xs">
                  {fmtDateTime(s.createdAt, locale)}
                </td>
                <td data-label={t("sec.col.lastSeen")} className="text-xs">
                  {fmtRelative(s.lastSeenAt, locale)}
                </td>
                <td data-label={t("sec.col.ip")} className="text-xs">
                  {s.ipAddress ?? "—"}
                </td>
                <td data-label={t("account.col.mfa")}>{s.mfaVerified ? <Badge tone="success">{t("common.yes")}</Badge> : <Badge>{t("common.no")}</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

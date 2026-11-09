import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/dal";
import { listActiveSessions, securityOverview } from "@/server/admin/queries";
import { Badge, Card, EmptyState, PageHeader, StatCard, Table } from "@/components/ui";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { env } from "@/server/env";
import { LIMITS } from "@/server/auth/rate-limit";
import { getLocale, getT } from "@/server/i18n";
import { getRequestContext } from "@/server/request-context";
import { verifyAuditChain } from "@/server/audit-chain";
import { listActiveApiKeys } from "@/server/auth/api-keys-admin";
import { revokeAnyApiKeyAction } from "@/server/auth/actions";
import { ActionButton } from "@/components/forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("sec.title") };
}

export default async function SecurityPage({ searchParams }: PageProps<"/admin/security">) {
  const actor = await requirePermission("security:view");
  const [o, sessions, t, locale, sp] = await Promise.all([securityOverview(), listActiveSessions(), getT(), getLocale(), searchParams]);
  const canVerify = actor.permissions.has("audit:view");
  const keys = actor.permissions.has("security:manage") ? await listActiveApiKeys(actor) : null;
  // The walk over the whole chain is run on request only, never on every page view.
  const chain = canVerify && sp.verify === "1" ? await verifyAuditChain(actor, await getRequestContext()) : null;
  return (
    <div>
      <PageHeader eyebrow={t("admin.eyebrow")} title={t("sec.title")} subtitle={t("sec.subtitle")} />
      {canVerify ? (
        <Card className="mb-4" title={t("sec.chain.title")}>
          <p className="text-sm text-slate">{t("sec.chain.intro")}</p>
          <form method="get" className="mt-3">
            <input type="hidden" name="verify" value="1" />
            <button type="submit" className="rounded-md bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">
              {t("sec.chain.run")}
            </button>
          </form>
          {chain ? (
            <div className="mt-3 space-y-1 text-sm" role="status">
              {chain.intact ? <Badge tone="success">{t("sec.chain.intact", { n: chain.checked })}</Badge> : <Badge tone="danger">{t("sec.chain.broken", { n: chain.brokenSeq ?? 0, reason: chain.reason ?? "" })}</Badge>}
              <p className="text-xs text-slate">
                {t("sec.chain.head", { n: chain.headSeq })} <span className="break-all font-mono">{chain.headHash ?? "—"}</span>
              </p>
              <p className="text-xs text-slate">{t("sec.chain.record")}</p>
            </div>
          ) : null}
        </Card>
      ) : null}
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
      {keys ? (
        <Card className="mt-4" title={t("sec.keys.title", { n: keys.length })} description={t("sec.keys.intro")} padded={false}>
          {keys.length === 0 ? (
            <EmptyState>{t("sec.keys.none")}</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t("sec.keys.owner")}</th>
                  <th>{t("account.col.name")}</th>
                  <th>{t("account.col.prefix")}</th>
                  <th>{t("account.col.created")}</th>
                  <th>{t("account.col.lastUsed")}</th>
                  <th>{t("account.col.expires")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td data-label={t("sec.keys.owner")}>
                      <Link href={`/admin/users/${k.user.id}`} className="text-blue hover:underline">
                        {k.user.username}
                      </Link>
                    </td>
                    <td data-label={t("account.col.name")}>{k.name}</td>
                    <td data-label={t("account.col.prefix")} className="font-mono text-xs">
                      pms_{k.keyPrefix}_…
                    </td>
                    <td data-label={t("account.col.created")} className="text-xs">
                      {fmtDateTime(k.createdAt, locale)}
                    </td>
                    <td data-label={t("account.col.lastUsed")} className="text-xs">
                      {k.lastUsedAt ? fmtRelative(k.lastUsedAt, locale) : t("common.never")}
                    </td>
                    <td data-label={t("account.col.expires")} className="text-xs">
                      {k.expiresAt ? fmtDateTime(k.expiresAt, locale) : "—"} {k.expired ? <Badge tone="danger">{t("sec.keys.expired")}</Badge> : null}
                    </td>
                    <td data-label="">
                      <ActionButton action={revokeAnyApiKeyAction} fields={{ id: k.id }} variant="secondary" size="xs" confirm={t("account.revokeKeyConfirm")}>
                        {t("common.revoke")}
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : null}
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

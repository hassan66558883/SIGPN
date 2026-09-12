import type { Metadata } from "next";
import Link from "next/link";
import { requireActor } from "@/server/auth/dal";
import { prisma } from "@/server/db";
import { listOwnSessions } from "@/server/auth/login";
import { Badge, Card, DL, EmptyState, PageHeader, Table, ButtonLink } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { revokeApiKeyAction, revokeOwnSessionAction } from "@/server/auth/actions";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { SCOPE_LEVEL, labelOf } from "@/lib/labels";
import { ApiKeyForm } from "./api-key-form";
import { getLocale, getT } from "@/server/i18n";
import { roleName } from "@/lib/i18n/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("account.title") };
}

export default async function AccountPage() {
  const actor = await requireActor();
  const [t, locale, sessions, apiKeys, recovery] = await Promise.all([
    getT(),
    getLocale(),
    listOwnSessions(actor),
    prisma.apiKey.findMany({ where: { userId: actor.id, revokedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.mfaRecoveryCode.count({ where: { userId: actor.id, usedAt: null } }),
  ]);
  const scope = labelOf(SCOPE_LEVEL, actor.scopeLevel, locale);
  return (
    <div>
      <PageHeader eyebrow={t("account.eyebrow")} title={actor.fullName} subtitle={`@${actor.username} · ${actor.email}`} actions={<ButtonLink href="/account/password" variant="secondary">{t("account.changePassword")}</ButtonLink>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("account.profileCard")}>
          <DL
            items={[
              { label: t("account.role"), value: roleName(actor.roleCode, actor.roleName, locale) },
              { label: t("account.scope"), value: <Badge tone={scope.tone}>{scope.label}</Badge> },
              { label: t("account.region"), value: actor.regionName ?? "—" },
              { label: t("account.station"), value: actor.stationName ?? "—" },
              { label: t("account.permissions"), value: t("account.granted", { n: actor.permissions.size }) },
              { label: t("account.signInMethod"), value: actor.authMethod === "session" ? t("account.methodPassword") + (actor.mfaEnabled ? t("account.methodAuthenticator") : "") : t("account.methodApiKey") },
            ]}
          />
          <details className="mt-4 text-xs">
            <summary className="cursor-pointer font-semibold text-slate">{t("account.showPermissions")}</summary>
            <div className="mt-2 flex flex-wrap gap-1">
              {Array.from(actor.permissions)
                .sort()
                .map((p) => (
                  <code key={p} className="rounded bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink">
                    {p}
                  </code>
                ))}
            </div>
          </details>
        </Card>
        <Card title={t("account.mfaCard")} actions={<ButtonLink href="/account/mfa" variant={actor.mfaEnabled ? "secondary" : "primary"} size="sm">{actor.mfaEnabled ? t("account.manage") : t("account.enable")}</ButtonLink>}>
          {actor.mfaEnabled ? (
            <div className="text-sm">
              <Badge tone="success">{t("account.enabled")}</Badge>
              <p className="mt-2 text-slate">
                {t("account.mfaEnabledText", { n: recovery })}
                {actor.roleRequiresMfa ? t("account.mfaRequiredByRole") : ""}
              </p>
            </div>
          ) : (
            <div className="text-sm">
              <Badge tone={actor.roleRequiresMfa ? "danger" : "warning"}>{t("account.notEnabled")}</Badge>
              <p className="mt-2 text-slate">{actor.roleRequiresMfa ? t("account.mfaRoleRequires") : t("account.mfaProtect")}</p>
            </div>
          )}
        </Card>
      </div>
      <Card className="mt-4" title={t("account.sessions")} description={t("account.sessionsDesc")}>
        <Table>
          <thead>
            <tr>
              <th>{t("account.col.started")}</th>
              <th>{t("account.col.lastActivity")}</th>
              <th>{t("account.col.ip")}</th>
              <th>{t("account.col.device")}</th>
              <th>{t("account.col.mfa")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className={s.id === actor.sessionId ? "bg-info-soft/40" : undefined}>
                <td data-label={t("account.col.started")}>{fmtDateTime(s.createdAt, locale)}</td>
                <td data-label={t("account.col.lastActivity")}>{fmtRelative(s.lastSeenAt, locale)}</td>
                <td data-label={t("account.col.ip")}>{s.ipAddress ?? "—"}</td>
                <td data-label={t("account.col.device")} className="max-w-xs truncate text-xs" title={s.userAgent ?? ""}>
                  {s.userAgent ?? "—"}
                </td>
                <td data-label={t("account.col.mfa")}>{s.mfaVerified ? <Badge tone="success">{t("account.verified")}</Badge> : <Badge>—</Badge>}</td>
                <td data-label="">
                  {s.id === actor.sessionId ? (
                    <Badge tone="info">{t("account.thisSession")}</Badge>
                  ) : (
                    <ActionButton action={revokeOwnSessionAction} fields={{ sessionId: s.id }} variant="secondary" size="xs">
                      {t("common.revoke")}
                    </ActionButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      {actor.permissions.has("apikeys:manage_own") ? (
        <Card className="mt-4" title={t("account.apiKeys")} description={t("account.apiKeysDesc")}>
          {apiKeys.length === 0 ? (
            <EmptyState>{t("account.noApiKeys")}</EmptyState>
          ) : (
            <Table className="mb-4">
              <thead>
                <tr>
                  <th>{t("account.col.name")}</th>
                  <th>{t("account.col.prefix")}</th>
                  <th>{t("account.col.created")}</th>
                  <th>{t("account.col.lastUsed")}</th>
                  <th>{t("account.col.expires")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((k) => (
                  <tr key={k.id}>
                    <td data-label={t("account.col.name")}>{k.name}</td>
                    <td data-label={t("account.col.prefix")} className="font-mono text-xs">
                      pms_{k.keyPrefix}_…
                    </td>
                    <td data-label={t("account.col.created")}>{fmtDateTime(k.createdAt, locale)}</td>
                    <td data-label={t("account.col.lastUsed")}>{k.lastUsedAt ? fmtRelative(k.lastUsedAt, locale) : t("common.never")}</td>
                    <td data-label={t("account.col.expires")}>{k.expiresAt ? fmtDateTime(k.expiresAt, locale) : t("common.never")}</td>
                    <td data-label="">
                      <ActionButton action={revokeApiKeyAction} fields={{ id: k.id }} variant="secondary" size="xs" confirm={t("account.revokeKeyConfirm")}>
                        {t("common.revoke")}
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <ApiKeyForm />
          <p className="mt-3 text-xs text-slate">
            {t("account.apiUsage")} <code className="rounded bg-mist px-1">Authorization: Bearer pms_…</code> {t("account.apiUsageAgainst")}{" "}
            <Link href="/api/v1/auth/me" className="text-blue hover:underline">
              /api/v1/…
            </Link>
            . {t("account.apiSeeDocs")}
          </p>
        </Card>
      ) : null}
    </div>
  );
}

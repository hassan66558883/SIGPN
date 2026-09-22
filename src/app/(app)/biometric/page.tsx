import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import type { BiometricType } from "@/generated/prisma/client";
import { canAny, requireActor } from "@/server/auth/dal";
import type { Permission } from "@/server/rbac/permissions";
import { listCases } from "@/server/cases/queries";
import { biometricDashboardStats, biometricHistory } from "@/server/biometric/queries";
import { Badge, Card, EmptyState, PageHeader, StatCard, Table, Tabs } from "@/components/ui";
import { BIOMETRIC_SEARCH_RESULT, BIOMETRIC_TYPE, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import type { TFunction, Locale } from "@/lib/i18n";
import { AnprDetectForm, AnprSearchForm, EnrollFaceForm, EnrollFingerprintForm, EnrollVoiceForm, FaceSearchForm, FingerprintSearchForm, VoiceSearchForm } from "./biometric-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("biometric.title") };
}

const ALL_BIOMETRIC_PERMS: Permission[] = ["biometric:search_fingerprint", "biometric:search_face", "biometric:search_voice", "biometric:search_anpr", "biometric:manage", "biometric:history_view", "biometric:verify"];

const TABS = ["overview", "fingerprint", "face", "anpr", "voice", "history"] as const;
type Tab = (typeof TABS)[number];
type HistoryRows = Awaited<ReturnType<typeof biometricHistory>>["items"];

function ActivityTable({ rows, t, locale }: { rows: HistoryRows; t: TFunction; locale: Locale }) {
  if (!rows.length) return <EmptyState>{t("biometric.noActivity")}</EmptyState>;
  return (
    <Table>
      <thead>
        <tr>
          <th>{t("biometric.col.search")}</th>
          <th>{t("biometric.col.type")}</th>
          <th>{t("biometric.col.case")}</th>
          <th>{t("biometric.col.result")}</th>
          <th>{t("biometric.col.when")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const type = labelOf(BIOMETRIC_TYPE, r.type, locale);
          const result = labelOf(BIOMETRIC_SEARCH_RESULT, r.result, locale);
          return (
            <tr key={r.id}>
              <td data-label={t("biometric.col.search")}>
                <Link href={`/biometric/history/${r.id}`} className="font-semibold text-blue hover:underline">
                  {r.number}
                </Link>
                {r.isDemo ? (
                  <Badge tone="warning" className="ml-1">
                    DEMO
                  </Badge>
                ) : null}
              </td>
              <td data-label={t("biometric.col.type")}>
                <Badge tone={type.tone}>{type.label}</Badge>
              </td>
              <td data-label={t("biometric.col.case")} className="text-xs">
                <Link href={`/cases/${r.case.id}`} className="text-blue hover:underline">
                  {r.case.number}
                </Link>
              </td>
              <td data-label={t("biometric.col.result")}>
                <Badge tone={result.tone}>{result.label}</Badge>
                {r.topMatchScore ? <span className="ml-1 text-xs text-slate">{Number(r.topMatchScore)}%</span> : null}
              </td>
              <td data-label={t("biometric.col.when")} className="text-xs">
                {fmtDateTime(r.createdAt, locale)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

export default async function BiometricPage({ searchParams }: PageProps<"/biometric">) {
  const actor = await requireActor();
  if (!canAny(actor, ALL_BIOMETRIC_PERMS)) forbidden();
  const [sp, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "overview";
  const defaultCaseId = typeof sp.caseId === "string" ? sp.caseId : undefined;
  const personId = typeof sp.personId === "string" ? sp.personId : undefined;
  const canViewHistory = actor.permissions.has("biometric:history_view");
  const cases = await listCases(actor, { pageSize: 50 }).then((r) => r.items.map((c) => ({ id: c.id, label: `${c.number} · ${c.title.slice(0, 60)}` })));
  const stats = tab === "overview" && canViewHistory ? await biometricDashboardStats(actor) : null;
  const typeForTab: Record<Tab, BiometricType | undefined> = { overview: undefined, fingerprint: "FINGERPRINT", face: "FACE", anpr: "ANPR", voice: "VOICE", history: undefined };
  const recent = canViewHistory && tab !== "overview" ? await biometricHistory(actor, { type: typeForTab[tab], personId: tab === "history" ? personId : undefined, pageSize: 15 }) : null;
  const overviewRecent = tab === "overview" && canViewHistory ? await biometricHistory(actor, { pageSize: 10 }) : null;

  const href = (x: Tab) => `/biometric${x === "overview" ? "" : `?tab=${x}`}`;
  const tabs = [
    { href: href("overview"), label: t("biometric.tab.overview") },
    ...(actor.permissions.has("biometric:search_fingerprint") || actor.permissions.has("biometric:manage") ? [{ href: href("fingerprint"), label: t("biometric.tab.fingerprint") }] : []),
    ...(actor.permissions.has("biometric:search_face") || actor.permissions.has("biometric:manage") ? [{ href: href("face"), label: t("biometric.tab.face") }] : []),
    ...(actor.permissions.has("biometric:search_anpr") ? [{ href: href("anpr"), label: t("biometric.tab.anpr") }] : []),
    ...(actor.permissions.has("biometric:search_voice") || actor.permissions.has("biometric:manage") ? [{ href: href("voice"), label: t("biometric.tab.voice") }] : []),
    ...(canViewHistory ? [{ href: href("history"), label: t("biometric.tab.history") }] : []),
  ];

  return (
    <div>
      <PageHeader eyebrow={t("biometric.eyebrow")} title={t("biometric.title")} subtitle={t("biometric.subtitle")} />
      <Tabs items={tabs} current={href(tab)} />
      <div className="mt-4 space-y-4">
        {tab === "overview" ? (
          <>
            {stats ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t("biometric.stat.fingerprint")} value={stats.byType.FINGERPRINT} tone="info" href="/biometric?tab=fingerprint" />
                <StatCard label={t("biometric.stat.face")} value={stats.byType.FACE} tone="violet" href="/biometric?tab=face" />
                <StatCard label={t("biometric.stat.voice")} value={stats.byType.VOICE} tone="info" href="/biometric?tab=voice" />
                <StatCard label={t("biometric.stat.anpr")} value={stats.byType.ANPR} tone="neutral" href="/biometric?tab=anpr" />
                <StatCard label={t("biometric.stat.potential")} value={stats.potentialMatches} tone="warning" />
                <StatCard label={t("biometric.stat.verified")} value={stats.verifiedMatches} tone="success" />
                <StatCard label={t("biometric.stat.pending")} value={stats.pendingVerification} tone="danger" />
                <StatCard label={t("biometric.stat.forensic")} value={t("biometric.stat.forensicLink")} href="/evidence" />
              </div>
            ) : null}
            <Card title={t("biometric.recentActivity")}>{overviewRecent ? <ActivityTable rows={overviewRecent.items} t={t} locale={locale} /> : <EmptyState>{t("biometric.noAccessHistory")}</EmptyState>}</Card>
          </>
        ) : null}

        {tab === "fingerprint" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {actor.permissions.has("biometric:search_fingerprint") ? (
              <Card title={t("biometric.newSearch")}>
                <FingerprintSearchForm cases={cases} defaultCaseId={defaultCaseId} />
              </Card>
            ) : null}
            {actor.permissions.has("biometric:manage") ? (
              <Card title={t("biometric.enrollFingerprint")}>
                <EnrollFingerprintForm />
              </Card>
            ) : null}
          </div>
        ) : null}

        {tab === "face" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {actor.permissions.has("biometric:search_face") ? (
              <Card title={t("biometric.newSearch")}>
                <FaceSearchForm cases={cases} defaultCaseId={defaultCaseId} />
              </Card>
            ) : null}
            {actor.permissions.has("biometric:manage") ? (
              <Card title={t("biometric.enrollFace")}>
                <EnrollFaceForm />
              </Card>
            ) : null}
          </div>
        ) : null}

        {tab === "voice" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {actor.permissions.has("biometric:search_voice") ? (
              <Card title={t("biometric.newSearch")}>
                <VoiceSearchForm cases={cases} defaultCaseId={defaultCaseId} />
              </Card>
            ) : null}
            {actor.permissions.has("biometric:manage") ? (
              <Card title={t("biometric.enrollVoice")}>
                <EnrollVoiceForm />
              </Card>
            ) : null}
          </div>
        ) : null}

        {tab === "anpr" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={t("biometric.detectPlate")}>
              <AnprDetectForm cases={cases} defaultCaseId={defaultCaseId} />
            </Card>
            <Card title={t("biometric.searchPlate")}>
              <AnprSearchForm cases={cases} defaultCaseId={defaultCaseId} />
            </Card>
          </div>
        ) : null}

        {tab !== "overview" && tab !== "history" && recent ? (
          <Card title={t("biometric.recentActivity")}>
            <ActivityTable rows={recent.items} t={t} locale={locale} />
          </Card>
        ) : null}

        {tab === "history" && recent ? (
          <Card title={t("biometric.tab.history")}>
            <ActivityTable rows={recent.items} t={t} locale={locale} />
          </Card>
        ) : null}
      </div>
    </div>
  );
}

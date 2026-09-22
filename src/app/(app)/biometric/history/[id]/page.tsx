import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getBiometricSearch } from "@/server/biometric/queries";
import { Alert, Badge, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { BIOMETRIC_ACTION, BIOMETRIC_SEARCH_MODE, BIOMETRIC_SEARCH_RESULT, BIOMETRIC_TYPE, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { RecordActionForm } from "../../biometric-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("biometric.result") };
}

export default async function BiometricSearchPage({ params }: PageProps<"/biometric/history/[id]">) {
  const actor = await requirePermission("biometric:history_view");
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  const s = await getBiometricSearch(actor, id);
  if (!s) notFound();
  const type = labelOf(BIOMETRIC_TYPE, s.type, locale);
  const mode = labelOf(BIOMETRIC_SEARCH_MODE, s.mode, locale);
  const result = labelOf(BIOMETRIC_SEARCH_RESULT, s.result, locale);
  const action = labelOf(BIOMETRIC_ACTION, s.action, locale);
  const canVerify = actor.permissions.has("biometric:verify");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={t("biometric.eyebrow")}
        title={s.number}
        subtitle={`${type.label} · ${mode.label} · ${fmtDateTime(s.createdAt, locale)}`}
        breadcrumbs={[{ href: "/biometric?tab=history", label: t("biometric.tab.history") }, { label: s.number }]}
        actions={
          <>
            <Badge tone={type.tone}>{type.label}</Badge>
            <Badge tone={result.tone}>{result.label}</Badge>
            {s.isDemo ? <Badge tone="warning">DEMO / TEST</Badge> : null}
          </>
        }
      />
      {s.isDemo ? <Alert tone="warning" className="mb-4">{t("biometric.demoNotice")}</Alert> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={s.result === "POTENTIAL_MATCH" ? t("biometric.potentialMatch") : t("biometric.noMatchTitle")}>
            {s.result === "POTENTIAL_MATCH" ? (
              <>
                <DL
                  items={[
                    { label: t("biometric.person"), value: s.topMatchPerson ? <Link href={`/persons/${s.topMatchPerson.id}`} className="text-blue hover:underline">{s.topMatchPerson.firstName} {s.topMatchPerson.lastName} ({s.topMatchPerson.number})</Link> : "—" },
                    { label: t("biometric.matchScore"), value: s.topMatchScore ? `${Number(s.topMatchScore)}%` : "—" },
                    { label: t("biometric.source"), value: s.matches[0]?.sourceLabel ?? "—" },
                    { label: t("biometric.relatedCases"), value: t("biometric.relatedCasesCount", { n: s.matches.length }) },
                    { label: t("biometric.status"), value: <Badge tone="warning">{t("biometric.requiresVerification")}</Badge> },
                  ]}
                  cols={2}
                />
                <p className="mt-3 text-xs text-slate">{t("biometric.investigativeLeadNotice")}</p>
              </>
            ) : (
              <EmptyState>{t("biometric.noMatchHint")}</EmptyState>
            )}
          </Card>
          {s.mode === "IDENTIFY_1_N" && s.matches.length > 1 ? (
            <Card title={t("biometric.allCandidates")}>
              <Table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("biometric.person")}</th>
                    <th>{t("biometric.matchScore")}</th>
                    <th>{t("biometric.source")}</th>
                  </tr>
                </thead>
                <tbody>
                  {s.matches.map((m) => (
                    <tr key={m.rank}>
                      <td data-label="#">{m.rank}</td>
                      <td data-label={t("biometric.person")}>{m.person ? <Link href={`/persons/${m.person.id}`} className="text-blue hover:underline">{m.person.firstName} {m.person.lastName}</Link> : "—"}</td>
                      <td data-label={t("biometric.matchScore")}>{Number(m.score)}%</td>
                      <td data-label={t("biometric.source")} className="text-xs">{m.sourceLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          ) : null}
          <Card title={t("biometric.searchDetails")}>
            <DL
              items={[
                { label: t("biometric.case"), value: <Link href={`/cases/${s.case.id}`} className="text-blue hover:underline">{s.case.number} — {s.case.title}</Link> },
                { label: t("biometric.officer"), value: `${s.officer.firstName} ${s.officer.lastName}` },
                { label: t("biometric.reason"), value: s.reason },
                { label: t("biometric.device"), value: s.device ?? "—" },
                { label: t("biometric.location"), value: s.location ?? "—" },
              ]}
              cols={2}
            />
          </Card>
        </div>
        <div className="space-y-4">
          <Card title={t("biometric.investigatorAction")}>
            <p className="mb-2 text-sm">
              {t("biometric.currentAction")}: <Badge tone={action.tone}>{action.label}</Badge>
            </p>
            {s.actionNotes ? <p className="mb-3 text-xs text-slate">{s.actionNotes}</p> : null}
            {canVerify ? <RecordActionForm searchId={s.id} /> : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

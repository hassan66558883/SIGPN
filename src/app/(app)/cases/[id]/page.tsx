import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getCase } from "@/server/cases/service";
import { caseAuditTrail, caseNotes, caseTasks, caseTimeline } from "@/server/cases/queries";
import { assignableInvestigators } from "@/server/complaints/queries";
import { caseBiometricActivity } from "@/server/biometric/queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, ButtonLink, Card, DL, EmptyState, PageHeader, Table, Tabs } from "@/components/ui";
import { BIOMETRIC_ACTION, BIOMETRIC_SEARCH_RESULT, BIOMETRIC_TYPE, CASE_DISPOSITION, CASE_ROLE, CASE_STATUS, LPR_STATUS, OFFENSE_CATEGORY, PARTY_ROLE, PARTY_STATUS, PRIORITY, TASK_STATUS, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { AddPartyForm, AssignCaseForm, CaseStatusForm, NoteForm, PartyStatusForm, TaskForm, TaskStatusForm } from "../case-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("cases.col.case") };
}

const TABS = ["overview", "persons", "biometric", "tasks", "notes", "timeline", "audit"] as const;
type Tab = (typeof TABS)[number];

export default async function CasePage({ params, searchParams }: PageProps<"/cases/[id]">) {
  const actor = await requirePermission("cases:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let k;
  try {
    k = await getCase(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "overview";
  const isTeam = k.lead?.id === actor.id || k.supervisor?.id === actor.id || k.createdBy.id === actor.id || k.assignments.some((a) => a.userId === actor.id);
  const readOnly = ["CLOSED", "ARCHIVED"].includes(k.status);
  const canWrite = actor.permissions.has("cases:update") && !readOnly && (isTeam || actor.permissions.has("cases:assign"));
  const canAssign = actor.permissions.has("cases:assign") && !readOnly;
  const canSeeConfidential = actor.permissions.has("cases:close") || k.supervisor?.id === actor.id;
  const canViewBiometric = actor.permissions.has("biometric:history_view");
  const [users, tasks, notes, timeline, audit, biometric] = await Promise.all([
    canWrite || canAssign ? assignableInvestigators(actor, k.stationId) : Promise.resolve([]),
    tab === "tasks" || tab === "overview" ? caseTasks(k.id) : Promise.resolve([]),
    tab === "notes" ? caseNotes(actor, k.id, canSeeConfidential) : Promise.resolve([]),
    tab === "timeline" || tab === "overview" ? caseTimeline(k.id, tab === "overview" ? 8 : 200) : Promise.resolve([]),
    tab === "audit" && actor.permissions.has("audit:view") ? caseAuditTrail(k.id) : Promise.resolve([]),
    tab === "biometric" && canViewBiometric ? caseBiometricActivity(k.id) : Promise.resolve(null),
  ]);
  const userOpts = users.map((u) => ({ id: u.id, label: `${u.firstName} ${u.lastName} (${u.role.code}${u.station ? ` · ${u.station.code}` : ""})` }));
  const st = labelOf(CASE_STATUS, k.status, locale);
  const cat = labelOf(OFFENSE_CATEGORY, k.category, locale);
  const pr = labelOf(PRIORITY, k.priority, locale);
  const href = (x: Tab) => `/cases/${k.id}${x === "overview" ? "" : `?tab=${x}`}`;
  const tabs = [
    { href: href("overview"), label: t("case.tab.overview") },
    { href: href("persons"), label: t("case.tab.persons"), count: k.parties.length },
    ...(canViewBiometric ? [{ href: href("biometric"), label: t("case.tab.biometric") }] : []),
    { href: href("tasks"), label: t("case.tab.tasks"), count: k._count.tasks },
    { href: href("notes"), label: t("case.tab.notes"), count: k._count.notes },
    { href: href("timeline"), label: t("case.tab.timeline"), count: k._count.events },
    ...(actor.permissions.has("audit:view") ? [{ href: href("audit"), label: t("case.tab.audit") }] : []),
  ];
  return (
    <div>
      <PageHeader
        eyebrow={t("case.eyebrow")}
        title={k.title}
        subtitle={`${k.number} · ${k.station.name} · ${fmtDateTime(k.reportedAt, locale)}`}
        breadcrumbs={[{ href: "/cases", label: t("cases.title") }, { label: k.number }]}
        actions={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            <Badge tone={pr.tone}>{pr.label}</Badge>
            <Badge tone={cat.tone}>{cat.label}</Badge>
            {k.isSensitive ? <Badge tone="danger">{t("case.sensitive")}</Badge> : null}
          </>
        }
      />
      {sp.created === "1" ? (
        <Alert tone="success" className="mb-4">
          {t("case.createdAlert", { number: k.number })}
        </Alert>
      ) : null}
      {readOnly ? (
        <Alert tone="neutral" className="mb-4">
          {t("case.readOnly")}
        </Alert>
      ) : !isTeam && !actor.permissions.has("cases:assign") ? (
        <Alert tone="info" className="mb-4">
          {t("case.notTeam")}
        </Alert>
      ) : null}
      <Tabs items={tabs} current={href(tab)} />

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card title={t("case.description")}>
              <DL
                items={[
                  { label: t("case.occurredAt"), value: fmtDateTime(k.occurredAt, locale) },
                  { label: t("case.location"), value: k.locationText ?? "—" },
                  { label: t("case.department"), value: k.department?.name ?? "—" },
                  { label: t("case.fromComplaint"), value: k.complaint ? <Link href={`/complaints/${k.complaint.id}`} className="text-blue hover:underline">{k.complaint.number}</Link> : "—" },
                  ...(k.disposition ? [{ label: t("case.disposition"), value: `${labelOf(CASE_DISPOSITION, k.disposition, locale).label}${k.dispositionNotes ? ` — ${k.dispositionNotes}` : ""}` }, { label: t("case.closedAt"), value: fmtDateTime(k.closedAt, locale) }] : []),
                ]}
              />
              <p className="mt-4 whitespace-pre-wrap text-sm text-ink">{k.description}</p>
              <p className="mt-3 text-xs text-slate">{t("case.counts", { parties: k.parties.length, tasks: k._count.tasks, evidence: k._count.evidence })}</p>
            </Card>
            <Card title={t("case.timeline")} actions={<Link href={href("timeline")} className="text-xs font-semibold text-blue hover:underline">{t("case.tab.timeline")} →</Link>}>
              {timeline.length === 0 ? <EmptyState>{t("case.noTimeline")}</EmptyState> : <Timeline items={timeline} locale={locale} t={t} />}
            </Card>
          </div>
          <div className="space-y-4">
            <Card title={t("case.team")}>
              <ul className="divide-y divide-line text-sm">
                {k.assignments.map((a) => {
                  const r = labelOf(CASE_ROLE, a.role, locale);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-2 py-1.5">
                      <span>
                        <span className="font-semibold text-ink">
                          {a.user.firstName} {a.user.lastName}
                        </span>
                        <span className="block text-xs text-slate">
                          @{a.user.username} · {fmtDateTime(a.assignedAt, locale)}
                        </span>
                      </span>
                      <Badge tone={r.tone}>{r.label}</Badge>
                    </li>
                  );
                })}
                {k.assignments.length === 0 ? <li className="py-2 text-xs text-slate">—</li> : null}
              </ul>
              {canAssign ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-blue">{t("case.assign")}</summary>
                  <div className="mt-2 rounded-md border border-line bg-mist p-3">
                    <AssignCaseForm caseId={k.id} users={userOpts} />
                  </div>
                </details>
              ) : null}
            </Card>
            {(canWrite || (actor.permissions.has("cases:archive") && k.status === "CLOSED")) && !["ARCHIVED"].includes(k.status) ? (
              <Card title={t("case.changeStatus")}>
                <CaseStatusForm caseId={k.id} current={k.status} canClose={actor.permissions.has("cases:close")} canArchive={actor.permissions.has("cases:archive")} />
              </Card>
            ) : null}
            <Card title={t("case.tab.tasks")}>
              {tasks.filter((x) => x.status !== "DONE" && x.status !== "CANCELLED").length === 0 ? (
                <EmptyState>{t("case.noTasks")}</EmptyState>
              ) : (
                <ul className="divide-y divide-line text-sm">
                  {tasks
                    .filter((x) => x.status !== "DONE" && x.status !== "CANCELLED")
                    .slice(0, 6)
                    .map((x) => {
                      const ts = labelOf(TASK_STATUS, x.status, locale);
                      return (
                        <li key={x.id} className="flex items-center justify-between gap-2 py-1.5">
                          <span className="text-ink">{x.title}</span>
                          <Badge tone={ts.tone}>{ts.label}</Badge>
                        </li>
                      );
                    })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "persons" ? (
        <Card title={t("case.parties")} description={t("person.presumption")} padded={false}>
          {k.parties.length === 0 ? (
            <div className="p-5">
              <EmptyState>{t("case.noParties")}</EmptyState>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t("persons.col.person")}</th>
                  <th>{t("case.partyRole")}</th>
                  <th>{t("case.partyStatus")}</th>
                  <th>{t("case.partyNotes")}</th>
                </tr>
              </thead>
              <tbody>
                {k.parties.map((cp) => {
                  const r = labelOf(PARTY_ROLE, cp.role, locale);
                  const s = labelOf(PARTY_STATUS, cp.status, locale);
                  return (
                    <tr key={cp.id}>
                      <td data-label={t("persons.col.person")}>
                        <Link href={`/persons/${cp.person.id}`} className="font-semibold text-blue hover:underline">
                          {cp.person.lastName} {cp.person.firstName}
                        </Link>
                        <span className="block font-mono text-[11px] text-slate">
                          {cp.person.number}
                          {cp.person.phone ? ` · ${cp.person.phone}` : ""}
                        </span>
                      </td>
                      <td data-label={t("case.partyRole")}>
                        <Badge tone={r.tone}>{r.label}</Badge>
                      </td>
                      <td data-label={t("case.partyStatus")}>
                        <Badge tone={s.tone}>{s.label}</Badge>
                        {canWrite ? (
                          <div className="mt-1">
                            <PartyStatusForm partyId={cp.id} current={cp.status} />
                          </div>
                        ) : null}
                      </td>
                      <td data-label={t("case.partyNotes")} className="text-xs">
                        {cp.notes ?? "—"}
                        {cp.injuries ? <span className="block text-danger">{cp.injuries}</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          {canWrite ? (
            <div className="border-t border-line p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">{t("case.addParty")}</p>
              <AddPartyForm caseId={k.id} />
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === "biometric" ? (
        <div className="space-y-4">
          <Card
            title={t("case.tab.biometric")}
            actions={
              actor.permissions.has("biometric:search_fingerprint") || actor.permissions.has("biometric:search_face") || actor.permissions.has("biometric:search_voice") || actor.permissions.has("biometric:search_anpr") ? (
                <ButtonLink href={`/biometric?caseId=${k.id}`} size="sm">
                  {t("biometric.newSearch")}
                </ButtonLink>
              ) : null
            }
            padded={false}
          >
            {!biometric || biometric.searches.length === 0 ? (
              <div className="p-5">
                <EmptyState>{t("biometric.noActivity")}</EmptyState>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>{t("biometric.col.search")}</th>
                    <th>{t("biometric.col.type")}</th>
                    <th>{t("case.tab.persons")}</th>
                    <th>{t("biometric.col.result")}</th>
                    <th>{t("biometric.col.when")}</th>
                  </tr>
                </thead>
                <tbody>
                  {biometric.searches.map((r) => {
                    const type = labelOf(BIOMETRIC_TYPE, r.type, locale);
                    const result = labelOf(BIOMETRIC_SEARCH_RESULT, r.result, locale);
                    const action = labelOf(BIOMETRIC_ACTION, r.action, locale);
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
                        <td data-label={t("case.tab.persons")} className="text-xs">
                          {r.topMatchPerson ? (
                            <Link href={`/persons/${r.topMatchPerson.id}`} className="text-blue hover:underline">
                              {r.topMatchPerson.firstName} {r.topMatchPerson.lastName}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td data-label={t("biometric.col.result")}>
                          <Badge tone={result.tone}>{result.label}</Badge>
                          <span className="ml-1 block text-[11px] text-slate">{action.label}</span>
                        </td>
                        <td data-label={t("biometric.col.when")} className="text-xs">
                          {fmtDateTime(r.createdAt, locale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
          {biometric && biometric.plates.length > 0 ? (
            <Card title={t("biometric.tab.anpr")} padded={false}>
              <Table>
                <thead>
                  <tr>
                    <th>{t("biometric.plateNumber")}</th>
                    <th>{t("case.tab.persons")}</th>
                    <th>{t("evidence.location")}</th>
                    <th>{t("evidence.status")}</th>
                    <th>{t("biometric.col.when")}</th>
                  </tr>
                </thead>
                <tbody>
                  {biometric.plates.map((p) => {
                    const st2 = labelOf(LPR_STATUS, p.status, locale);
                    return (
                      <tr key={p.id}>
                        <td data-label={t("biometric.plateNumber")} className="font-mono font-semibold">
                          {p.plateNumber}
                          {p.vehicleMake ? (
                            <span className="block font-sans text-xs font-normal text-slate">
                              {p.vehicleMake} {p.vehicleModel} {p.vehicleColor ? `· ${p.vehicleColor}` : ""}
                            </span>
                          ) : null}
                        </td>
                        <td data-label={t("case.tab.persons")} className="text-xs">
                          {p.person ? (
                            <Link href={`/persons/${p.person.id}`} className="text-blue hover:underline">
                              {p.person.firstName} {p.person.lastName}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td data-label={t("evidence.location")} className="text-xs">
                          {p.locationText ?? "—"}
                          {p.cameraId ? <span className="block text-slate">{p.cameraId}</span> : null}
                        </td>
                        <td data-label={t("evidence.status")}>
                          <Badge tone={st2.tone}>{st2.label}</Badge>
                        </td>
                        <td data-label={t("biometric.col.when")} className="text-xs">
                          {fmtDateTime(p.detectedAt, locale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "tasks" ? (
        <Card title={t("case.tasks")} padded={false}>
          {tasks.length === 0 ? (
            <div className="p-5">
              <EmptyState>{t("case.noTasks")}</EmptyState>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t("case.taskTitle")}</th>
                  <th>{t("case.taskAssignee")}</th>
                  <th>{t("case.priority")}</th>
                  <th>{t("case.taskDue")}</th>
                  <th>{t("case.status")}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((x) => {
                  const ts = labelOf(TASK_STATUS, x.status, locale);
                  const pr2 = labelOf(PRIORITY, x.priority, locale);
                  const overdue = x.dueAt && x.dueAt < new Date() && x.status !== "DONE" && x.status !== "CANCELLED";
                  return (
                    <tr key={x.id}>
                      <td data-label={t("case.taskTitle")}>
                        <span className="font-semibold text-ink">{x.title}</span>
                        {x.description ? <span className="block text-xs text-slate">{x.description}</span> : null}
                        {x.result ? <span className="block text-xs text-success">{x.result}</span> : null}
                      </td>
                      <td data-label={t("case.taskAssignee")} className="text-xs">
                        {x.assignedTo ? `${x.assignedTo.firstName} ${x.assignedTo.lastName}` : "—"}
                      </td>
                      <td data-label={t("case.priority")}>
                        <Badge tone={pr2.tone}>{pr2.label}</Badge>
                      </td>
                      <td data-label={t("case.taskDue")} className="text-xs">
                        {fmtDateTime(x.dueAt, locale)}
                        {overdue ? <Badge tone="danger" className="ms-1">{t("tasks.overdue")}</Badge> : null}
                      </td>
                      <td data-label={t("case.status")}>
                        <Badge tone={ts.tone}>{ts.label}</Badge>
                        {canWrite && x.status !== "DONE" && x.status !== "CANCELLED" ? (
                          <div className="mt-1">
                            <TaskStatusForm taskId={x.id} current={x.status} />
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          {canWrite ? (
            <div className="border-t border-line p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy">{t("case.addTask")}</p>
              <TaskForm caseId={k.id} users={userOpts} />
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === "notes" ? (
        <Card title={t("case.notes")}>
          {notes.length === 0 ? (
            <EmptyState>{t("case.noNotes")}</EmptyState>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {notes.map((n) => (
                <li key={n.id} className="py-3">
                  <p className="whitespace-pre-wrap text-ink">{n.content}</p>
                  <p className="mt-1 text-xs text-slate">
                    {n.author.firstName} {n.author.lastName} · {fmtDateTime(n.createdAt, locale)}
                    {n.isConfidential ? <Badge tone="danger" className="ms-2">{t("common.required") === "requis" ? "confidentiel" : "confidential"}</Badge> : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {canWrite ? (
            <div className="mt-4 border-t border-line pt-4">
              <NoteForm caseId={k.id} />
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === "timeline" ? <Card title={t("case.timeline")}>{timeline.length === 0 ? <EmptyState>{t("case.noTimeline")}</EmptyState> : <Timeline items={timeline} locale={locale} t={t} />}</Card> : null}

      {tab === "audit" ? (
        <Card title={t("case.auditTrail")} padded={false}>
          {audit.length === 0 ? (
            <div className="p-5">
              <EmptyState>{t("audit.none")}</EmptyState>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t("audit.col.when")}</th>
                  <th>{t("audit.col.actor")}</th>
                  <th>{t("audit.col.action")}</th>
                  <th>{t("audit.col.summary")}</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td data-label={t("audit.col.when")} className="whitespace-nowrap text-xs">
                      {fmtDateTime(a.at, locale)}
                    </td>
                    <td data-label={t("audit.col.actor")} className="text-xs">
                      {a.actorLabel}
                    </td>
                    <td data-label={t("audit.col.action")} className="font-mono text-xs text-blue">
                      {a.action}
                    </td>
                    <td data-label={t("audit.col.summary")} className="text-xs">
                      {a.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : null}
    </div>
  );
}

function Timeline({ items, locale, t }: { items: { id: string; kind: string; title: string; description: string | null; occurredAt: Date; actor: { firstName: string; lastName: string } | null }[]; locale: "fr" | "en"; t: (k: "case.by") => string }) {
  return (
    <ol className="relative ms-2 border-s border-line ps-5 text-sm">
      {items.map((e) => (
        <li key={e.id} className="relative pb-4 last:pb-0">
          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue" aria-hidden />
          <p className="font-semibold text-ink">{e.title}</p>
          {e.description ? <p className="text-slate">{e.description}</p> : null}
          <p className="text-xs text-slate">
            {fmtDateTime(e.occurredAt, locale)}
            {e.actor ? ` · ${t("case.by")} ${e.actor.firstName} ${e.actor.lastName}` : ""} · <span className="font-mono">{e.kind}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

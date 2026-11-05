import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { careerHistory, getDossier, listCorps } from "@/server/hr/service";
import { listExceptions } from "@/server/hr/rotation";
import { leaveBalance, officerLeaves } from "@/server/hr/attendance";
import { officerCompetences } from "@/server/hr/training";
import { listDistinctions, officerDisciplineSummary } from "@/server/hr/discipline";
import { listDocuments } from "@/server/hr/documents";
import { listComponents, officerPay } from "@/server/hr/pay";
import { MANUAL_CAREER_EVENTS } from "@/server/hr/schemas";
import { getRequestContext } from "@/server/request-context";
import { listPositions } from "@/server/org/personnel";
import { orgReferences } from "@/server/org/queries";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, ButtonLink, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { ADMINISTRATIVE_STATUS, CAREER_EVENT_TYPE, PAY_APPROVAL, DISCIPLINE_STATUS, DISTINCTION_KIND, GENDER, HR_DOCUMENT_KIND, SANCTION_KIND, LEAVE_STATUS, LEAVE_TYPE, MARITAL_STATUS, RANK_CATEGORY, TRAINING_KIND, TRAINING_STATUS, labelOf } from "@/lib/labels";
import { fmtDate, toInputDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { CareerEventForm, DossierForm } from "../../hr-forms";
import { EndExceptionForm, ExceptionForm } from "../../rotation/rotation-forms";
import { DistinctionForm } from "../../discipline/discipline-forms";
import { ElementRequestForm, EndElementForm } from "../../pay/pay-forms";
import { fmtFcfa } from "@/lib/traffic-format";
import { IssueForOfficerForm, PhotoForm, UploadForm } from "../../documents/documents-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("hr.dossiers.title") };
}

export default async function DossierPage({ params }: PageProps<"/hr/dossiers/[id]">) {
  const actor = await requirePermission("hr:view");
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  let o;
  try {
    o = await getDossier(actor, id, await getRequestContext());
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const canManage = actor.permissions.has("hr:manage");
  const canCareer = actor.permissions.has("hr:career");
  const terminal = ["RETIRED", "CEASED", "DECEASED"].includes(o.administrativeStatus);
  const canDiscipline = actor.permissions.has("hr:discipline_view");
  const canPay = actor.permissions.has("hr:pay_view");
  const [history, corps, positions, refs, exceptions, leaves, balance, comp, distinctions, cases, docs] = await Promise.all([careerHistory(id), listCorps(), canCareer ? listPositions() : Promise.resolve([]), canCareer ? orgReferences(actor) : Promise.resolve(null), listExceptions(id), officerLeaves(actor, id), leaveBalance(id), officerCompetences(actor, id), listDistinctions(actor, id), canDiscipline ? officerDisciplineSummary(actor, id) : Promise.resolve([]), listDocuments(actor, { officerId: id, pageSize: 6 })]);
  const [pay, payComponents] = canPay ? await Promise.all([officerPay(actor, id, await getRequestContext()), listComponents(actor)]) : [null, []];
  const st = labelOf(ADMINISTRATIVE_STATUS, o.administrativeStatus, locale);
  const change = (e: (typeof history)[number]) => {
    if (e.toRank) return `${e.fromRank ?? "—"} → ${e.toRank}`;
    if (e.toPosition) return `${e.fromPosition ?? "—"} → ${e.toPosition}`;
    if (e.toStation) return `${e.fromStation ?? "—"} → ${e.toStation}`;
    if (e.toStatus) return `${labelOf(ADMINISTRATIVE_STATUS, e.fromStatus, locale).label} → ${labelOf(ADMINISTRATIVE_STATUS, e.toStatus, locale).label}`;
    return "—";
  };
  return (
    <div>
      <PageHeader
        eyebrow={t("hr.section")}
        title={`${o.rank.name} ${o.firstName} ${o.lastName}`}
        subtitle={`${o.badgeNumber} · ${o.station.name} · ${o.station.region.name}`}
        breadcrumbs={[{ href: "/hr/dossiers", label: t("hr.dossiers.title") }, { label: o.badgeNumber }]}
        actions={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            {actor.permissions.has("hr:transfer_propose") && !terminal ? (
              <ButtonLink href={`/hr/transfers/new?officerId=${o.id}`} size="sm">
                {t("hr.transfers.proposeFor")}
              </ButtonLink>
            ) : null}
            {actor.permissions.has("officers:view") ? (
              <ButtonLink href={`/officers/${o.id}`} variant="secondary" size="sm">
                {t("hr.dossier.openOfficer")}
              </ButtonLink>
            ) : null}
          </>
        }
      />
      <Alert tone="info" className="mb-4">
        {t("hr.dossier.viewAudited")}
      </Alert>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("hr.dossier.identity")}>
            {canManage ? (
              <DossierForm
                corps={corps.map((c) => ({ value: c.id, label: c.name }))}
                values={{
                  officerId: o.id,
                  firstName: o.firstName,
                  lastName: o.lastName,
                  gender: o.gender,
                  dateOfBirth: toInputDate(o.dateOfBirth),
                  birthPlace: o.birthPlace ?? "",
                  maritalStatus: o.maritalStatus ?? "",
                  phone: o.phone ?? "",
                  email: o.email ?? "",
                  corpsId: o.corpsId ?? "",
                  hiredAt: toInputDate(o.hiredAt),
                  serviceStartDate: toInputDate(o.serviceStartDate),
                  specialties: o.specialties ?? "",
                  notes: o.notes ?? "",
                }}
              />
            ) : (
              <DL
                items={[
                  { label: t("hr.dossier.gender"), value: labelOf(GENDER, o.gender, locale).label },
                  { label: t("hr.dossier.dateOfBirth"), value: fmtDate(o.dateOfBirth, locale) },
                  { label: t("hr.dossier.birthPlace"), value: o.birthPlace ?? "—" },
                  { label: t("hr.dossier.maritalStatus"), value: o.maritalStatus ? labelOf(MARITAL_STATUS, o.maritalStatus, locale).label : "—" },
                  { label: t("hr.dossier.corps"), value: o.corps?.name ?? "—" },
                  { label: t("hr.dossier.hiredAt"), value: fmtDate(o.hiredAt, locale) },
                  { label: t("hr.dossier.serviceStart"), value: fmtDate(o.serviceStartDate, locale) },
                ]}
              />
            )}
            <div className="mt-4 flex items-center gap-4 border-t border-line pt-3">
              {o.photoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/v1/hr/dossiers/${o.id}/photo`} alt={`${o.firstName} ${o.lastName}`} className="h-24 w-20 rounded border border-line object-cover" />
              ) : (
                <div className="flex h-24 w-20 items-center justify-center rounded border border-dashed border-line text-xs text-slate">{t("hr.doc.noPhoto")}</div>
              )}
              {canManage ? <PhotoForm officerId={o.id} /> : null}
            </div>
          </Card>
          <Card title={t("hr.dis.distinctions")}>
            {distinctions.length === 0 ? (
              <p className="text-sm text-slate">{t("hr.dis.noDistinctions")}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {distinctions.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2">
                    <Badge tone={labelOf(DISTINCTION_KIND, d.kind, locale).tone}>{labelOf(DISTINCTION_KIND, d.kind, locale).label}</Badge>
                    <span className="font-semibold">{d.title}</span>
                    <span className="text-xs text-slate">{fmtDate(d.awardedAt, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
            {canManage ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-blue">{t("hr.dis.addDistinction")}</summary>
                <div className="mt-2">
                  <DistinctionForm officerId={o.id} />
                </div>
              </details>
            ) : null}
          </Card>
          <Card title={t("hr.doc.title2")}>
            {docs.items.length === 0 ? (
              <p className="text-sm text-slate">{t("hr.doc.none")}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {docs.items.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{d.number}</span>
                    <span>{d.title}</span>
                    <Badge tone={labelOf(HR_DOCUMENT_KIND, d.kind, locale).tone}>{labelOf(HR_DOCUMENT_KIND, d.kind, locale).label}</Badge>
                    <span className="ms-auto space-x-2 text-xs">
                      {d.source === "GENERATED" ? (
                        <>
                          <a href={`/api/v1/hr/documents/${d.id}/file?format=pdf`} className="text-blue hover:underline">PDF</a>
                          <a href={`/api/v1/hr/documents/${d.id}/file?format=docx`} className="text-blue hover:underline">Word</a>
                        </>
                      ) : (
                        <a href={`/api/v1/hr/documents/${d.id}/file`} className="text-blue hover:underline">{t("hr.doc.download")}</a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {actor.permissions.has("hr:document_issue") ? (
              <div className="mt-3 space-y-3 border-t border-line pt-3">
                <div className="flex flex-wrap gap-2">
                  <IssueForOfficerForm officerId={o.id} kind="WORK_CERTIFICATE" />
                  <IssueForOfficerForm officerId={o.id} kind="ASSIGNMENT_DECISION" />
                </div>
                <details>
                  <summary className="cursor-pointer text-xs font-semibold text-blue">{t("hr.doc.upload")}</summary>
                  <div className="mt-2">
                    <UploadForm officerId={o.id} canDiscipline={actor.permissions.has("hr:discipline_manage")} />
                  </div>
                </details>
              </div>
            ) : null}
          </Card>
          {canDiscipline ? (
            <Card title={t("hr.dis.title")}>
              {cases.length === 0 ? (
                <p className="text-sm text-slate">{t("hr.dis.none")}</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {cases.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-2">
                      <Link href={`/hr/discipline/${c.id}`} className="font-mono text-xs text-blue hover:underline">
                        {c.number}
                      </Link>
                      <Badge tone={labelOf(DISCIPLINE_STATUS, c.status, locale).tone}>{labelOf(DISCIPLINE_STATUS, c.status, locale).label}</Badge>
                      {c.sanction ? <span className="text-xs">{labelOf(SANCTION_KIND, c.sanction, locale).label}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
              {actor.permissions.has("hr:discipline_manage") ? (
                <div className="mt-3">
                  <ButtonLink href={`/hr/discipline/new?officerId=${o.id}`} size="sm" variant="secondary">
                    {t("hr.dis.new")}
                  </ButtonLink>
                </div>
              ) : null}
            </Card>
          ) : null}
          {canPay && pay ? (
            <Card title={t("hr.pay.dossierTitle")}>
              <p className="mb-2 text-sm">
                {t("hr.pay.monthlyBase")} : <span className="font-mono font-semibold">{pay.baseSalary !== null ? fmtFcfa(pay.baseSalary) : "—"}</span>
              </p>
              {pay.elements.length === 0 ? (
                <p className="text-sm text-slate">{t("hr.pay.noElements")}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {pay.elements.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center gap-2">
                      <Badge tone={labelOf(PAY_APPROVAL, e.status, locale).tone}>{labelOf(PAY_APPROVAL, e.status, locale).label}</Badge>
                      <span>{e.component.name}</span>
                      <span className="font-mono text-xs text-slate">{e.component.calculation === "FIXED" ? fmtFcfa(e.value ?? e.component.defaultValue) : `${e.value ?? e.component.defaultValue} %`}</span>
                      <span className="text-xs text-slate">
                        {fmtDate(e.startDate, locale)} → {e.endDate ? fmtDate(e.endDate, locale) : "∞"}
                      </span>
                      {e.status === "ACTIVE" && !e.endDate && actor.permissions.has("hr:pay_manage") ? <EndElementForm id={e.id} /> : null}
                    </li>
                  ))}
                </ul>
              )}
              {pay.lines.length ? (
                <p className="mt-3 text-xs text-slate">
                  {t("hr.pay.lastLine", { p: pay.lines[0].run.period, n: fmtFcfa(pay.lines[0].net) })}
                </p>
              ) : null}
              {actor.permissions.has("hr:pay_manage") ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-blue">{t("hr.pay.requestElement")}</summary>
                  <div className="mt-2">
                    <ElementRequestForm officerId={o.id} components={payComponents.map((c) => ({ value: c.id, label: c.name, calc: c.calculation, def: c.defaultValue }))} />
                  </div>
                </details>
              ) : null}
            </Card>
          ) : null}
          <Card title={t("hr.tr.dossierTitle")} padded={false}>
            {comp.trainings.length === 0 && comp.skills.length === 0 ? (
              <div className="p-5">
                <EmptyState>{t("training.none")}</EmptyState>
              </div>
            ) : (
              <div className="space-y-3 p-4 text-sm">
                {comp.skills.length ? (
                  <div className="flex flex-wrap gap-2">
                    {comp.skills.map((k) => (
                      <Badge key={k.id} tone={k.expiresAt && k.expiresAt < new Date() ? "danger" : "success"} title={k.expiresAt ? fmtDate(k.expiresAt, locale) : undefined}>
                        {k.skill.name} · {k.level}/5
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <ul className="divide-y divide-line">
                  {comp.trainings.map((x) => (
                    <li key={x.id} className="flex flex-wrap items-center gap-2 py-1.5">
                      <Badge tone={labelOf(TRAINING_STATUS, x.status, locale).tone}>{labelOf(TRAINING_STATUS, x.status, locale).label}</Badge>
                      <span className="font-semibold">{x.title}</span>
                      <span className="text-xs text-slate">
                        {labelOf(TRAINING_KIND, x.kind, locale).label} · {fmtDate(x.startDate, locale)}
                        {x.score != null ? ` · ${x.score}/20` : ""}
                      </span>
                      {x.certificateIssuedAt ? (
                        <a href={`/api/v1/hr/trainings/${x.id}/certificate`} className="ms-auto font-mono text-xs text-blue hover:underline">
                          {x.certificateNo}
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          <Card title={t("hr.career.title")} padded={false}>
            {history.length === 0 ? (
              <div className="p-5">
                <EmptyState>{t("hr.career.none")}</EmptyState>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>{t("hr.career.col.date")}</th>
                    <th>{t("hr.career.col.type")}</th>
                    <th>{t("hr.career.col.change")}</th>
                    <th>{t("hr.career.col.ref")}</th>
                    <th>{t("hr.career.col.by")}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((e) => {
                    const l = labelOf(CAREER_EVENT_TYPE, e.type, locale);
                    return (
                      <tr key={e.id}>
                        <td data-label={t("hr.career.col.date")} className="text-xs">
                          {fmtDate(e.effectiveDate, locale)}
                        </td>
                        <td data-label={t("hr.career.col.type")}>
                          <Badge tone={l.tone}>{l.label}</Badge>
                        </td>
                        <td data-label={t("hr.career.col.change")} className="text-xs">
                          {change(e)}
                          {e.reason ? <span className="block text-slate">{e.reason}</span> : null}
                        </td>
                        <td data-label={t("hr.career.col.ref")} className="font-mono text-xs">
                          {e.reference}
                        </td>
                        <td data-label={t("hr.career.col.by")} className="text-xs">
                          {e.recordedBy?.username ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title={t("hr.dossier.status")}>
            <DL
              cols={1}
              items={[
                { label: t("hr.dossier.status"), value: <Badge tone={st.tone}>{st.label}</Badge> },
                { label: t("hr.col.rank"), value: o.rank.name },
                { label: t("hr.dossier.category"), value: labelOf(RANK_CATEGORY, o.rank.category, locale).label },
                { label: t("hr.col.function"), value: o.position?.name ?? "—" },
                { label: t("hr.col.posting"), value: o.station.name },
                { label: t("hr.dossier.currentPostSince"), value: fmtDate(o.currentPostSince, locale) },
              ]}
            />
          </Card>
          <Card title={t("hr.leave.title")}>
            <p className="mb-2 text-sm text-slate">{t("hr.leave.balance", { y: balance.year, r: balance.remaining, e: balance.entitlement })}</p>
            {leaves.length === 0 ? (
              <p className="text-sm text-slate">{t("hr.leave.none")}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {leaves.slice(0, 6).map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-2">
                    <Badge tone={labelOf(LEAVE_STATUS, l.status, locale).tone}>{labelOf(LEAVE_STATUS, l.status, locale).label}</Badge>
                    <span>{labelOf(LEAVE_TYPE, l.type, locale).label}</span>
                    <span className="text-xs text-slate">
                      {fmtDate(l.startDate, locale)} → {fmtDate(l.endDate, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {actor.permissions.has("hr:leave_request") ? (
              <div className="mt-3">
                <ButtonLink href={`/hr/leaves/new?officerId=${o.id}`} size="sm" variant="secondary">
                  {t("hr.leave.new")}
                </ButtonLink>
              </div>
            ) : null}
          </Card>
          <Card title={t("hr.rot.exc.title")}>
            {exceptions.length === 0 ? <p className="text-sm text-slate">{t("hr.rot.exc.none")}</p> : (
              <ul className="space-y-2 text-sm">
                {exceptions.map((x) => {
                  const live = !x.endedAt && (!x.endsAt || x.endsAt > new Date());
                  return (
                    <li key={x.id} className="flex flex-wrap items-center gap-2">
                      <Badge tone={live ? "info" : "neutral"}>{live ? t("hr.rot.exc.active") : t("hr.rot.exc.ended")}</Badge>
                      <span>{x.reason}</span>
                      <span className="text-xs text-slate">{fmtDate(x.startsAt, locale)}{x.endsAt ? ` → ${fmtDate(x.endsAt, locale)}` : ""}</span>
                      {live && canManage ? <EndExceptionForm id={x.id} /> : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {canManage ? (
              <div className="mt-3 border-t border-line pt-3">
                <ExceptionForm officerId={o.id} />
                <p className="mt-2 text-xs text-slate">{t("hr.rot.exc.hint")}</p>
              </div>
            ) : null}
          </Card>
          {canCareer ? (
            <Card title={t("hr.career.record")}>
              {terminal ? (
                <Alert tone="warning">{t("hr.career.terminal")}</Alert>
              ) : (
                <>
                  <CareerEventForm officerId={o.id} types={[...MANUAL_CAREER_EVENTS]} ranks={(refs?.ranks ?? []).map((r) => ({ value: r.id, label: r.name }))} positions={positions.filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name }))} />
                  <p className="mt-3 text-xs text-slate">{t("hr.career.transferNote")}</p>
                </>
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

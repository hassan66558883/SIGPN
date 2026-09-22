import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getEvidence } from "@/server/evidence/service";
import { stationStorageLocations } from "@/server/evidence/queries";
import { NotFoundError } from "@/server/errors";
import { Badge, Card, DL, EmptyState, PageHeader, Table } from "@/components/ui";
import { CUSTODY_ACTION, EVIDENCE_CATEGORY, EVIDENCE_STATUS, labelOf } from "@/lib/labels";
import { fmtBytes, fmtDate, fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { AttachFileForm, CustodyTransferForm } from "../evidence-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("evidence.detail") };
}

export default async function EvidenceDetailPage({ params, searchParams }: PageProps<"/evidence/[id]">) {
  const actor = await requirePermission("evidence:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let e;
  try {
    e = await getEvidence(actor, id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const locations = actor.permissions.has("evidence:transfer") ? await stationStorageLocations(actor.stationId ? [actor.stationId] : []) : [];
  const st = labelOf(EVIDENCE_STATUS, e.status, locale);
  const cat = labelOf(EVIDENCE_CATEGORY, e.category, locale);
  const canTransfer = actor.permissions.has("evidence:transfer") && e.status !== "DESTROYED" && e.status !== "ARCHIVED";
  const canAttach = actor.permissions.has("evidence:update");
  return (
    <div>
      <PageHeader
        eyebrow={t("evidence.eyebrow")}
        title={e.number}
        subtitle={`${e.case.number} · ${e.case.station.name} · ${fmtDate(e.createdAt, locale)}`}
        breadcrumbs={[{ href: "/evidence", label: t("evidence.title") }, { label: e.number }]}
        actions={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            <Badge tone={cat.tone}>{cat.label}</Badge>
            {e.isSensitive ? <Badge tone="danger">{t("case.sensitive")}</Badge> : null}
          </>
        }
      />
      {sp.created === "1" ? <div className="mb-4 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{t("evidence.createdAlert", { number: e.number })}</div> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("evidence.details")}>
            <DL
              items={[
                { label: t("evidence.case"), value: <Link href={`/cases/${e.case.id}`} className="text-blue hover:underline">{e.case.number} — {e.case.title}</Link> },
                { label: t("evidence.description"), value: e.description },
                { label: t("evidence.sealNumber"), value: e.sealNumber ?? "—" },
                { label: t("evidence.quantity"), value: e.quantity ? `${e.quantity} ${e.unit ?? ""}` : "—" },
                { label: t("evidence.collectedAt"), value: fmtDateTime(e.collectedAt, locale) },
                { label: t("evidence.collectedBy"), value: `${e.collectedBy.firstName} ${e.collectedBy.lastName}` },
                { label: t("evidence.collectedFrom"), value: e.collectedFrom ?? "—" },
                { label: t("evidence.collectedFromPerson"), value: e.collectedFromPerson ? <Link href={`/persons/${e.collectedFromPerson.id}`} className="text-blue hover:underline">{e.collectedFromPerson.firstName} {e.collectedFromPerson.lastName}</Link> : "—" },
                { label: t("evidence.condition"), value: e.condition ?? "—" },
                { label: t("evidence.currentCustodian"), value: e.currentCustodian ? `${e.currentCustodian.firstName} ${e.currentCustodian.lastName}` : "—" },
                { label: t("evidence.location"), value: e.currentLocation?.name ?? "—" },
                { label: t("evidence.notes"), value: e.notes ?? "—" },
              ]}
              cols={2}
            />
          </Card>
          <Card title={t("evidence.custodyChain")} description={t("evidence.custodyChainHint")}>
            {e.custody.length === 0 ? (
              <EmptyState>{t("evidence.noCustody")}</EmptyState>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("evidence.col.custodyAction")}</th>
                    <th>{t("evidence.col.custodyFromTo")}</th>
                    <th>{t("evidence.col.custodyReason")}</th>
                    <th>{t("evidence.col.custodyWhen")}</th>
                  </tr>
                </thead>
                <tbody>
                  {e.custody.map((ce) => {
                    const a = labelOf(CUSTODY_ACTION, ce.action, locale);
                    return (
                      <tr key={ce.id}>
                        <td data-label="#">{ce.seq}</td>
                        <td data-label={t("evidence.col.custodyAction")}>
                          <Badge tone={a.tone}>{a.label}</Badge>
                        </td>
                        <td data-label={t("evidence.col.custodyFromTo")} className="text-xs">
                          {ce.fromUser ? `${ce.fromUser.firstName} ${ce.fromUser.lastName}` : ce.fromLocation?.name ?? "—"} → {ce.toUser ? `${ce.toUser.firstName} ${ce.toUser.lastName}` : ce.toLocation?.name ?? "—"}
                        </td>
                        <td data-label={t("evidence.col.custodyReason")} className="text-xs">
                          {ce.reason}
                        </td>
                        <td data-label={t("evidence.col.custodyWhen")} className="text-xs">
                          {fmtDateTime(ce.occurredAt, locale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
          <Card title={t("evidence.files")}>
            {e.documents.length === 0 ? (
              <EmptyState>{t("evidence.noFiles")}</EmptyState>
            ) : (
              <ul className="space-y-2 text-sm">
                {e.documents.map((d) => {
                  const v = d.versions[0];
                  return (
                    <li key={d.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                      <span>
                        {v?.fileName ?? d.title}
                        {v ? <span className="ml-2 text-xs text-slate">{fmtBytes(v.sizeBytes)} · sha256 {v.sha256.slice(0, 12)}…</span> : null}
                      </span>
                      <a href={`/api/v1/documents/${d.id}/download`} className="text-xs font-semibold text-blue hover:underline">
                        {t("common.download")}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
            {canAttach ? (
              <div className="mt-4 border-t border-line pt-4">
                <AttachFileForm evidenceId={e.id} />
              </div>
            ) : null}
          </Card>
        </div>
        <div className="space-y-4">
          {canTransfer ? (
            <Card title={t("evidence.transferCustody")}>
              <CustodyTransferForm evidenceId={e.id} locations={locations.map((l) => ({ id: l.id, label: `${l.code} · ${l.name}` }))} />
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

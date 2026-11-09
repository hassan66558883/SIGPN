import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getWarrant } from "@/server/warrants/service";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, PageHeader } from "@/components/ui";
import { WARRANT_STATUS, WARRANT_TYPE, labelOf } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { DecisionForm } from "../warrant-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("warrants.title") };
}

export default async function WarrantDetailPage({ params, searchParams }: PageProps<"/warrants/[id]">) {
  const actor = await requirePermission("warrants:view");
  const [{ id }, sp, t, locale] = await Promise.all([params, searchParams, getT(), getLocale()]);
  let w;
  try {
    w = await getWarrant(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const st = labelOf(WARRANT_STATUS, w.status, locale);
  const ty = labelOf(WARRANT_TYPE, w.type, locale);
  const own = w.requestedBy.id === actor.id;
  const pending = w.status === "DRAFT" || w.status === "PENDING_APPROVAL";
  const allowed: ("ACTIVE" | "REJECTED" | "EXECUTED" | "CANCELLED")[] = [];
  if (pending && actor.permissions.has("warrants:approve") && !own) allowed.push("ACTIVE", "REJECTED");
  if (w.status === "ACTIVE" && actor.permissions.has("warrants:execute")) allowed.push("EXECUTED");
  if ((pending || w.status === "ACTIVE") && actor.permissions.has("warrants:cancel")) allowed.push("CANCELLED");
  const name = (u: { firstName: string; lastName: string } | null) => (u ? `${u.firstName} ${u.lastName}` : "—");
  const showDecision = allowed.length > 0 || (pending && own && actor.permissions.has("warrants:approve"));
  return (
    <div>
      <PageHeader
        eyebrow={t("warrants.eyebrow")}
        title={w.number}
        breadcrumbs={[{ href: "/warrants", label: t("warrants.title") }, { label: w.number }]}
        actions={<><Badge tone={st.tone}>{st.label}</Badge><Badge tone={ty.tone}>{ty.label}</Badge></>}
      />
      {sp.created === "1" ? <Alert tone="success" className="mb-4">{t("warrants.created", { number: w.number })}</Alert> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t("warrants.title")} className="lg:col-span-2">
          <DL
            items={[
              { label: t("warrants.person"), value: w.person ? <Link href={`/persons/${w.person.id}`} className="text-blue hover:underline">{w.person.number} · {w.person.lastName} {w.person.firstName}</Link> : "—" },
              { label: t("warrants.case"), value: w.case ? <Link href={`/cases/${w.case.id}`} className="text-blue hover:underline">{w.case.number} — {w.case.title}</Link> : t("warrants.noCase") },
              { label: t("warrants.authority"), value: `${w.issuingAuthority}${w.issuingAuthorityRef ? ` (${w.issuingAuthorityRef})` : ""}` },
              { label: t("warrants.grounds"), value: w.grounds },
              { label: t("warrants.address"), value: w.targetAddress ?? "—" },
              { label: t("warrants.expiresAt"), value: w.expiresAt ? fmtDateTime(w.expiresAt, locale) : "—" },
              { label: t("warrants.requestedBy"), value: name(w.requestedBy) },
              { label: t("warrants.approvedBy"), value: w.approvedAt ? `${name(w.approvedBy)} · ${fmtDateTime(w.approvedAt, locale)}` : "—" },
              { label: t("warrants.executedBy"), value: w.executedAt ? `${name(w.executedBy)} · ${fmtDateTime(w.executedAt, locale)}` : "—" },
            ]}
          />
        </Card>
        {showDecision ? (
          <Card title={t("warrants.decision")}>
            {pending && own ? <Alert tone="info" className="mb-3">{t("warrants.fourEyes")}</Alert> : null}
            {allowed.length > 0 ? <DecisionForm warrantId={w.id} allowed={allowed} /> : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}

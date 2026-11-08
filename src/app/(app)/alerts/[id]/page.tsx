import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getInboxAlert, markRead } from "@/server/alerts/service";
import { NotFoundError } from "@/server/errors";
import { Alert, Badge, Card, DL, PageHeader } from "@/components/ui";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { getRequestContext } from "@/server/request-context";
import { DANGER_LEVEL, WANTED_KIND, labelOf } from "@/lib/labels";
import type { MessageKey } from "@/lib/i18n";
import { ReceiptButtons } from "../alerts-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("alerts.title") };
}

type Payload = {
  number?: string;
  nature?: string;
  person?: { name?: string; aliases?: string[]; dateOfBirth?: string | null; physicalDescription?: string | null; distinguishingMarks?: string | null };
  offense?: string;
  issuingAuthority?: string | null;
  unit?: string;
  instruction?: string;
  caution?: string;
};

export default async function AlertPage({ params }: PageProps<"/alerts/[id]">) {
  const actor = await requirePermission("alerts:view");
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  let d;
  try {
    // Opening the alert is the read receipt.
    await markRead(actor, id, await getRequestContext());
    d = await getInboxAlert(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const a = d.alert;
  const p = a.payload as Payload;
  const dl = labelOf(DANGER_LEVEL, a.priority, locale);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={t("alerts.eyebrow")} title={p.person?.name ?? a.title} subtitle={`${a.number} · ${fmtDateTime(a.createdAt, locale)}`} breadcrumbs={[{ href: "/alerts", label: t("alerts.title") }, { label: a.number }]} actions={<><Badge tone={dl.tone}>{dl.label}</Badge><Badge tone="info">{t(`alerts.kind.${a.kind}` as MessageKey)}</Badge></>} />
      {a.isSimulation ? <Alert tone="warning" className="mb-4">{t("alerts.simulation")} — {p.caution}</Alert> : null}
      <Alert tone="warning" className="mb-4">{p.instruction ?? t("alerts.subtitle")}</Alert>
      <Card title={t("alerts.person")}>
        <DL
          cols={2}
          items={[
            { label: t("alerts.person"), value: p.person?.name ?? "—" },
            { label: t("alerts.aliases"), value: p.person?.aliases?.join(", ") || "—" },
            { label: t("alerts.dob"), value: p.person?.dateOfBirth ? fmtDate(p.person.dateOfBirth, locale) : "—" },
            { label: t("alerts.nature"), value: p.nature ? labelOf(WANTED_KIND, p.nature, locale).label : "—" },
            { label: t("alerts.offense"), value: p.offense ?? "—" },
            { label: t("alerts.authority"), value: p.issuingAuthority ?? "—" },
            { label: t("alerts.description"), value: [p.person?.physicalDescription, p.person?.distinguishingMarks].filter(Boolean).join(" — ") || "—" },
            { label: t("alerts.unit"), value: p.unit ?? "—" },
          ]}
        />
      </Card>
      <div className="mt-4 flex items-center justify-between">
        <Link href="/alerts" className="text-sm font-semibold text-blue hover:underline">← {t("alerts.back")}</Link>
        <ReceiptButtons id={a.id} status={d.status === "DELIVERED" || d.status === "PENDING" ? "READ" : d.status} canAck={actor.permissions.has("alerts:ack")} />
      </div>
    </div>
  );
}

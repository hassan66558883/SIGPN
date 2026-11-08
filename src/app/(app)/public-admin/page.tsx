import type { Metadata } from "next";
import Link from "next/link";
import { canAny, requireActor } from "@/server/auth/dal";
import { forbidden } from "next/navigation";
import { listNewsAdmin, listStationsAdmin, listSubmissions } from "@/server/public/admin";
import { Badge, Card, EmptyState, PageHeader, Table, Tabs } from "@/components/ui";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import type { MessageKey } from "@/lib/i18n";
import type { Tone } from "@/lib/labels";
import { NewsForm, NewsToggle, StationPublicForm } from "./public-admin-forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("pa.title") };
}

const STATUS_TONE: Record<string, Tone> = { RECEIVED: "danger", IN_REVIEW: "warning", FORWARDED: "info", CLOSED: "success", REJECTED: "neutral" };

export default async function PublicAdminPage({ searchParams }: PageProps<"/public-admin">) {
  const actor = await requireActor();
  const canIntake = actor.permissions.has("intake:view");
  const canContent = actor.permissions.has("public:content");
  if (!canIntake && !canContent && !canAny(actor, ["intake:manage"])) forbidden();
  const [sp, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const tabs = [...(canIntake ? ["submissions"] : []), ...(canContent ? ["news", "directory"] : [])] as const;
  const tab = tabs.find((x) => x === sp.tab) ?? tabs[0];
  return (
    <div>
      <PageHeader eyebrow={t("nav.publicAdmin")} title={t("pa.title")} subtitle={t("pa.subtitle")} />
      <Tabs current={`/public-admin?tab=${tab}`} items={tabs.map((x) => ({ href: `/public-admin?tab=${x}`, label: t(`pa.tab.${x}` as MessageKey) }))} />
      {tab === "submissions" ? <Submissions actorId={actor.id} /> : null}
      {tab === "news" ? <News /> : null}
      {tab === "directory" ? <Directory /> : null}
    </div>
  );

  async function Submissions({ actorId: _ }: { actorId: string }) {
    const r = await listSubmissions(actor, { status: undefined });
    return (
      <Card padded={false}>
        {r.items.length === 0 ? <div className="p-5"><EmptyState>{t("pa.none")}</EmptyState></div> : (
          <Table className="responsive-table">
            <thead><tr><th>{t("pa.col.reference")}</th><th>{t("pa.col.kind")}</th><th>{t("pa.col.subject")}</th><th>{t("pa.col.status")}</th><th>{t("pa.col.received")}</th></tr></thead>
            <tbody>
              {r.items.map((s) => (
                <tr key={s.id}>
                  <td data-label={t("pa.col.reference")}><Link href={`/public-admin/submissions/${s.id}`} className="font-mono font-semibold text-ink hover:underline">{s.number}</Link></td>
                  <td data-label={t("pa.col.kind")}>{t(`pub.kind.${s.kind}` as MessageKey)}{s.anonymous ? " · " + t("pa.anonymous") : ""}</td>
                  <td data-label={t("pa.col.subject")} className="text-sm">{s.subject}</td>
                  <td data-label={t("pa.col.status")}><Badge tone={STATUS_TONE[s.status] ?? "neutral"}>{t(`pub.status.${s.status}` as MessageKey)}</Badge></td>
                  <td data-label={t("pa.col.received")} className="text-xs">{fmtDateTime(s.receivedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    );
  }

  async function News() {
    const items = await listNewsAdmin(actor);
    return (
      <div className="space-y-4">
        <Card title={t("pa.news.new")}><NewsForm /></Card>
        {items.map((n) => (
          <Card key={n.id} title={n.title} actions={<><Badge tone={n.status === "PUBLISHED" ? "success" : "neutral"}>{n.status === "PUBLISHED" ? t("pa.news.published") : t("pa.news.draft")}</Badge><NewsToggle id={n.id} published={n.status === "PUBLISHED"} /></>}>
            <NewsForm item={n} />
          </Card>
        ))}
      </div>
    );
  }

  async function Directory() {
    const stations = await listStationsAdmin(actor);
    return (
      <div className="space-y-4">
        {stations.map((s) => (
          <Card key={s.id} title={`${s.code} · ${s.name}`} description={s.region.name} actions={<Badge tone={s.publicVerifiedAt ? "success" : "warning"}>{s.publicVerifiedAt ? `${t("pa.dir.verifiedAt")} ${fmtDate(s.publicVerifiedAt, locale)}` : t("pa.dir.notVerified")}</Badge>}>
            <StationPublicForm s={{ id: s.id, publicVisible: s.publicVisible, publicAddress: s.publicAddress, publicPhone: s.publicPhone, publicHours: s.publicHours, verifiedAt: s.publicVerifiedAt?.toISOString() ?? null }} />
          </Card>
        ))}
      </div>
    );
  }
}

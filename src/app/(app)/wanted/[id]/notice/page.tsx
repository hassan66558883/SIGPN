import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/dal";
import { getWantedPerson } from "@/server/wanted/service";
import { NotFoundError } from "@/server/errors";
import { Badge, Card, PageHeader } from "@/components/ui";
import { DANGER_LEVEL, WANTED_STATUS, labelOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { getLocale, getT } from "@/server/i18n";
import { PrintButton } from "../../wanted-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("wanted.generateNotice") };
}

/** Public wanted notice: ONLY approved-for-disclosure fields — no investigative reason/grounds, no
 * warrant details, no sightings, no identifiers, no address/phone. */
export default async function WantedNoticePage({ params }: PageProps<"/wanted/[id]/notice">) {
  const actor = await requirePermission("wanted:publish");
  const [{ id }, t, locale] = await Promise.all([params, getT(), getLocale()]);
  let w;
  try {
    w = await getWantedPerson(actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const st = labelOf(WANTED_STATUS, w.status, locale);
  const dl = labelOf(DANGER_LEVEL, w.dangerLevel, locale);
  const mainPhotoUrl = w.mainPhoto?.versions[0] ? `/api/v1/documents/${w.mainPhoto.id}/download` : null;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow={t("wanted.eyebrow")} title={t("wanted.generateNotice")} breadcrumbs={[{ href: "/wanted", label: t("wanted.title") }, { href: `/wanted/${w.id}`, label: w.number }, { label: t("wanted.generateNotice") }]} />
      <div className="no-print mb-4">
        <PrintButton>{t("wanted.printNotice")}</PrintButton>
        <p className="mt-2 text-xs text-slate">{t("wanted.publicNoticeHint")}</p>
      </div>
      <Card className="border-2 border-navy text-center">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-danger">{t("wanted.publicNoticeTitle")}</p>
        <div className="mx-auto mb-4 h-48 w-36 overflow-hidden rounded-md border border-line bg-mist">
          {mainPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mainPhotoUrl} alt={`${w.person.firstName} ${w.person.lastName}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate">{t("wanted.noPhoto")}</div>
          )}
        </div>
        <h2 className="text-2xl font-bold text-navy">
          {w.person.lastName} {w.person.firstName}
        </h2>
        {w.person.aliases.length ? <p className="text-sm text-slate">« {w.person.aliases.map((a) => a.alias).join(" / ")} »</p> : null}
        <div className="my-3 flex justify-center gap-2">
          <Badge tone={st.tone}>{st.label}</Badge>
          <Badge tone={dl.tone}>{dl.label}</Badge>
        </div>
        <p className="mx-auto max-w-md text-sm text-ink">{w.offense}</p>
        <p className="mt-1 text-xs text-slate">{t("wanted.noticeIssued", { date: fmtDate(w.issuedAt, locale) })}</p>
        <div className="mx-auto mt-6 max-w-sm rounded-md bg-mist p-4 text-left text-sm">
          <p className="font-bold text-navy">{t("wanted.reportTitle")}</p>
          <p className="mt-1">{w.station.name}</p>
          <p className="text-slate">{t("wanted.reportHint")}</p>
        </div>
      </Card>
    </div>
  );
}

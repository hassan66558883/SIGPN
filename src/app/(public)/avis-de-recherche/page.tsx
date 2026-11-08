import type { Metadata } from "next";
import type { MessageKey } from "@/lib/i18n";
import { publicWanted } from "@/server/public/service";
import { getLocale, getT } from "@/server/i18n";
import { fmtDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("pub.wanted.title") };
}

export default async function PublicWantedPage() {
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), publicWanted()]);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">{t("pub.wanted.title")}</h1>
        <p className="mt-1 text-sm text-slate">{t("pub.wanted.lead")}</p>
        <p role="note" className="mt-3 rounded-md border border-warning bg-warning-soft px-3 py-2 text-sm font-semibold text-warning">{t("pub.wanted.warning")}</p>
      </header>
      {rows.length === 0 ? <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-slate">{t("pub.wanted.empty")}</p> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {rows.map((w) => (
            <li key={w.id} className="rounded-xl border border-line bg-card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-danger">{t(`pub.wanted.kind.${w.kind}` as MessageKey)}</p>
              <p className="mt-1 text-lg font-extrabold text-ink">{w.name}</p>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div><dt className="label inline">{t("pub.wanted.reference")} : </dt><dd className="inline font-mono text-ink">{w.reference}</dd></div>
                {w.aliases.length ? <div><dt className="label inline">{t("pub.wanted.aliases")} : </dt><dd className="inline text-ink">{w.aliases.join(", ")}</dd></div> : null}
                {w.approximateAge !== null ? <div><dt className="label inline">{t("pub.wanted.age")} : </dt><dd className="inline text-ink">{w.approximateAge}</dd></div> : null}
                {w.description ? <div><dt className="label inline">{t("pub.wanted.description")} : </dt><dd className="inline text-ink">{w.description}</dd></div> : null}
                <div><dt className="label inline">{t("pub.wanted.offense")} : </dt><dd className="inline text-ink">{w.offense}</dd></div>
              </dl>
              {w.notice ? <p className="mt-3 rounded-md border border-line p-3 text-sm text-ink">{w.notice}</p> : null}
              {w.contact ? <p className="mt-3 text-sm text-ink">{t("pub.wanted.contact")} : <strong>{w.contact.unit}</strong>{w.contact.phone ? ` — ☎ ${w.contact.phone}` : ""}</p> : null}
              <p className="mt-2 text-[11px] text-slate">{t("pub.wanted.published")} {fmtDate(w.publishedAt, locale)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

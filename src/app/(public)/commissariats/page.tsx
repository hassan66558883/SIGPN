import type { Metadata } from "next";
import { publicRegions, publicStations } from "@/server/public/service";
import { getLocale, getT } from "@/server/i18n";
import { fmtDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("pub.stations.title") };
}

export default async function StationsPage({ searchParams }: PageProps<"/commissariats">) {
  const [sp, t, locale] = await Promise.all([searchParams, getT(), getLocale()]);
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : undefined;
  const regionId = typeof sp.province === "string" ? sp.province.slice(0, 64) : undefined;
  const [stations, regions] = await Promise.all([publicStations({ q, regionId }), publicRegions()]);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">{t("pub.stations.title")}</h1>
        <p className="mt-1 text-sm text-slate">{t("pub.stations.lead")}</p>
      </header>
      <form method="get" className="flex flex-wrap items-end gap-3" role="search">
        <div>
          <label htmlFor="st-q" className="label">{t("pub.stations.search")}</label>
          <input id="st-q" name="q" defaultValue={q ?? ""} className="input" maxLength={80} />
        </div>
        <div>
          <label htmlFor="st-p" className="label">{t("pub.stations.province")}</label>
          <select id="st-p" name="province" defaultValue={regionId ?? ""} className="input">
            <option value="">{t("pub.stations.all")}</option>
            {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-gold px-4 py-2 text-sm font-bold text-navy">{t("pub.stations.search")}</button>
      </form>
      {stations.length === 0 ? <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-slate">{t("pub.stations.empty")}</p> : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {stations.map((s) => (
            <li key={s.id} className="rounded-xl border border-line bg-card p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gold">{s.region.name}</p>
              <p className="mt-1 text-base font-bold text-ink">{s.name}</p>
              {s.publicAddress ? <p className="text-sm text-slate">{s.publicAddress}</p> : null}
              {s.publicPhone ? <p className="mt-1 text-sm text-ink">☎ <a href={`tel:${s.publicPhone.replace(/\s+/g, "")}`} className="hover:underline">{s.publicPhone}</a></p> : null}
              {s.publicHours ? <p className="text-xs text-slate">{t("pub.stations.hours")} : {s.publicHours}</p> : null}
              <p className="mt-2 text-[11px] text-slate">✓ {t("pub.stations.verified")} · {fmtDate(s.publicVerifiedAt, locale)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

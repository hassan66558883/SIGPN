import Link from "next/link";
import { Alert, Badge } from "@/components/ui";
import { GENDER, WANTED_KIND, labelOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { SearchOutcome } from "@/server/wanted/search";
import type { SearchParams } from "@/server/wanted/search-criteria";
import { describeCriteria } from "@/server/wanted/search-criteria";
import { IconAlert, IconCheckCircle, IconDocSearch, IconEye, IconPin, IconPrinter, IconRefresh, IconTarget, IconUser } from "./icons";

type T = (key: never, vars?: Record<string, string | number>) => string;
const tt = (t: unknown) => t as (key: string, vars?: Record<string, string | number>) => string;

const STAMP = { SEARCH_WARRANT: "wsearch.stamp.wanted", HEARING: "wsearch.stamp.hearing", MISSING_PERSON: "wsearch.stamp.missing" } as const;
const STATUS_LINE = { SEARCH_WARRANT: "wsearch.status.wanted", HEARING: "wsearch.status.hearing", MISSING_PERSON: "wsearch.status.missing" } as const;
const SRC_LABEL = { NATIONAL_DB: "wsearch.src.db", WANTED: "wsearch.src.wanted", BORDERS: "wsearch.src.borders", VIDEO: "wsearch.src.video", INTEROP: "wsearch.src.interop" } as const;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 border-b border-line/60 py-1.5 text-sm last:border-0">
      <dt className="text-slate">{label} :</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}

/** The three outcomes of the mock-up (match found, no result) plus the one it does not show: a person who IS known but not wanted. */
export function SearchResults({ outcome, params, locale, t: tRaw, canPrint }: { outcome: SearchOutcome; params: SearchParams; locale: Locale; t: unknown; canPrint: boolean }) {
  const t = tt(tRaw);
  if (outcome.problem === "NO_SOURCE") return <Alert tone="warning">{t("wsearch.needSource")}</Alert>;
  if (outcome.problem === "NO_CRITERIA") return <Alert tone="warning">{t("wsearch.needCriteria")}</Alert>;
  if (outcome.state === "EMPTY") return <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-slate">{t("wsearch.hint")}</p>;

  const journal = (
    <section className="mt-4 rounded-xl border border-line bg-white p-4 text-sm shadow-sm" aria-label={t("wsearch.logTitle")}>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate">{t("wsearch.logTitle")}</h3>
      <ul className="space-y-1">
        {outcome.steps.map((s) => (
          <li key={s.source} className="flex flex-wrap justify-between gap-2">
            <span>✓ {t(SRC_LABEL[s.source])}</span>
            <span className="text-slate">{t("wsearch.logRow", { n: s.count, ms: s.ms })}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate">{t("wsearch.notQueried", { list: outcome.notQueried.map((k) => t(SRC_LABEL[k])).join(", ") })}</p>
    </section>
  );

  if (outcome.state === "MATCH") {
    return (
      <div>
        <section className="overflow-hidden rounded-xl border border-danger bg-white shadow-sm" role="status">
          <header className="flex items-center gap-3 bg-danger-soft px-4 py-3 text-danger">
            <IconTarget size={28} />
            <h2 className="text-lg font-extrabold uppercase tracking-wide">{t("wsearch.matchTitle")}</h2>
            <Badge tone="danger">{t("wsearch.matchCount", { n: outcome.matches.length })}</Badge>
          </header>
          <div className="divide-y divide-line">
            {outcome.matches.map((m) => {
              const gender = labelOf(GENDER, m.person.gender, locale).label;
              const kind = labelOf(WANTED_KIND, m.kind, locale).label;
              const stamp = t(STAMP[m.kind as keyof typeof STAMP] ?? STAMP.SEARCH_WARRANT);
              const idLabel = m.person.identifier ? (m.person.identifier.type === "NATIONAL_ID" ? t("wsearch.cni") : m.person.identifier.type) : null;
              return (
                <article key={m.noticeId} className="grid gap-4 p-4 sm:grid-cols-[11rem_1fr]">
                  <div className="relative h-56 overflow-hidden rounded-md bg-mist-2">
                    {m.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photoUrl} alt={`${m.person.firstName} ${m.person.lastName}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl font-bold text-slate" aria-hidden>
                        {(m.person.firstName[0] ?? "") + (m.person.lastName[0] ?? "")}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-danger px-2 py-1.5 text-center text-sm font-extrabold uppercase tracking-wide text-white">{stamp}</div>
                  </div>
                  <div>
                    <dl>
                      <Row label={t("wsearch.name")} value={`${m.person.firstName} ${m.person.lastName}`} />
                      <Row label={t("wsearch.dob")} value={m.person.dateOfBirth ? fmtDate(m.person.dateOfBirth, locale) : "—"} />
                      <Row label={t("wsearch.sex")} value={gender} />
                      {idLabel ? <Row label={idLabel} value={m.person.identifier!.value} /> : null}
                      <Row label={t("wsearch.status")} value={<Badge tone="danger">{t(STATUS_LINE[m.kind as keyof typeof STATUS_LINE] ?? STATUS_LINE.SEARCH_WARRANT)}</Badge>} />
                      <Row label={t("wsearch.offense")} value={m.offense} />
                      <Row label={t("wsearch.warrantDate")} value={m.warrant?.date ? fmtDate(m.warrant.date, locale) : "—"} />
                      <Row label={t("wsearch.notice")} value={`${m.number} · ${kind}`} />
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.dossierAccessible ? (
                        <Link href={`/wanted/${m.noticeId}`} className="inline-flex items-center gap-2 rounded-md bg-blue px-3 py-2 text-sm font-bold text-white hover:bg-blue-dark">
                          <IconEye size={16} />
                          {t("wsearch.viewFile")}
                        </Link>
                      ) : null}
                      <button type="button" disabled title={t("wsearch.videoOff")} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate opacity-60">
                        <IconPin size={16} />
                        {t("wsearch.locate")}
                      </button>
                      {canPrint && m.dossierAccessible ? (
                        <Link href={`/wanted/${m.noticeId}/notice`} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink hover:bg-mist-2">
                          <IconPrinter size={16} />
                          {t("wsearch.print")}
                        </Link>
                      ) : null}
                    </div>
                    {m.kind === "SEARCH_WARRANT" ? (
                      <Alert tone="danger" className="mt-3">
                        <span className="inline-flex items-start gap-2">
                          <IconAlert size={20} className="mt-0.5 shrink-0" />
                          <span>
                            <strong>{t("wsearch.procedure")}</strong> {t("wsearch.procedureText")}
                          </span>
                        </span>
                      </Alert>
                    ) : null}
                    <p className="mt-2 text-xs text-slate">
                      {t("wsearch.issuingUnit", { unit: `${m.station.name}${m.station.phone ? ` · ${m.station.phone}` : ""}` })}
                      {m.dossierAccessible ? "" : ` — ${t("wsearch.heldElsewhere")}`}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        {outcome.known.length ? <KnownList outcome={outcome} t={t} locale={locale} compact /> : null}
        {journal}
      </div>
    );
  }

  if (outcome.state === "KNOWN") {
    return (
      <div>
        <KnownList outcome={outcome} t={t} locale={locale} />
        {journal}
      </div>
    );
  }

  return (
    <div>
      <section className="overflow-hidden rounded-xl border border-success bg-white shadow-sm" role="status">
        <header className="flex items-center gap-3 bg-success-soft px-4 py-3 text-success">
          <IconCheckCircle size={28} />
          <h2 className="text-lg font-extrabold uppercase tracking-wide">{t("wsearch.noneTitle")}</h2>
        </header>
        <div className="p-6 text-center">
          <IconDocSearch size={72} className="mx-auto mb-3 text-slate/70" />
          <p className="text-lg font-bold text-ink">{t("wsearch.noneHead")}</p>
          <p className="mx-auto mt-1 max-w-xl text-sm text-slate">{t("wsearch.noneBody", { q: describeCriteria(params) })}</p>
          <Link href="/wanted" className="mt-4 inline-flex items-center gap-2 rounded-md border border-line px-5 py-2 text-sm font-semibold text-ink hover:bg-mist-2">
            <IconRefresh size={16} />
            {t("wsearch.newSearch")}
          </Link>
        </div>
      </section>
      {journal}
    </div>
  );
}

function KnownList({ outcome, t, locale, compact }: { outcome: SearchOutcome; t: (k: string, v?: Record<string, string | number>) => string; locale: Locale; compact?: boolean }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-info bg-white shadow-sm ${compact ? "mt-4" : ""}`} role="status">
      <header className="flex items-center gap-3 bg-info-soft px-4 py-3 text-info">
        <IconUser size={28} />
        <h2 className="text-lg font-extrabold uppercase tracking-wide">{t("wsearch.knownTitle")}</h2>
      </header>
      <div className="p-4">
        <p className="mb-3 text-sm text-slate">{t("wsearch.knownBody", { n: outcome.known.length })}</p>
        <ul className="divide-y divide-line">
          {outcome.known.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>
                <strong className="text-ink">
                  {k.lastName} {k.firstName}
                </strong>{" "}
                <span className="text-slate">
                  · {k.number}
                  {k.dateOfBirth ? ` · ${fmtDate(k.dateOfBirth, locale)}` : ""}
                  {k.city ? ` · ${k.city}` : ""}
                </span>
              </span>
              <Link href={`/persons/${k.id}`} className="font-semibold text-blue hover:underline">
                {t("wsearch.viewPerson")}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export type { T };

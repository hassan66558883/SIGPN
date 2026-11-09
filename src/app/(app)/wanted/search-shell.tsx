"use client";

import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { IconClock, IconInfo, IconSearch, IconUser } from "./icons";

export type SearchInit = { mode: "quick" | "advanced"; q: string; sources: string[]; firstName: string; lastName: string; dateOfBirth: string; gender: string; idNumber: string; alias: string; offense: string };
export type SourceInfo = { key: string; label: string; available: boolean; allowed: boolean };

const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `00:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`.replace(/^00:00:/, "00:00:");
};

/**
 * The search form of the "Personnes recherchées" screen: quick and advanced tabs, the sources, and a REAL pending panel
 * (the request is in flight: the elapsed time is measured, nothing is simulated). The server renders the result and hands it in as `children`.
 */
export function SearchShell({ init, sources, genders, children }: { init: SearchInit; sources: SourceInfo[]; genders: { value: string; label: string }[]; children: ReactNode }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"quick" | "advanced">(init.mode);
  const [elapsed, setElapsed] = useState(0);
  const [q, setQ] = useState(init.q);

  useEffect(() => {
    if (!pending) return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - t0), 200);
    return () => {
      clearInterval(id);
      setElapsed(0);
    };
  }, [pending]);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qs = new URLSearchParams({ go: "1", mode });
    for (const [k, v] of fd.entries()) if (typeof v === "string" && v.trim()) qs.append(k, v.trim());
    start(() => router.push(`/wanted?${qs.toString()}`));
  }

  const queried = sources.filter((s) => s.available && s.allowed).map((s) => s.label);
  return (
    <div>
      <section className="mb-5 rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex gap-2" role="tablist">
          {(["quick", "advanced"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`rounded-md px-4 py-2 text-sm font-bold ${mode === m ? "bg-blue text-white" : "bg-mist-2 text-ink hover:bg-line"}`}>
              {m === "quick" ? t("wsearch.quick") : t("wsearch.advanced")}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-4" aria-busy={pending}>
          {mode === "quick" ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <span aria-hidden className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-slate">
                  <IconUser size={18} />
                </span>
                <input name="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("wsearch.placeholder")} aria-label={t("wsearch.placeholder")} autoComplete="off" className="input w-full py-3 text-base" style={{ paddingInlineStart: "2.4rem", paddingInlineEnd: "2.4rem" }} />
                {q ? (
                  <button type="button" aria-label={t("wsearch.clear")} onClick={() => { setQ(""); start(() => router.push("/wanted")); }} className="absolute inset-y-0 end-3 text-lg text-slate hover:text-ink">
                    ×
                  </button>
                ) : null}
              </div>
              <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue px-6 py-3 text-base font-bold text-white hover:bg-blue-dark disabled:opacity-60">
                <IconSearch size={18} />
                {t("wsearch.submit")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-semibold text-slate">
                  {t("wsearch.f.firstName")}
                  <input name="firstName" defaultValue={init.firstName} className="input mt-1 w-full" maxLength={60} />
                </label>
                <label className="block text-xs font-semibold text-slate">
                  {t("wsearch.f.lastName")}
                  <input name="lastName" defaultValue={init.lastName} className="input mt-1 w-full" maxLength={60} />
                </label>
                <label className="block text-xs font-semibold text-slate">
                  {t("wsearch.f.alias")}
                  <input name="alias" defaultValue={init.alias} className="input mt-1 w-full" maxLength={60} />
                </label>
                <label className="block text-xs font-semibold text-slate">
                  {t("wsearch.f.dob")}
                  <input name="dateOfBirth" type="date" defaultValue={init.dateOfBirth} className="input mt-1 w-full" />
                </label>
                <label className="block text-xs font-semibold text-slate">
                  {t("wsearch.f.gender")}
                  <select name="gender" defaultValue={init.gender} className="input mt-1 w-full">
                    <option value="">—</option>
                    {genders.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate">
                  {t("wsearch.f.idNumber")}
                  <input name="idNumber" defaultValue={init.idNumber} className="input mt-1 w-full" maxLength={60} />
                </label>
                <label className="block text-xs font-semibold text-slate sm:col-span-3">
                  {t("wsearch.f.offense")}
                  <input name="offense" defaultValue={init.offense} className="input mt-1 w-full" maxLength={100} />
                </label>
              </div>
              <button type="submit" disabled={pending} className="rounded-md bg-blue px-6 py-3 text-base font-bold text-white hover:bg-blue-dark disabled:opacity-60">
                {t("wsearch.submit")}
              </button>
            </div>
          )}
          <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-line bg-mist-2/40 px-3 py-2.5">
            <legend className="px-1 text-[11px] font-bold uppercase tracking-wide text-slate">{t("wsearch.sources")}</legend>
            {sources.map((s) => {
              const enabled = s.available && s.allowed;
              return (
                <label key={s.key} className={`flex items-center gap-2 text-sm ${enabled ? "text-ink" : "text-slate opacity-70"}`} title={enabled ? undefined : s.available ? t("wsearch.notAllowed") : t("wsearch.notConnectedHint")}>
                  <input type="checkbox" name="src" value={s.key} defaultChecked={enabled && init.sources.includes(s.key)} disabled={!enabled} className="h-4 w-4 accent-blue" />
                  {s.label}
                  {!enabled ? <span className="rounded bg-mist-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase">{s.available ? t("wsearch.notAllowedShort") : t("wsearch.notConnected")}</span> : null}
                </label>
              );
            })}
          </fieldset>
        </form>
      </section>
      {pending ? (
        <section className="overflow-hidden rounded-xl border border-info bg-white shadow-sm" role="status" aria-live="polite">
          <header className="bg-info-soft px-4 py-3 text-info">
            <h2 className="text-lg font-extrabold">{t("wsearch.pendingTitle")}</h2>
          </header>
          <div className="p-5 text-center">
            <div aria-hidden className="mx-auto mb-3 h-14 w-14 animate-spin rounded-full border-4 border-line border-t-blue" />
            <p className="text-base font-bold text-ink">{t("wsearch.pendingBody")}</p>
            <p className="text-sm text-slate">{t("wsearch.pendingWait")}</p>
            <ul className="mx-auto mt-4 max-w-md space-y-1 rounded-md bg-mist-2/50 p-3 text-start text-sm">
              {queried.map((l) => (
                <li key={l}>◌ {l}</li>
              ))}
            </ul>
            <p className="mt-3 inline-flex items-center justify-center gap-2 text-sm font-semibold text-ink">
              <IconClock size={16} className="text-slate" />
              {t("wsearch.elapsed", { t: mmss(elapsed) })}
            </p>
            <p className="mx-auto mt-3 flex max-w-md items-start gap-2 rounded-md bg-info-soft px-3 py-2 text-start text-sm text-info">
              <IconInfo size={18} className="mt-0.5 shrink-0" />
              {t("wsearch.pendingNote")}
            </p>
          </div>
        </section>
      ) : (
        children
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n";

const CATEGORIES = ["THEFT", "ROBBERY", "BURGLARY", "ASSAULT", "FRAUD", "DOMESTIC_VIOLENCE", "TRAFFIC_OFFENSE", "PUBLIC_ORDER", "PROPERTY_DAMAGE", "MISSING_PERSON", "CYBERCRIME", "CORRUPTION", "DRUG_OFFENSE", "KIDNAPPING", "SEXUAL_OFFENSE", "OTHER"] as const;
const CATEGORY_FR: Record<string, [string, string]> = {
  THEFT: ["Vol", "سرقة"], ROBBERY: ["Vol avec violence", "سطو"], BURGLARY: ["Cambriolage", "اقتحام"], ASSAULT: ["Agression", "اعتداء"], FRAUD: ["Escroquerie / fraude", "احتيال"], DOMESTIC_VIOLENCE: ["Violences conjugales ou familiales", "عنف أسري"], TRAFFIC_OFFENSE: ["Infraction routière / accident", "مخالفة مرورية / حادث"], PUBLIC_ORDER: ["Trouble à l'ordre public", "إخلال بالنظام العام"], PROPERTY_DAMAGE: ["Dégradation de biens", "إتلاف ممتلكات"], MISSING_PERSON: ["Disparition", "اختفاء"], CYBERCRIME: ["Cybercriminalité", "جريمة إلكترونية"], CORRUPTION: ["Corruption", "فساد"], DRUG_OFFENSE: ["Stupéfiants", "مخدرات"], KIDNAPPING: ["Enlèvement", "اختطاف"], SEXUAL_OFFENSE: ["Infraction sexuelle", "جريمة جنسية"], OTHER: ["Autre", "أخرى"],
};

type Kind = "COMPLAINT" | "REPORT" | "CONTACT";
type Done = { reference: string; trackingCode: string };

export function PublicForm({ kind, stations, locale }: { kind: Kind; stations: { id: string; name: string }[]; locale: "fr" | "ar" }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState<Done | null>(null);
  const [anonymous, setAnonymous] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    const f = new FormData(e.currentTarget);
    const body = {
      kind,
      category: kind === "CONTACT" ? "OTHER" : String(f.get("category") || "OTHER"),
      subject: String(f.get("subject") || ""),
      message: String(f.get("message") || ""),
      locationText: String(f.get("locationText") || ""),
      occurredOn: String(f.get("occurredOn") || ""),
      contactName: String(f.get("contactName") || ""),
      contactPhone: String(f.get("contactPhone") || ""),
      contactEmail: String(f.get("contactEmail") || ""),
      anonymous,
      stationId: String(f.get("stationId") || ""),
      consent: f.get("consent") === "on",
      website: String(f.get("website") || ""),
    };
    try {
      const res = await fetch("/api/v1/public/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json().catch(() => ({}))) as { data?: Done; error?: { code?: string; details?: Record<string, string[]> } };
      if (res.status === 429) setError(t("pub.form.rate"));
      else if (!res.ok || !json.data) {
        setFieldErrors(json.error?.details ?? {});
        setError(t("pub.form.error"));
      } else setDone(json.data);
    } catch {
      setError(t("pub.form.error"));
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div role="status" className="rounded-xl border border-success bg-success-soft p-6">
        <h2 className="text-xl font-extrabold text-success">{t("pub.done.title")}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="label">{t("pub.done.reference")}</dt>
            <dd className="font-mono text-lg font-bold text-ink">{done.reference}</dd>
          </div>
          <div>
            <dt className="label">{t("pub.done.code")}</dt>
            <dd className="font-mono text-lg font-bold tracking-widest text-ink">{done.trackingCode}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm font-semibold text-ink">{t("pub.done.warning")}</p>
        <Link href="/suivi" className="mt-4 inline-block rounded-md bg-gold px-4 py-2 text-sm font-bold text-navy">{t("pub.done.track")}</Link>
      </div>
    );

  const err = (k: string) => (fieldErrors[k]?.[0] ? <p className="mt-1 text-xs font-semibold text-danger">{fieldErrors[k][0]}</p> : null);
  return (
    <form onSubmit={onSubmit} noValidate={false} className="space-y-4 rounded-xl border border-line bg-card p-5 sm:p-6">
      <p role="note" className="rounded-md border border-warning bg-warning-soft px-3 py-2 text-xs text-warning">{t("pub.form.notice")}</p>
      {/* honeypot: invisible to people and screen readers */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {kind !== "CONTACT" ? (
          <div>
            <label htmlFor="pf-category" className="label">{t("pub.form.category")}</label>
            <select id="pf-category" name="category" className="input" defaultValue="OTHER">
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_FR[c][locale === "ar" ? 1 : 0]}</option>)}
            </select>
          </div>
        ) : null}
        <div className={kind === "CONTACT" ? "sm:col-span-2" : ""}>
          <label htmlFor="pf-subject" className="label">{t("pub.form.subject")}</label>
          <input id="pf-subject" name="subject" className="input" required minLength={5} maxLength={150} />
          {err("subject")}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pf-message" className="label">{t("pub.form.message")}</label>
          <textarea id="pf-message" name="message" className="input" rows={6} required minLength={20} maxLength={4000} />
          {err("message")}
        </div>
        {kind !== "CONTACT" ? (
          <>
            <div>
              <label htmlFor="pf-location" className="label">{t("pub.form.location")}</label>
              <input id="pf-location" name="locationText" className="input" maxLength={200} />
            </div>
            <div>
              <label htmlFor="pf-date" className="label">{t("pub.form.date")}</label>
              <input id="pf-date" name="occurredOn" type="date" className="input" max={new Date().toISOString().slice(0, 10)} />
            </div>
            {stations.length ? (
              <div className="sm:col-span-2">
                <label htmlFor="pf-station" className="label">{t("pub.form.station")}</label>
                <select id="pf-station" name="stationId" className="input" defaultValue="">
                  <option value="">{t("pub.form.stationAny")}</option>
                  {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      {kind !== "CONTACT" ? (
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="mt-1" />
          {t("pub.form.anonymous")}
        </label>
      ) : null}
      {!anonymous ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="pf-name" className="label">{t("pub.form.name")}</label>
            <input id="pf-name" name="contactName" className="input" maxLength={100} required={kind === "COMPLAINT"} autoComplete="name" />
            {err("contactName")}
          </div>
          <div>
            <label htmlFor="pf-phone" className="label">{t("pub.form.phone")}</label>
            <input id="pf-phone" name="contactPhone" className="input" maxLength={30} inputMode="tel" autoComplete="tel" />
            {err("contactPhone")}
          </div>
          <div>
            <label htmlFor="pf-email" className="label">{t("pub.form.email")}</label>
            <input id="pf-email" name="contactEmail" type="email" className="input" maxLength={150} autoComplete="email" />
            {err("contactEmail")}
          </div>
          <p className="text-xs text-slate sm:col-span-3">{t("pub.form.reach")}</p>
        </div>
      ) : null}
      <label className="flex items-start gap-2 text-sm text-ink">
        <input type="checkbox" name="consent" required className="mt-1" />
        {t("pub.form.consent")}
      </label>
      {error ? <p role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}
      <button type="submit" disabled={busy} className="rounded-md bg-gold px-6 py-2.5 text-sm font-bold text-navy hover:brightness-110 disabled:opacity-60">
        {busy ? t("pub.form.sending") : t("pub.form.submit")}
      </button>
    </form>
  );
}

export function TrackForm() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ reference: string; kind: string; status: string; subject: string; publicReply: string | null; receivedAt: string; repliedAt: string | null } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/v1/public/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reference: String(f.get("reference") || ""), code: String(f.get("code") || "") }) });
      const json = (await res.json().catch(() => ({}))) as { data?: typeof result };
      if (res.status === 429) setError(t("pub.track.rate"));
      else if (!res.ok || !json.data) setError(t("pub.track.notFound"));
      else setResult(json.data);
    } catch {
      setError(t("pub.track.notFound"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-line bg-card p-5 sm:grid-cols-3 sm:items-end">
        <div>
          <label htmlFor="tr-ref" className="label">{t("pub.track.reference")}</label>
          <input id="tr-ref" name="reference" className="input font-mono" placeholder="PUB-2026-000001" required />
        </div>
        <div>
          <label htmlFor="tr-code" className="label">{t("pub.track.code")}</label>
          <input id="tr-code" name="code" className="input font-mono tracking-widest" autoComplete="off" required />
        </div>
        <button type="submit" disabled={busy} className="rounded-md bg-gold px-5 py-2.5 text-sm font-bold text-navy hover:brightness-110 disabled:opacity-60">{t("pub.track.submit")}</button>
      </form>
      {error ? <p role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}
      {result ? (
        <div role="status" className="rounded-xl border border-line bg-card p-5">
          <p className="font-mono text-sm text-slate">{result.reference} · {t(`pub.kind.${result.kind}` as MessageKey)}</p>
          <p className="mt-1 text-lg font-bold text-ink">{result.subject}</p>
          <p className="mt-3 text-sm"><span className="label inline">{t("pub.track.status")} : </span><span className="font-bold text-gold">{t(`pub.status.${result.status}` as MessageKey)}</span></p>
          <p className="text-xs text-slate">{t("pub.track.received")} {new Date(result.receivedAt).toLocaleDateString()}</p>
          <div className="mt-4 rounded-md border border-line p-3">
            <p className="label">{t("pub.track.reply")}</p>
            <p className="text-sm text-ink">{result.publicReply ?? t("pub.track.noReply")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

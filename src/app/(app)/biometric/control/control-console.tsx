"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n";
import { CONTROL_UI } from "@/lib/biometric-control";

type Reference = { alertNumber: string; name: string | null; offense: string | null; unit: string | null; instruction: string | null; wantedId: string | null; canOpenDossier: boolean };
type View = { id: string; number: string; modality: string; result: keyof typeof CONTROL_UI; score: number | null; captureQuality: number; status: string; officerId: string; subjectLabel: string | null; reference: Reference | null; reviewNotes: string | null };
type Row = { id: string; number: string; modality: string; result: keyof typeof CONTROL_UI; status: string; createdAt: string };

const SOUND_KEY = "sigpn.bio.sound";
type SoundPrefs = { enabled: boolean; volume: number };

async function api<T>(path: string, method: string, body?: unknown): Promise<{ ok: boolean; data?: T; error?: string }> {
  const res = await fetch(path, { method, credentials: "same-origin", headers: { "content-type": "application/json", "X-Requested-With": "PMS" }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: { message?: string } };
  return res.ok ? { ok: true, data: json.data } : { ok: false, error: json.error?.message ?? String(res.status) };
}

const TONE_CLASS: Record<string, string> = {
  danger: "border-danger bg-danger-soft text-danger",
  warning: "border-warning bg-warning-soft text-warning",
  success: "border-success bg-success-soft text-success",
  neutral: "border-line bg-mist-2 text-slate",
};
const ICON: Record<string, string> = { POSSIBLE_MATCH: "⚠", UNCERTAIN: "?", NO_MATCH: "✓", UNAVAILABLE: "⊘" };

export function ControlConsole({ actorId, canReview, initial, focusId }: { actorId: string; canReview: boolean; initial: Row[]; focusId?: string }) {
  const t = useT();
  const [tab, setTab] = useState<"FINGERPRINT" | "FACE">("FINGERPRINT");
  const [captured, setCaptured] = useState<string | null>(null);
  const [scenario, setScenario] = useState("RANDOM");
  const [reason, setReason] = useState(t("bc.purposeDefault"));
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [rows, setRows] = useState<Row[]>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [sound, setSound] = useState<SoundPrefs>({ enabled: true, volume: 0.3 });
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SOUND_KEY);
      if (raw) setSound(JSON.parse(raw) as SoundPrefs);
    } catch {}
  }, []);
  const saveSound = (next: SoundPrefs) => {
    setSound(next);
    try {
      localStorage.setItem(SOUND_KEY, JSON.stringify(next));
    } catch {}
  };

  const beep = useCallback(
    (prefs = sound) => {
      if (!prefs.enabled) return;
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = 740;
        gain.gain.value = Math.min(Math.max(prefs.volume, 0), 1) * 0.3;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35); // brief by design
      } catch {}
    },
    [sound],
  );

  const stopCamera = useCallback(() => {
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    setCameraOn(false);
  }, []);
  useEffect(() => stopCamera, [stopCamera]);
  useEffect(() => {
    if (tab !== "FACE") stopCamera();
  }, [tab, stopCamera]);

  const startCamera = async () => {
    setError(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (video.current) video.current.srcObject = stream.current;
      setCameraOn(true);
    } catch {
      setError(t("bc.cameraDenied"));
    }
  };
  const snap = () => {
    if (video.current && canvas.current && video.current.videoWidth) {
      canvas.current.width = 160;
      canvas.current.height = 120;
      canvas.current.getContext("2d")?.drawImage(video.current, 0, 0, 160, 120);
    }
    setCaptured(t("bc.snapDone"));
  };

  const load = async (id: string) => {
    const r = await api<View>(`/api/v1/biometric/control/${id}`, "GET");
    if (r.ok && r.data) setView(r.data);
  };
  useEffect(() => {
    if (focusId) void load(focusId);
  }, [focusId]);

  const run = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const r = await api<View>("/api/v1/biometric/control", "POST", { scenario, modality: tab, reason });
    setBusy(false);
    if (!r.ok || !r.data) return setError(r.error ?? "error");
    setView(r.data);
    setCaptured(null);
    setShowError(false);
    setRows((prev) => [{ id: r.data!.id, number: r.data!.number, modality: r.data!.modality, result: r.data!.result, status: r.data!.status, createdAt: new Date().toISOString() }, ...prev].slice(0, 20));
    if (CONTROL_UI[r.data.result].sound) beep();
  };

  const act = async (body: Record<string, unknown>, done: MessageKey) => {
    if (!view) return;
    setError(null);
    const r = await api<View>(`/api/v1/biometric/control/${view.id}`, "PATCH", body);
    if (!r.ok || !r.data) return setError(r.error ?? "error");
    setView(r.data);
    setMessage(t(done));
    setShowError(false);
    setRows((prev) => prev.map((x) => (x.id === r.data!.id ? { ...x, status: r.data!.status } : x)));
  };

  const ui = view ? CONTROL_UI[view.result] : null;
  const reviewed = view?.status === "CONFIRMED_BY_HUMAN" || view?.status === "REJECTED_BY_HUMAN";
  const [reviewNotes, setReviewNotes] = useState("");
  const [errKind, setErrKind] = useState("FALSE_POSITIVE");
  const [errNotes, setErrNotes] = useState("");

  return (
    <div className="space-y-4">
      <div role="note" className="rounded-md border border-warning bg-warning-soft px-4 py-2 text-xs font-semibold text-warning">
        {t("bc.simBanner")}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ------------------------------------------------ left: capture */}
        <Card title={t("bc.capture")}>
          <div role="tablist" className="mb-4 flex gap-2">
            {(["FINGERPRINT", "FACE"] as const).map((m) => (
              <button key={m} role="tab" aria-selected={tab === m} onClick={() => { setTab(m); setCaptured(null); }} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === m ? "bg-gold text-navy" : "border border-line text-slate hover:text-ink"}`}>
                {m === "FINGERPRINT" ? t("bc.fingerprint") : t("bc.face")}
              </button>
            ))}
          </div>
          {tab === "FINGERPRINT" ? (
            <div className="space-y-3">
              <div className="flex h-44 items-center justify-center rounded-lg border-2 border-dashed border-line bg-mist-2">
                <div className="text-center">
                  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke={captured ? "#4ade80" : "#b8c7d9"} strokeWidth="1.4" aria-hidden>
                    <path d="M12 3a6 6 0 0 0-6 6v3M18 12V9a6 6 0 0 0-9-5.2M9 21c0-3 1-4 1-7a2 2 0 0 1 4 0c0 4-1 5.5-1 8M6 15c0 2.5-.5 4-1 5M15 21c.5-2 1-4 1-7M18 16c0 2-.3 3.5-.8 5" />
                  </svg>
                  <p className="mt-2 text-xs text-slate">{captured ?? t("bc.scannerIdle")}</p>
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setCaptured(t("bc.scannerDone"))}>{t("bc.captureFinger")}</Button>
              <p className="text-[11px] text-slate">{t("bc.scanner")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-line bg-black/40">
                <video ref={video} autoPlay playsInline muted className={`h-full w-full object-cover ${cameraOn ? "" : "hidden"}`} />
                {!cameraOn ? <p className="px-4 text-center text-xs text-slate">{captured ?? t("bc.cameraNotice")}</p> : null}
              </div>
              <canvas ref={canvas} className="hidden" aria-hidden />
              <div className="flex flex-wrap gap-2">
                {!cameraOn ? <Button size="sm" variant="secondary" onClick={startCamera}>{t("bc.cameraStart")}</Button> : <><Button size="sm" variant="secondary" onClick={snap}>{t("bc.cameraSnap")}</Button><Button size="sm" variant="ghost" onClick={stopCamera}>{t("bc.cameraStop")}</Button></>}
              </div>
              <p className="text-[11px] text-slate">{t("bc.cameraNotice")}</p>
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="bc-scenario" className="label">{t("bc.scenario")}</label>
              <select id="bc-scenario" className="input" value={scenario} onChange={(e) => setScenario(e.target.value)}>
                {(["RANDOM", "POSSIBLE_MATCH", "UNCERTAIN", "NO_MATCH", "UNAVAILABLE"] as const).map((s) => <option key={s} value={s}>{t(`bc.scenario.${s}` as MessageKey)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="bc-reason" className="label">{t("bc.purpose")}</label>
              <input id="bc-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Button onClick={run} disabled={busy || reason.trim().length < 5}>{busy ? t("bc.running") : t("bc.run")}</Button>
            <label className="flex items-center gap-1.5 text-xs text-ink">
              <input type="checkbox" className="h-5 w-5 accent-gold" checked={sound.enabled} onChange={(e) => saveSound({ ...sound, enabled: e.target.checked })} />
              {t("bc.sound")}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate">
              {t("bc.soundVolume")}
              <input type="range" min={0} max={1} step={0.1} value={sound.volume} onChange={(e) => saveSound({ ...sound, volume: Number(e.target.value) })} aria-label={t("bc.soundVolume")} />
            </label>
            <Button size="xs" variant="ghost" onClick={() => beep()}>{t("bc.soundTest")}</Button>
          </div>
          {error ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
        </Card>

        {/* ------------------------------------------------ right: results */}
        <Card title={t("bc.results")}>
          {!view || !ui ? (
            <p className="text-sm text-slate">{t("bc.waiting")}</p>
          ) : (
            <div className="space-y-4">
              <div
                role={view.result === "POSSIBLE_MATCH" ? "alert" : "status"}
                className={`rounded-lg border-2 px-4 py-3 ${TONE_CLASS[ui.tone]} ${ui.flashing ? "alert-flash" : ""}`}
              >
                <p className="flex items-center gap-2 text-lg font-extrabold"><span aria-hidden>{ICON[view.result]}</span>{t(`bc.result.${view.result}` as MessageKey)}</p>
                <p className="mt-1 text-xs font-semibold">{t(`bc.help.${view.result}` as MessageKey)}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><dt className="label">{t("bc.score")}</dt><dd className="tabular-nums text-ink">{view.score === null ? "—" : `${view.score.toFixed(1)} / 100`}</dd></div>
                <div><dt className="label">{t("bc.quality")}</dt><dd className="tabular-nums text-ink">{view.captureQuality} / 100</dd></div>
                <div className="col-span-2"><dt className="label">{t("bc.reference")}</dt><dd className="text-ink">{view.number} · <Badge tone="violet">SIMULATION</Badge> · <Badge tone="info">{t(`bc.status.${view.status}` as MessageKey)}</Badge></dd></div>
                {view.reference ? (
                  <>
                    <div><dt className="label">{t("bc.alertRef")}</dt><dd className="text-ink">{view.reference.alertNumber}</dd></div>
                    {view.reference.name ? <div><dt className="label">{t("bc.person")}</dt><dd className="font-semibold text-ink">{view.reference.name}</dd></div> : null}
                    {view.reference.offense ? <div><dt className="label">{t("bc.offense")}</dt><dd className="text-ink">{view.reference.offense}</dd></div> : null}
                    {view.reference.unit ? <div><dt className="label">{t("bc.unit")}</dt><dd className="text-ink">{view.reference.unit}</dd></div> : null}
                  </>
                ) : view.subjectLabel ? (
                  <div className="col-span-2 text-xs text-slate">{t("bc.noReference")}</div>
                ) : null}
              </dl>

              {view.result === "POSSIBLE_MATCH" || view.result === "UNCERTAIN" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {view.reference?.wantedId ? <Link href={`/wanted/${view.reference.wantedId}`} className="inline-flex items-center rounded-md border border-line px-3.5 py-2 text-sm font-semibold text-ink hover:bg-mist-2">{t("bc.openDossier")}</Link> : null}
                    <Button variant="secondary" onClick={() => act({ op: "requestVerification" }, "bc.done.requestVerification")} disabled={reviewed}>{t("bc.requestVerification")}</Button>
                    <Button variant="secondary" onClick={() => act({ op: "notifySuperior" }, "bc.done.notifySuperior")}>{t("bc.notifySuperior")}</Button>
                    <Button variant="ghost" onClick={() => setShowError((v) => !v)}>{t("bc.reportError")}</Button>
                  </div>
                  {view.reference && !view.reference.wantedId ? <p className="text-xs text-slate">{t("bc.noDossier")}</p> : null}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setShowError((v) => !v)}>{t("bc.reportError")}</Button></div>
              )}

              {showError ? (
                <div className="space-y-2 rounded-md border border-line p-3">
                  <label htmlFor="bc-errkind" className="label">{t("bc.errorKind")}</label>
                  <select id="bc-errkind" className="input" value={errKind} onChange={(e) => setErrKind(e.target.value)}>
                    {(["FALSE_POSITIVE", "FALSE_NEGATIVE", "POOR_CAPTURE", "CONTESTED"] as const).map((k) => <option key={k} value={k}>{t(`bc.error.${k}` as MessageKey)}</option>)}
                  </select>
                  <label htmlFor="bc-errnotes" className="label">{t("bc.errorNotes")}</label>
                  <textarea id="bc-errnotes" className="input" rows={2} maxLength={1000} value={errNotes} onChange={(e) => setErrNotes(e.target.value)} />
                  <Button size="sm" onClick={() => act({ op: "reportError", kind: errKind, notes: errNotes }, "bc.done.reportError")}>{t("bc.errorSend")}</Button>
                </div>
              ) : null}

              {canReview && (view.result === "POSSIBLE_MATCH" || view.result === "UNCERTAIN") && !reviewed && view.officerId !== actorId ? (
                <div className="space-y-2 rounded-md border border-gold p-3">
                  <p className="text-sm font-bold text-gold">{t("bc.review.title")}</p>
                  <p className="text-xs text-slate">{t("bc.review.hint")}</p>
                  <label htmlFor="bc-review" className="label">{t("bc.review.notes")}</label>
                  <textarea id="bc-review" className="input" rows={2} maxLength={1000} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="success" disabled={reviewNotes.trim().length < 10} onClick={() => act({ op: "review", outcome: "CONFIRMED", notes: reviewNotes }, "bc.done.review")}>{t("bc.review.confirm")}</Button>
                    <Button size="sm" variant="secondary" disabled={reviewNotes.trim().length < 10} onClick={() => act({ op: "review", outcome: "REJECTED", notes: reviewNotes }, "bc.done.review")}>{t("bc.review.reject")}</Button>
                  </div>
                </div>
              ) : null}
              {message ? <p role="status" className="text-sm font-semibold text-success">{message}</p> : null}
            </div>
          )}
        </Card>
      </div>

      <Card title={t("bc.recent")} padded={false}>
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-slate">{t("bc.recentNone")}</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-ink">{r.number}</span>
                  <Badge tone={CONTROL_UI[r.result].tone}>{t(`bc.scenario.${r.result}` as MessageKey)}</Badge>
                  <span className="text-xs text-slate">{t(`bc.modality.${r.modality}` as MessageKey)} · {t(`bc.status.${r.status}` as MessageKey)}</span>
                </span>
                <Button size="xs" variant="ghost" onClick={() => load(r.id)}>{t("bc.open")}</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

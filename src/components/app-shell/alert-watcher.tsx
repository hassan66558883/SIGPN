"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";

type Beat = { online: boolean; pending: number; unread: number; reason: string | null };

const POLL_MS = 20_000;
const SOUND_KEY = "sigpn.alerts.sound";

/**
 * Heartbeat of the unit + banner for alerts waiting. It is also what registers the unit as connected.
 * Accessible by design: the banner is a labelled status region with text and a link (colour is never the only signal),
 * the flash is slow and disabled under prefers-reduced-motion, and the short beep is opt-in and can be switched off.
 */
export function AlertWatcher() {
  const t = useT();
  const [beat, setBeat] = useState<Beat | null>(null);
  const [failed, setFailed] = useState(false);
  const [sound, setSound] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    try {
      setSound(localStorage.getItem(SOUND_KEY) === "1");
    } catch {}
  }, []);

  const beep = useCallback(() => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }, []);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/v1/alerts/heartbeat", { method: "POST", credentials: "same-origin", headers: { "X-Requested-With": "PMS" } });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { data: Beat };
        if (stop) return;
        setFailed(false);
        setBeat(json.data);
        if (json.data.unread > last.current && sound) beep();
        last.current = json.data.unread;
      } catch {
        if (!stop) setFailed(true);
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [sound, beep]);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "1" : "0");
    } catch {}
    if (next) beep();
  };

  if (failed) {
    return (
      <div role="status" className="no-print border-b border-line bg-warning-soft px-4 py-1.5 text-center text-xs font-semibold text-warning">
        {t("alerts.watch.offline")}
      </div>
    );
  }
  if (!beat || !beat.online || beat.unread === 0) return null;
  return (
    <div role="status" aria-live="polite" className="alert-flash no-print flex flex-wrap items-center justify-center gap-3 border-b border-danger bg-danger-soft px-4 py-2 text-sm text-danger">
      <span className="font-bold">⚑ {t("alerts.watch.new", { n: beat.unread })}</span>
      <Link href="/alerts" className="rounded-md bg-danger px-3 py-1 text-xs font-bold text-white hover:brightness-110">
        {t("alerts.watch.open")}
      </Link>
      <label className="flex items-center gap-1.5 text-xs text-ink">
        <input type="checkbox" checked={sound} onChange={toggleSound} />
        {t("alerts.watch.sound")}
      </label>
    </div>
  );
}

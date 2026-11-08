import "server-only";
import { runAlertMaintenance } from "@/server/alerts/maintenance";

/**
 * In-process scheduler of the alert network (retries, reminders, escalations). Started once per server instance by
 * `src/instrumentation.ts`. Every pass is idempotent, so several instances or a restart never duplicate an escalation.
 * ALERT_SCHEDULER=off disables it (use `npm run alerts:maintain` from an external cron); ALERT_SCHEDULER_INTERVAL_MINUTES sets the period (default 1).
 */
const G = globalThis as unknown as { __alertTimer?: ReturnType<typeof setInterval> };

export function startAlertScheduler() {
  if (G.__alertTimer || process.env.ALERT_SCHEDULER === "off") return;
  const minutes = Math.max(1, Number.parseInt(process.env.ALERT_SCHEDULER_INTERVAL_MINUTES ?? "1", 10) || 1);
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const r = await runAlertMaintenance();
      if (r.failed || r.retried || r.escalated1 || r.escalated2) console.log(`[alerts] ${r.retried} retried, ${r.escalated1} escalated (level 1), ${r.escalated2} (level 2), ${r.failed} failed`);
    } catch (e) {
      console.error("[alerts] maintenance failed:", e);
    } finally {
      running = false;
    }
  };
  G.__alertTimer = setInterval(tick, minutes * 60_000);
  G.__alertTimer.unref?.();
  setTimeout(tick, 30_000).unref?.();
}

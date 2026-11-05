import "server-only";
import { runRotation } from "@/server/hr/rotation";
import { applyDueDiscipline } from "@/server/hr/discipline";

/**
 * In-process scheduler of the automatic assignment. Started once per server instance by `src/instrumentation.ts`.
 * It does nothing while AFFECTATION_AUTOMATIQUE is disabled, and every step is idempotent (unique ledger in the
 * database), so several instances or a restart never duplicate proposals.
 * HR_SCHEDULER=off disables it (use `npm run hr:rotation` from an external cron instead); HR_SCHEDULER_INTERVAL_MINUTES sets the period (default 60).
 */
const G = globalThis as unknown as { __hrRotationTimer?: ReturnType<typeof setInterval> };

export function startRotationScheduler() {
  if (G.__hrRotationTimer || process.env.HR_SCHEDULER === "off") return;
  const minutes = Math.max(1, Number.parseInt(process.env.HR_SCHEDULER_INTERVAL_MINUTES ?? "60", 10) || 60);
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      // Disciplinary suspensions start and end on their dates whatever the rotation switch says.
      const d = await applyDueDiscipline();
      if (d.started || d.ended) console.log(`[hr-discipline] ${d.started} suspension(s) started, ${d.ended} ended`);
      const r = await runRotation({ trigger: "SCHEDULER" });
      if (r.enabled && (r.proposals || r.upcomingAlerts || r.executedDue || r.failedExecutions)) console.log(`[hr-rotation] ${r.proposals} proposal(s), ${r.upcomingAlerts} alert(s), ${r.executedDue} executed, ${r.failedExecutions} failed`);
    } catch (e) {
      console.error("[hr-rotation] run failed:", e);
    } finally {
      running = false;
    }
  };
  G.__hrRotationTimer = setInterval(tick, minutes * 60_000);
  G.__hrRotationTimer.unref?.();
  setTimeout(tick, 60_000).unref?.();
}

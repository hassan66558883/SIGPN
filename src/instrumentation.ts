export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Permissions, system roles, official provinces and (once) the first administrator are brought in line with the code at every start.
    try {
      const { bootstrap } = await import("@/server/bootstrap");
      await bootstrap();
    } catch (e) {
      console.error("[bootstrap] failed (the application keeps starting):", e);
    }
    const { startRotationScheduler } = await import("@/server/hr/scheduler");
    startRotationScheduler();
    const { startAlertScheduler } = await import("@/server/alerts/scheduler");
    startAlertScheduler();
  }
}

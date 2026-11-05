export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startRotationScheduler } = await import("@/server/hr/scheduler");
    startRotationScheduler();
  }
}

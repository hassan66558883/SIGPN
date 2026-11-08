/**
 * Rules of the biometric control screen (SIGPN-T v2.0, section 6). Pure and unit-tested.
 * A score is only an indication to verify: no band ever concludes that a person is guilty.
 */
export type ControlResult = "POSSIBLE_MATCH" | "UNCERTAIN" | "NO_MATCH" | "UNAVAILABLE";
export type Scenario = ControlResult | "RANDOM";

/** Minimum capture quality (0-100) for a score to be trusted; below it the result can never be better than UNCERTAIN. */
export const MIN_CAPTURE_QUALITY = 40;
export const POSSIBLE_THRESHOLD = 80;
export const UNCERTAIN_THRESHOLD = 45;

/** Classifies a provider outcome. `score` is null when the service did not answer. */
export function classifyControl(input: { score: number | null; captureQuality: number; available: boolean }): ControlResult {
  if (!input.available || input.score === null) return "UNAVAILABLE";
  if (input.captureQuality < MIN_CAPTURE_QUALITY) return input.score >= UNCERTAIN_THRESHOLD ? "UNCERTAIN" : "NO_MATCH";
  if (input.score >= POSSIBLE_THRESHOLD) return "POSSIBLE_MATCH";
  if (input.score >= UNCERTAIN_THRESHOLD) return "UNCERTAIN";
  return "NO_MATCH";
}

/** Plausible simulated figures for a scenario. `rand` returns a number in [0, 1) (injectable for tests). */
export function simulateOutcome(scenario: Exclude<Scenario, "RANDOM">, rand: () => number = Math.random) {
  const between = (a: number, b: number) => Math.round((a + rand() * (b - a)) * 100) / 100;
  switch (scenario) {
    case "POSSIBLE_MATCH":
      return { score: between(82, 97), captureQuality: Math.round(between(70, 95)), available: true };
    case "UNCERTAIN":
      return { score: between(50, 72), captureQuality: Math.round(between(45, 65)), available: true };
    case "NO_MATCH":
      return { score: between(3, 30), captureQuality: Math.round(between(65, 95)), available: true };
    case "UNAVAILABLE":
      return { score: null, captureQuality: Math.round(between(60, 90)), available: false };
  }
}

export function pickScenario(scenario: Scenario, rand: () => number = Math.random): Exclude<Scenario, "RANDOM"> {
  if (scenario !== "RANDOM") return scenario;
  const r = rand();
  return r < 0.25 ? "POSSIBLE_MATCH" : r < 0.5 ? "UNCERTAIN" : r < 0.9 ? "NO_MATCH" : "UNAVAILABLE";
}

/** What the screen must tell the officer for each result. Wording never presumes guilt. */
export const CONTROL_UI = {
  POSSIBLE_MATCH: { tone: "danger", flashing: true, sound: true },
  UNCERTAIN: { tone: "warning", flashing: false, sound: false },
  NO_MATCH: { tone: "success", flashing: false, sound: false },
  UNAVAILABLE: { tone: "neutral", flashing: false, sound: false },
} as const;

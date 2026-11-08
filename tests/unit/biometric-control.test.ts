import { test } from "node:test";
import assert from "node:assert/strict";
import { CONTROL_UI, classifyControl, pickScenario, simulateOutcome, type ControlResult } from "../../src/lib/biometric-control";

test("classification: bands and the capture-quality guard", () => {
  assert.equal(classifyControl({ score: 95, captureQuality: 90, available: true }), "POSSIBLE_MATCH");
  assert.equal(classifyControl({ score: 80, captureQuality: 90, available: true }), "POSSIBLE_MATCH");
  assert.equal(classifyControl({ score: 79.9, captureQuality: 90, available: true }), "UNCERTAIN");
  assert.equal(classifyControl({ score: 45, captureQuality: 90, available: true }), "UNCERTAIN");
  assert.equal(classifyControl({ score: 44.9, captureQuality: 90, available: true }), "NO_MATCH");
  assert.equal(classifyControl({ score: 99, captureQuality: 30, available: true }), "UNCERTAIN", "a poor capture can never give a possible match");
  assert.equal(classifyControl({ score: 10, captureQuality: 30, available: true }), "NO_MATCH");
});

test("an unavailable service is never read as 'no match'", () => {
  assert.equal(classifyControl({ score: null, captureQuality: 90, available: false }), "UNAVAILABLE");
  assert.equal(classifyControl({ score: 99, captureQuality: 90, available: false }), "UNAVAILABLE");
});

test("every simulated scenario classifies back to itself, whatever the random draw", () => {
  for (const scenario of ["POSSIBLE_MATCH", "UNCERTAIN", "NO_MATCH", "UNAVAILABLE"] as const) {
    for (const r of [0, 0.01, 0.5, 0.99, 0.999999]) {
      const out = simulateOutcome(scenario, () => r);
      assert.equal(classifyControl(out) as ControlResult, scenario, `${scenario} @ ${r}`);
    }
  }
});

test("random scenario covers all outcomes; only a possible match flashes and beeps", () => {
  assert.deepEqual([0.1, 0.3, 0.6, 0.95].map((r) => pickScenario("RANDOM", () => r)), ["POSSIBLE_MATCH", "UNCERTAIN", "NO_MATCH", "UNAVAILABLE"]);
  assert.equal(pickScenario("NO_MATCH"), "NO_MATCH");
  assert.deepEqual(Object.entries(CONTROL_UI).filter(([, v]) => v.flashing || v.sound).map(([k]) => k), ["POSSIBLE_MATCH"]);
});

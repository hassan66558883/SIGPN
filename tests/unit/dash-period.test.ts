import { test } from "node:test";
import assert from "node:assert/strict";
import { buckets, parsePeriod } from "../../src/lib/dash-period";

const NOW = new Date("2026-11-07T15:30:00Z");

test("period parsing falls back to 30 days", () => {
  assert.equal(parsePeriod("7"), 7);
  assert.equal(parsePeriod("365"), 365);
  assert.equal(parsePeriod("12"), 30);
  assert.equal(parsePeriod(undefined), 30);
});

test("daily buckets are contiguous, end after today, and cover the period", () => {
  const b = buckets(30, NOW);
  assert.equal(b.length, 30);
  assert.equal(b[29].end.toISOString(), "2026-11-08T00:00:00.000Z");
  assert.equal(b[0].start.toISOString(), "2026-10-09T00:00:00.000Z");
  for (let i = 1; i < b.length; i++) assert.equal(b[i].start.getTime(), b[i - 1].end.getTime());
});

test("weekly buckets for 90 days and calendar months for 12 months", () => {
  const w = buckets(90, NOW);
  assert.equal(w.length, 13);
  assert.equal(w[1].start.getTime() - w[0].start.getTime(), 7 * 86_400_000);
  const m = buckets(365, NOW);
  assert.equal(m.length, 12);
  assert.equal(m[11].label, "2026-11");
  assert.equal(m[0].label, "2025-12");
  for (let i = 1; i < m.length; i++) assert.equal(m[i].start.getTime(), m[i - 1].end.getTime());
});

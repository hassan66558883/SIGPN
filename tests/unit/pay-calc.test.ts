import { test } from "node:test";
import assert from "node:assert/strict";
import { computePay, periodBounds, type PayItemInput } from "../../src/lib/pay-calc";

const item = (over: Partial<PayItemInput> & Pick<PayItemInput, "kind" | "value">): PayItemInput => ({ code: over.code ?? over.kind, name: over.kind, calculation: "FIXED", ...over });

test("base only", () => {
  const r = computePay({ base: 150_000, items: [] });
  assert.deepEqual([r.base, r.gross, r.deductions, r.net], [150_000, 150_000, 0, 150_000]);
});

test("bonuses and allowances add to the base; percentages apply to the base; amounts are whole FCFA", () => {
  const r = computePay({ base: 123_457, items: [item({ kind: "BONUS", calculation: "PERCENT_OF_BASE", value: 10 }), item({ kind: "ALLOWANCE", value: 25_000 })] });
  assert.equal(r.items[0].amount, 12_346); // 12345.7 rounded
  assert.equal(r.gross, 123_457 + 12_346 + 25_000);
  assert.equal(r.net, r.gross);
});

test("deductions are withheld, percentages computed on the base", () => {
  const r = computePay({ base: 200_000, items: [item({ kind: "ALLOWANCE", value: 30_000 }), item({ kind: "DEDUCTION", calculation: "PERCENT_OF_BASE", value: 8 }), item({ kind: "DEDUCTION", value: 5_000 })] });
  assert.equal(r.deductions, 16_000 + 5_000);
  assert.equal(r.net, 230_000 - 21_000);
});

test("benefits in kind are valued but never reach gross or net", () => {
  const r = computePay({ base: 100_000, items: [item({ kind: "BENEFIT", value: 40_000 })] });
  assert.equal(r.benefits, 40_000);
  assert.equal(r.gross, 100_000);
  assert.equal(r.net, 100_000);
});

test("withholdings can never exceed the gross: capped and flagged, net never negative", () => {
  const r = computePay({ base: 50_000, items: [item({ kind: "DEDUCTION", value: 80_000 })] });
  assert.equal(r.deductions, 50_000);
  assert.equal(r.net, 0);
  assert.equal(r.deductionsCapped, true);
});

test("a suspended officer gets the configured share of the base and of fixed amounts; percentages follow the reduced base", () => {
  const r = computePay({ base: 200_000, suspended: true, suspendedPercent: 50, items: [item({ kind: "BONUS", calculation: "PERCENT_OF_BASE", value: 10 }), item({ kind: "ALLOWANCE", value: 20_000 }), item({ kind: "DEDUCTION", calculation: "PERCENT_OF_BASE", value: 10 })] });
  assert.equal(r.base, 100_000);
  assert.equal(r.items[0].amount, 10_000); // 10 % of the base actually paid (100 000), not reduced twice
  assert.equal(r.items[1].amount, 10_000); // fixed allowance x 50 %
  assert.equal(r.gross, 120_000);
  assert.equal(r.deductions, 10_000);
  assert.equal(r.net, 110_000);
  assert.equal(r.suspended, true);
});

test("suspension share is clamped to 0..100", () => {
  assert.equal(computePay({ base: 100_000, suspended: true, suspendedPercent: 250, items: [] }).base, 100_000);
  assert.equal(computePay({ base: 100_000, suspended: true, suspendedPercent: -5, items: [] }).base, 0);
});

test("period bounds", () => {
  const b = periodBounds("2026-02");
  assert.equal(b.start.toISOString().slice(0, 10), "2026-02-01");
  assert.equal(b.end.toISOString().slice(0, 10), "2026-02-28");
  assert.equal(periodBounds("2024-02").end.toISOString().slice(0, 10), "2024-02-29");
  assert.throws(() => periodBounds("2026-13"));
});

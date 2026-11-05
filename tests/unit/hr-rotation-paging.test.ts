/**
 * Regression guard (found by the 14 000-officer load test): the automatic assignment pages through officers that
 * receive their DUE alert while it runs. A row cursor on that mutating set vanishes from the filter and silently stops
 * the scan after the first page; the engine must use keyset paging on (currentPostSince, id).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const src = readFileSync(path.join(process.cwd(), "src", "server", "hr", "rotation.ts"), "utf8");

test("rotation scan uses keyset paging, never a row cursor", () => {
  assert.ok(!/\bcursor\s*:/.test(src), "no `cursor:` in rotation.ts");
  assert.match(src, /currentPostSince: \{ gt: after\.since \}/);
});

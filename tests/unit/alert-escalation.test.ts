import { test } from "node:test";
import assert from "node:assert/strict";
import { escalationLevelFor, escalationThresholds } from "../../src/lib/alert-escalation";

test("urgent notices escalate faster than ordinary ones", () => {
  assert.ok(escalationThresholds("HIGH").level1 < escalationThresholds("LOW").level1);
  assert.equal(escalationThresholds("EXTREME").level2, escalationThresholds("HIGH").level2);
});

test("a pending delivery reaches level 1 then 2 with age", () => {
  const at = (age: number, priority = "MEDIUM") => escalationLevelFor({ status: "PENDING", requiresAck: true, priority, ageMinutes: age });
  assert.deepEqual([at(1), at(15), at(59), at(60)], [0, 1, 1, 2]);
  assert.deepEqual([at(4, "HIGH"), at(5, "HIGH"), at(15, "HIGH")], [0, 1, 2]);
});

test("a delivered but unacknowledged alert escalates; an acknowledged or failed one never does", () => {
  assert.equal(escalationLevelFor({ status: "READ", requiresAck: true, priority: "MEDIUM", ageMinutes: 29 }), 0);
  assert.equal(escalationLevelFor({ status: "READ", requiresAck: true, priority: "MEDIUM", ageMinutes: 31 }), 1);
  assert.equal(escalationLevelFor({ status: "DELIVERED", requiresAck: true, priority: "MEDIUM", ageMinutes: 61 }), 2);
  assert.equal(escalationLevelFor({ status: "DELIVERED", requiresAck: false, priority: "MEDIUM", ageMinutes: 600 }), 0);
  for (const status of ["ACKNOWLEDGED", "FAILED"]) assert.equal(escalationLevelFor({ status, requiresAck: true, priority: "HIGH", ageMinutes: 999 }), 0);
});

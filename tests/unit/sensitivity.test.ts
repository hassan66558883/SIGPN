import { test } from "node:test";
import assert from "node:assert/strict";
import { SENSITIVE_PERMISSIONS, impliedClearance, isCleared, isSensitivePermission, mfaRequired, requiredClearance, usablePermissions } from "../../src/server/rbac/sensitivity";
import { PERMISSIONS } from "../../src/server/rbac/permissions";
import { SYSTEM_ROLES } from "../../src/server/rbac/roles";

/** Lot 3: sensitive permissions, clearance tiers and mandatory MFA. */
test("every sensitive permission exists in the catalogue and the decision-7 categories are covered", () => {
  for (const p of SENSITIVE_PERMISSIONS) assert.ok(PERMISSIONS.includes(p), `${p} is a real permission`);
  for (const p of ["warrants:approve", "wanted:approve", "detention:extend", "roles:manage", "cases:view_sensitive", "documents:view_confidential", "hr:discipline_decide", "hr:pay_view", "audit:export", "reports:export"]) assert.ok(isSensitivePermission(p), p);
  for (const p of ["cases:view", "persons:view", "complaints:create", "users:create", "apikeys:manage_own"]) assert.ok(!isSensitivePermission(p), `${p} is ordinary`);
});

test("a sensitive permission needs its clearance; the confidential documents need the top tier", () => {
  assert.equal(requiredClearance("cases:view"), "STANDARD");
  assert.equal(requiredClearance("warrants:approve"), "SENSITIVE");
  assert.equal(requiredClearance("documents:view_confidential"), "CONFIDENTIAL");
  assert.ok(isCleared("CONFIDENTIAL", "SENSITIVE") && isCleared("SENSITIVE", "SENSITIVE") && !isCleared("STANDARD", "SENSITIVE") && !isCleared("SENSITIVE", "CONFIDENTIAL"));
  const all = ["cases:view", "warrants:approve", "documents:view_confidential"];
  assert.deepEqual([...usablePermissions(all, "STANDARD")], ["cases:view"]);
  assert.deepEqual([...usablePermissions(all, "SENSITIVE")], ["cases:view", "warrants:approve"]);
  assert.deepEqual([...usablePermissions(all, "CONFIDENTIAL")], all);
});

test("multi-factor authentication: mandatory for the role, a sensitive permission or a clearance; optional otherwise", () => {
  assert.equal(mfaRequired({ roleRequiresMfa: true, permissions: [], clearance: "STANDARD" }), true);
  assert.equal(mfaRequired({ roleRequiresMfa: false, permissions: ["warrants:approve"], clearance: "STANDARD" }), true, "a sensitive permission");
  assert.equal(mfaRequired({ roleRequiresMfa: false, permissions: ["cases:view"], clearance: "SENSITIVE" }), true, "a clearance");
  assert.equal(mfaRequired({ roleRequiresMfa: false, permissions: ["cases:view", "persons:view"], clearance: "STANDARD" }), false, "an ordinary account stays optional");
});

test("the clearance a role implies, and no ordinary field role is pushed into a clearance", () => {
  const implied = (code: string) => impliedClearance(SYSTEM_ROLES.find((r) => r.code === code)!.permissions);
  assert.equal(implied("NATIONAL_COMMANDER"), "CONFIDENTIAL");
  assert.equal(implied("HR_PAYROLL"), "SENSITIVE");
  assert.equal(implied("SUPER_ADMIN"), "SENSITIVE");
  for (const code of ["DESK_OFFICER", "PATROL_OFFICER", "INVESTIGATOR", "OFFICER", "TRAFFIC_CONTROL_AGENT", "CUSTODY_OFFICER"]) assert.equal(implied(code), "STANDARD", code);
});

test("every system role that holds a sensitive permission requires MFA, whatever its flag says", () => {
  for (const r of SYSTEM_ROLES) {
    const holds = r.permissions.some(isSensitivePermission);
    assert.equal(mfaRequired({ roleRequiresMfa: r.requiresMfa, permissions: r.permissions, clearance: "STANDARD" }), r.requiresMfa || holds, r.code);
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { LOCKED_ROLE_CODES, SECURITY_ADMIN_PERMISSIONS, SYSTEM_ROLES, TECH_ADMIN_PERMISSIONS } from "../../src/server/rbac/roles";

/** Security audit, lot 1: administration is technical or security, never police operational command. */
const OPERATIONAL_MODULES = [
  "persons", "wanted", "biometric", "complaints", "cases", "investigations", "statements", "interviews", "transcripts",
  "evidence", "warrants", "arrests", "detention", "patrols", "incidents", "operations", "vehicles", "maintenance",
  "documents", "reports", "traffic", "cash", "hr", "officers", "alerts", "intake", "public", "statistics",
];
const role = (code: string) => SYSTEM_ROLES.find((r) => r.code === code)!;
const modulesOf = (perms: readonly string[]) => new Set(perms.map((p) => p.split(":")[0]));

test("the technical administrator holds no police operational permission", () => {
  const mods = modulesOf(role("SUPER_ADMIN").permissions);
  for (const m of OPERATIONAL_MODULES) assert.ok(!mods.has(m), `SUPER_ADMIN must not hold ${m}:*`);
  for (const p of ["warrants:approve", "wanted:approve", "detention:extend", "cases:view_sensitive", "documents:view_confidential"]) {
    assert.ok(!role("SUPER_ADMIN").permissions.includes(p as never), `SUPER_ADMIN must not hold ${p}`);
  }
  assert.deepEqual([...role("SUPER_ADMIN").permissions].sort(), [...TECH_ADMIN_PERMISSIONS].sort());
});

test("the security administrator holds no police operational permission either", () => {
  const mods = modulesOf(role("SECURITY_ADMIN").permissions);
  for (const m of OPERATIONAL_MODULES) assert.ok(!mods.has(m), `SECURITY_ADMIN must not hold ${m}:*`);
  assert.deepEqual([...role("SECURITY_ADMIN").permissions].sort(), [...SECURITY_ADMIN_PERMISSIONS].sort());
});

test("duties stay separated: the audit log and account management are not held by the technical administrator", () => {
  const tech = new Set<string>(role("SUPER_ADMIN").permissions);
  for (const p of ["audit:view", "audit:export", "users:create", "users:manage_status", "users:reset_password", "users:manage_sessions", "security:manage"]) {
    assert.ok(!tech.has(p), `SUPER_ADMIN must not hold ${p}`);
  }
  const sec = new Set<string>(role("SECURITY_ADMIN").permissions);
  for (const p of ["system:settings", "system:backup", "system:demo", "roles:manage", "org:manage"]) {
    assert.ok(!sec.has(p), `SECURITY_ADMIN must not hold ${p}`);
  }
});

test("both administrator roles require MFA, are national and are locked against edition", () => {
  for (const c of ["SUPER_ADMIN", "SECURITY_ADMIN"]) {
    assert.equal(role(c).requiresMfa, true, `${c} requires MFA`);
    assert.equal(role(c).scopeLevel, "NATIONAL");
    assert.ok(LOCKED_ROLE_CODES.includes(c), `${c} is locked`);
  }
});

test("operational approvals remain reachable by the police command so the platform cannot be locked out", () => {
  const holders = (p: string) => SYSTEM_ROLES.filter((r) => r.permissions.includes(p as never)).map((r) => r.code);
  for (const p of ["warrants:approve", "wanted:approve", "detention:extend"]) {
    const h = holders(p);
    assert.ok(h.includes("NATIONAL_COMMANDER"), `${p} is held by the national commander`);
    assert.ok(!h.includes("SUPER_ADMIN") && !h.includes("SECURITY_ADMIN"), `${p} is not held by an administrator`);
  }
});

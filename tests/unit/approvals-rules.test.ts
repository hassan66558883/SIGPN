import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { approvalsForAccount, covers, isClearanceRaise, isSensitiveRole, whyCannotDecide, type Approver, type ApprovalTarget, type PriorApproval } from "../../src/server/approvals/rules";
import { SYSTEM_ROLES } from "../../src/server/rbac/roles";

/** Lot 4: who needs how many approvals, and who may decide. */
const perms = (code: string) => SYSTEM_ROLES.find((r) => r.code === code)!.permissions;
const decider = (over: Partial<Approver> & { id: string }): Approver => ({ scopeLevel: "STATION", regionId: "R1", adminDepartmentId: "D1", stationIds: ["S1", "S1b"], permissions: new Set(["approvals:decide"]), ...over });
const account = (over: Partial<ApprovalTarget> = {}): ApprovalTarget => ({ kind: "USER_CREATE", requiredApprovals: 1, requestedById: "req", targetUserId: null, regionId: "R1", adminDepartmentId: "D1", stationId: "S1", ...over });

test("an ordinary account needs one approval; a sensitive role, an administrator role or a clearance needs two", () => {
  const two = (roleCode: string, clearance: "STANDARD" | "SENSITIVE" = "STANDARD") => approvalsForAccount({ roleCode, rolePermissions: perms(roleCode), clearance });
  for (const r of ["DESK_OFFICER", "PATROL_OFFICER", "INVESTIGATOR", "OFFICER", "TRAFFIC_CONTROL_AGENT", "CUSTODY_OFFICER"]) assert.equal(two(r), 1, r);
  for (const r of ["STATION_COMMANDER", "REGIONAL_COMMANDER", "NATIONAL_COMMANDER", "HR_DIRECTOR", "AUDITOR", "SUPER_ADMIN", "SECURITY_ADMIN"]) assert.equal(two(r), 2, r);
  assert.equal(two("DESK_OFFICER", "SENSITIVE"), 2, "an ordinary role with a clearance is sensitive");
  assert.ok(isSensitiveRole("SECURITY_ADMIN", []), "administrator roles are sensitive whatever they hold");
});

test("only a RAISE of a clearance is a decision; lowering takes effect at once", () => {
  assert.ok(isClearanceRaise("STANDARD", "SENSITIVE") && isClearanceRaise("SENSITIVE", "CONFIDENTIAL"));
  assert.ok(!isClearanceRaise("CONFIDENTIAL", "STANDARD") && !isClearanceRaise("SENSITIVE", "SENSITIVE"));
});

test("coverage: a commander decides inside their own scope only", () => {
  const t = { regionId: "R1", adminDepartmentId: "D1", stationId: "S1" };
  assert.ok(covers(decider({ id: "a", scopeLevel: "STATION" }), t));
  assert.ok(!covers(decider({ id: "a", scopeLevel: "STATION", stationIds: ["S2"] }), t), "another commissariat");
  assert.ok(covers(decider({ id: "a", scopeLevel: "DEPARTMENTAL", stationIds: ["S1", "S3"] }), t));
  assert.ok(covers(decider({ id: "a", scopeLevel: "REGIONAL" }), t) && !covers(decider({ id: "a", scopeLevel: "REGIONAL", regionId: "R2" }), t), "province");
  assert.ok(covers(decider({ id: "a", scopeLevel: "NATIONAL" }), t));
  assert.ok(covers(decider({ id: "a", scopeLevel: "DEPARTMENTAL", stationIds: [], adminDepartmentId: "D1" }), { regionId: "R1", adminDepartmentId: "D1", stationId: null }), "an account placed at department level");
});

test("nobody approves their own request or a request about their own account, and nobody votes twice", () => {
  assert.match(whyCannotDecide(decider({ id: "req" }), account(), []) ?? "", /yourself/);
  assert.match(whyCannotDecide(decider({ id: "me" }), account({ kind: "USER_ROLE_CHANGE", targetUserId: "me" }), []) ?? "", /your own account/);
  assert.match(whyCannotDecide(decider({ id: "x" }), account(), [{ approverId: "x", approverScope: "STATION", vote: "APPROVE" }]) ?? "", /already decided/);
  assert.match(whyCannotDecide(decider({ id: "x", permissions: new Set() }), account(), []) ?? "", /not authorised/);
  assert.equal(whyCannotDecide(decider({ id: "x" }), account(), []), null);
});

test("a station account is decided by the commander of that station or above, not by another commissariat", () => {
  assert.equal(whyCannotDecide(decider({ id: "chief" }), account(), []), null);
  assert.match(whyCannotDecide(decider({ id: "other", stationIds: ["S9"] }), account(), []) ?? "", /outside your authority/);
});

test("a sensitive account needs two DIFFERENT levels of the chain of command", () => {
  const sensitive = account({ requiredApprovals: 2 });
  const first: PriorApproval[] = [{ approverId: "chief", approverScope: "STATION", vote: "APPROVE" }];
  assert.match(whyCannotDecide(decider({ id: "chief2" }), sensitive, first) ?? "", /different level/, "two commissaires are not two levels");
  assert.equal(whyCannotDecide(decider({ id: "delegue", scopeLevel: "REGIONAL" }), sensitive, first), null, "a délégué provincial is another level");
  assert.equal(whyCannotDecide(decider({ id: "dg", scopeLevel: "NATIONAL" }), sensitive, first), null);
  // a rejection does not count as a level already used
  assert.equal(whyCannotDecide(decider({ id: "chief2" }), sensitive, [{ approverId: "r", approverScope: "STATION", vote: "REJECT" }]), null);
});

test("a national target, and a change to a role's permissions, need approvers with national authority", () => {
  const national = account({ regionId: null, adminDepartmentId: null, stationId: null, requiredApprovals: 2 });
  assert.match(whyCannotDecide(decider({ id: "chief" }), national, []) ?? "", /national/);
  assert.match(whyCannotDecide(decider({ id: "delegue", scopeLevel: "REGIONAL" }), national, []) ?? "", /national/);
  const a = decider({ id: "n1", scopeLevel: "NATIONAL" });
  assert.equal(whyCannotDecide(a, national, []), null);
  assert.equal(whyCannotDecide(decider({ id: "n2", scopeLevel: "NATIONAL" }), national, [{ approverId: "n1", approverScope: "NATIONAL", vote: "APPROVE" }]), null, "two distinct national approvers suffice");
  const roleChange = account({ kind: "ROLE_PERMISSIONS_ADD", regionId: null, adminDepartmentId: null, stationId: null, requiredApprovals: 2 });
  assert.match(whyCannotDecide(decider({ id: "chief" }), roleChange, []) ?? "", /national/);
});

test("after a reassignment, one supervisor of the NEW unit gives the sensitive permissions back; the old unit and the person cannot", () => {
  // the request is for the new placement (station S2), requested by the person (also its target)
  const restore = account({ kind: "USER_CLEARANCE_RESTORE", requestedById: "moved", targetUserId: "moved", stationId: "S2", requiredApprovals: 1 });
  assert.equal(whyCannotDecide(decider({ id: "newChief", stationIds: ["S2"] }), restore, []), null, "the commander of the new unit");
  assert.equal(whyCannotDecide(decider({ id: "oldChief", stationIds: ["S1"] }), restore, []) !== null, true, "the commander of the old unit has no authority");
  assert.match(whyCannotDecide(decider({ id: "moved", stationIds: ["S2"] }), restore, []) ?? "", /yourself/);
  assert.equal(whyCannotDecide(decider({ id: "delegue", scopeLevel: "REGIONAL" }), restore, []), null, "a délégué provincial above the new unit");
});

/** The direct write functions are executors of the approval service: nothing else may call them, or the workflow could be bypassed. */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}
test("no code path writes an account, a role change or a role's permissions around the approval service", () => {
  const files = walk(join(__dirname, "../../src")).filter((f) => !f.includes(`${join("src", "generated")}`));
  const allowed = new Set(["approvals/service.ts", "admin/users.ts", "admin/roles.ts"].map((f) => join("src", "server", f)));
  const offenders: string[] = [];
  for (const f of files) {
    const rel = f.slice(f.indexOf("src"));
    if (allowed.has(rel)) continue;
    const text = readFileSync(f, "utf8");
    if (/\b(users\.(createUser|updateUser)|roles\.setRolePermissions)\(/.test(text)) offenders.push(`${rel}: namespace call`);
    for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@\/server\/admin\/(users|roles)"/g)) {
      if (/\b(createUser|updateUser|setRolePermissions)\b/.test(m[1])) offenders.push(`${rel}: imports a direct writer`);
    }
  }
  assert.deepEqual(offenders, []);
});

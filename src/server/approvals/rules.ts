/**
 * Security audit, lot 4 — the rules of the approval workflow, as pure functions (no database, easy to test).
 *
 * Decision 6: double approval only for sensitive roles and special permissions; an ordinary account needs one authorised approval.
 * Decision 8: the approver is the commander whose scope covers the account (the commissaire for a station account, the
 * délégué provincial for a provincial one); a sensitive account needs two approvers from different levels of the chain.
 */
import { CLEARANCE_RANK, isSensitivePermission, type Clearance } from "@/server/rbac/sensitivity";

export const APPROVAL_TTL_DAYS = 7;

export type ApprovalKindName = "USER_CREATE" | "USER_ROLE_CHANGE" | "USER_CLEARANCE_RAISE" | "ROLE_PERMISSIONS_ADD";
export type ScopeName = "NATIONAL" | "REGIONAL" | "DEPARTMENTAL" | "STATION" | "OWN";

/** The two administrator roles can never be granted on a single approval, whatever permissions they hold. */
const ADMIN_ROLE_CODES = new Set(["SUPER_ADMIN", "SECURITY_ADMIN"]);

export function isSensitiveRole(roleCode: string, permissionCodes: Iterable<string>): boolean {
  if (ADMIN_ROLE_CODES.has(roleCode)) return true;
  for (const c of permissionCodes) if (isSensitivePermission(c)) return true;
  return false;
}

/** How many approvals an account creation or a role change needs. */
export function approvalsForAccount(input: { roleCode: string; rolePermissions: Iterable<string>; clearance: Clearance }): 1 | 2 {
  return isSensitiveRole(input.roleCode, input.rolePermissions) || input.clearance !== "STANDARD" ? 2 : 1;
}

/** A clearance is only a decision when it is RAISED; lowering or withdrawing one takes effect at once. */
export const isClearanceRaise = (from: Clearance, to: Clearance): boolean => CLEARANCE_RANK[to] > CLEARANCE_RANK[from];

export type Approver = {
  id: string;
  scopeLevel: ScopeName;
  regionId: string | null;
  adminDepartmentId: string | null;
  stationIds: string[] | null;
  permissions: ReadonlySet<string>;
};
export type ApprovalTarget = {
  kind: ApprovalKindName;
  requiredApprovals: number;
  requestedById: string;
  targetUserId: string | null;
  regionId: string | null;
  adminDepartmentId: string | null;
  stationId: string | null;
};
export type PriorApproval = { approverId: string; approverScope: ScopeName; vote: "APPROVE" | "REJECT" };

export const isPlaced = (t: Pick<ApprovalTarget, "regionId" | "adminDepartmentId" | "stationId">): boolean => !!(t.regionId || t.adminDepartmentId || t.stationId);

/** Same semantics as `inScope` of the data-access layer, extended to accounts placed at department or province level only. */
export function covers(approver: Approver, t: Pick<ApprovalTarget, "regionId" | "adminDepartmentId" | "stationId">): boolean {
  if (approver.scopeLevel === "NATIONAL") return true;
  if (approver.scopeLevel === "REGIONAL") return !!approver.regionId && t.regionId === approver.regionId;
  if (approver.scopeLevel === "DEPARTMENTAL") return (!!t.stationId && !!approver.stationIds?.includes(t.stationId)) || (!!approver.adminDepartmentId && !t.stationId && t.adminDepartmentId === approver.adminDepartmentId);
  return !!t.stationId && !!approver.stationIds?.includes(t.stationId);
}

/** Why this person cannot decide this request (null = they can). The text is an English message key of the error catalogue. */
export function whyCannotDecide(approver: Approver, req: ApprovalTarget, prior: PriorApproval[]): string | null {
  if (!approver.permissions.has("approvals:decide")) return "You are not authorised to decide approvals.";
  if (approver.id === req.requestedById) return "You cannot decide a request you made yourself.";
  if (req.targetUserId && approver.id === req.targetUserId) return "You cannot decide a request about your own account.";
  if (prior.some((p) => p.approverId === approver.id)) return "You have already decided this request.";
  if (req.kind === "ROLE_PERMISSIONS_ADD" || !isPlaced(req)) {
    if (approver.scopeLevel !== "NATIONAL") return "This request needs an approver with national authority.";
  } else if (!covers(approver, req)) {
    return "This request is outside your authority.";
  }
  // Two approvals for a placed account: two DIFFERENT levels of the chain (a commissaire and a délégué, not two commissaires).
  if (req.requiredApprovals >= 2 && isPlaced(req) && req.kind !== "ROLE_PERMISSIONS_ADD") {
    if (prior.some((p) => p.vote === "APPROVE" && p.approverScope === approver.scopeLevel)) return "The second approval must come from a different level of the chain of command.";
  }
  return null;
}

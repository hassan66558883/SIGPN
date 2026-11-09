import type { Permission } from "@/server/rbac/permissions";

/**
 * Security audit, lot 3 — sensitivity and clearance (decisions 4, 5 and 7).
 *
 * Sensitive permissions: a user can only use one if they are cleared for it, and holding one makes multi-factor
 * authentication mandatory. The tiers are PROVISIONAL (standard, sensitive, confidential) until the Direction supplies the
 * official levels. Record tiers use the flags that already exist: a case or evidence item flagged sensitive is SENSITIVE,
 * a restricted or confidential document is CONFIDENTIAL.
 */
export const CLEARANCE_LEVELS = ["STANDARD", "SENSITIVE", "CONFIDENTIAL"] as const;
export type Clearance = (typeof CLEARANCE_LEVELS)[number];
export const CLEARANCE_RANK: Record<Clearance, number> = { STANDARD: 0, SENSITIVE: 1, CONFIDENTIAL: 2 };

/** Keep in step with the backfill of the migration 20261109160000_user_clearance. */
export const SENSITIVE_PERMISSIONS: readonly Permission[] = [
  // approvals and decisions with legal effect
  "warrants:approve",
  "wanted:approve",
  "wanted:publish",
  "detention:extend",
  // roles and permissions, and the approval of such changes
  "roles:manage",
  "approvals:decide",
  // sensitive and confidential records
  "cases:view_sensitive",
  "documents:view_confidential",
  // human resources: discipline and pay
  "hr:discipline_view",
  "hr:discipline_manage",
  "hr:discipline_decide",
  "hr:pay_view",
  "hr:pay_manage",
  "hr:pay_validate",
  "hr:pay_export",
  // export of data
  "reports:export",
  "audit:export",
  "wanted:export",
  "traffic:export",
  "system:backup",
];
const SENSITIVE = new Set<string>(SENSITIVE_PERMISSIONS);

export const isSensitivePermission = (code: string): boolean => SENSITIVE.has(code);

/** Clearance needed to USE a permission. */
export function requiredClearance(code: string): Clearance {
  if (code === "documents:view_confidential") return "CONFIDENTIAL";
  return SENSITIVE.has(code) ? "SENSITIVE" : "STANDARD";
}

export const isCleared = (held: Clearance, needed: Clearance): boolean => CLEARANCE_RANK[held] >= CLEARANCE_RANK[needed];

/** The permissions a user can actually use: sensitive ones need the matching clearance. */
export function usablePermissions(permissions: Iterable<string>, clearance: Clearance): Set<string> {
  const out = new Set<string>();
  for (const code of permissions) if (isCleared(clearance, requiredClearance(code))) out.add(code);
  return out;
}

/** The clearance a role implies (used to set the clearance of the first accounts, and as the suggestion in the user form). */
export function impliedClearance(permissions: Iterable<string>): Clearance {
  let level: Clearance = "STANDARD";
  for (const code of permissions) {
    const needed = requiredClearance(code);
    if (CLEARANCE_RANK[needed] > CLEARANCE_RANK[level]) level = needed;
  }
  return level;
}

/**
 * Multi-factor authentication is mandatory when the role says so, OR the role holds a sensitive permission, OR the user
 * holds a clearance above standard. Ordinary accounts without any of these may keep it optional.
 */
export function mfaRequired(input: { roleRequiresMfa: boolean; permissions: Iterable<string>; clearance: Clearance }): boolean {
  if (input.roleRequiresMfa || input.clearance !== "STANDARD") return true;
  for (const code of input.permissions) if (SENSITIVE.has(code)) return true;
  return false;
}

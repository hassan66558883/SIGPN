import { LOCKED_ROLE_CODES } from "@/server/rbac/roles";

/**
 * Who may hand out which role: ONE rule for the server guard and for the role list of the user forms (they drifted apart once:
 * the security administrator was allowed to grant operational roles by the guard, yet the form did not offer them).
 *
 * A role can be granted by an actor who holds every one of its permissions ("cannot grant what you do not hold"), except that the
 * security administrator (`security:manage`) provisions accounts without holding police permissions: granting is not holding. The two
 * administrator roles always stay under the first rule. The approval workflow decides what is finally created.
 */
export function permissionsMissingToGrant(actor: { permissions: ReadonlySet<string> }, role: { code: string; permissionCodes: readonly string[] }): string[] {
  if (actor.permissions.has("security:manage") && !LOCKED_ROLE_CODES.includes(role.code)) return [];
  return role.permissionCodes.filter((c) => !actor.permissions.has(c));
}

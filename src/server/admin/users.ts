import "server-only";
import { z } from "zod";
import type { UserStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError, NotFoundError } from "@/server/errors";
import { hashPassword, passwordPolicyErrors } from "@/server/auth/password";
import { revokeAllSessions } from "@/server/auth/session";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import { optionalText } from "@/server/action-utils";
import type { RequestContext } from "@/server/request-context";
import { notify } from "@/server/notifications";
import { LOCKED_ROLE_CODES } from "@/server/rbac/roles";
import { CLEARANCE_LEVELS } from "@/server/rbac/sensitivity";

export const userCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9._-]+$/i, "letters, digits, dot, dash, underscore only")
    .transform((s) => s.toLowerCase()),
  email: z.string().trim().email().max(120).transform((s) => s.toLowerCase()),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: optionalText(30),
  roleId: z.string().min(1, "role is required"),
  regionId: optionalText(64),
  adminDepartmentId: optionalText(64),
  stationId: optionalText(64),
  officerId: optionalText(64),
  temporaryPassword: z.string().min(1).max(200),
  /** Security clearance (lot 3). Empty = standard on creation, unchanged on update. Only the security administrator can set it. */
  clearance: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.enum(CLEARANCE_LEVELS).optional()),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = userCreateSchema.omit({ username: true, temporaryPassword: true });
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

const publicUser = {
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  status: true,
  clearance: true,
  mfaEnabled: true,
  mustChangePassword: true,
  failedLoginCount: true,
  lockedUntil: true,
  lastLoginAt: true,
  lastLoginIp: true,
  passwordChangedAt: true,
  createdAt: true,
  updatedAt: true,
  roleId: true,
  role: { select: { id: true, code: true, name: true, scopeLevel: true, requiresMfa: true } },
  regionId: true,
  region: { select: { id: true, name: true } },
  adminDepartmentId: true,
  adminDepartment: { select: { id: true, name: true } },
  stationId: true,
  station: { select: { id: true, name: true, code: true } },
  officer: { select: { id: true, badgeNumber: true } },
} as const;

/** Privilege-escalation guard: an actor may only grant a role whose permissions are a subset of their own. */
export async function assertCanGrantRole(actor: Actor, roleId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true, code: true, isActive: true, scopeLevel: true, permissions: { select: { permission: { select: { code: true } } } } } });
  if (!role || !role.isActive) throw new BusinessError("Selected role is invalid or inactive.");
  // Separation of duties (security audit, lot 1): the security administrator provisions accounts without holding police permissions
  // (granting is not holding). The two administrator roles stay under the "cannot grant what you do not hold" rule. Lot 4 adds approval.
  const grantsWithoutHolding = actor.permissions.has("security:manage") && !LOCKED_ROLE_CODES.includes(role.code);
  const excess = grantsWithoutHolding ? [] : role.permissions.map((p) => p.permission.code).filter((c) => !actor.permissions.has(c));
  if (excess.length > 0) throw new BusinessError(`You cannot grant the role "${role.code}": it holds permissions you do not have (${excess.slice(0, 3).join(", ")}${excess.length > 3 ? "…" : ""}).`, "STATE");
  if (actor.scopeLevel !== "NATIONAL" && role.scopeLevel === "NATIONAL") throw new BusinessError("Only national-scope administrators can grant national roles.", "STATE");
  return role;
}

/** A security clearance is a security decision: only the security administrator grants or changes it, never one's own. */
export function assertCanSetClearance(actor: Actor) {
  if (!actor.permissions.has("security:manage")) throw new BusinessError("Only the security administrator can grant or change a security clearance.", "STATE");
}

/** Scope guard for the target user's placement: a regional admin can only place users inside their region, etc. */
export function assertPlacementInScope(actor: Actor, placement: { regionId: string | null; stationId: string | null }) {
  if (actor.scopeLevel === "NATIONAL") return;
  if (!inScope(actor, placement)) throw new BusinessError("You can only manage users inside your own region/station.", "STATE");
}

/** Resolves and validates the territorial placement: station ⇒ department/province derived; department ⇒ province derived. */
export async function resolvePlacement(input: { regionId?: string; adminDepartmentId?: string; stationId?: string }) {
  const stationId = input.stationId || null;
  let adminDepartmentId = input.adminDepartmentId || null;
  let regionId = input.regionId || null;
  if (stationId) {
    const st = await prisma.station.findUnique({ where: { id: stationId }, select: { regionId: true, adminDepartmentId: true, isActive: true } });
    if (!st || !st.isActive) throw new BusinessError("Selected station is invalid.");
    regionId = st.regionId;
    adminDepartmentId = st.adminDepartmentId ?? adminDepartmentId;
  }
  if (adminDepartmentId) {
    const d = await prisma.adminDepartment.findUnique({ where: { id: adminDepartmentId }, select: { regionId: true, isActive: true } });
    if (!d || !d.isActive) throw new BusinessError("Selected department is invalid.");
    if (regionId && regionId !== d.regionId && !stationId) throw new BusinessError("The department must belong to the selected province.");
    regionId = regionId ?? d.regionId;
  } else if (regionId) {
    const rg = await prisma.region.findUnique({ where: { id: regionId }, select: { id: true } });
    if (!rg) throw new BusinessError("Selected province is invalid.");
  }
  return { regionId, adminDepartmentId, stationId };
}

export async function listUsers(actor: Actor, filter: { q?: string; status?: UserStatus; roleId?: string; stationId?: string; page?: number; pageSize?: number } = {}) {
  const page = filter.page ?? 1;
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const where = {
    deletedAt: null,
    ...scopeWhere(actor),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.roleId ? { roleId: filter.roleId } : {}),
    ...(filter.stationId ? { stationId: filter.stationId } : {}),
    ...(filter.q
      ? { OR: [{ username: { contains: filter.q, mode: "insensitive" as const } }, { email: { contains: filter.q, mode: "insensitive" as const } }, { firstName: { contains: filter.q, mode: "insensitive" as const } }, { lastName: { contains: filter.q, mode: "insensitive" as const } }] }
      : {}),
  };
  const [items, total] = await Promise.all([prisma.user.findMany({ where, select: publicUser, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], skip: (page - 1) * pageSize, take: pageSize }), prisma.user.count({ where })]);
  return { items, total, page, pageSize };
}

export async function getUser(actor: Actor, id: string) {
  const u = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: publicUser });
  if (!u || !inScope(actor, u)) throw new NotFoundError("User");
  return u;
}

/**
 * Every check of an account creation, without writing anything. Used when the creation is requested (so a doomed request is
 * refused at once) and again when it is executed after approval. `passwordHash` = the temporary password was already
 * checked against the policy and hashed when the request was made.
 */
export async function checkUserCreation(actor: Actor, input: UserCreateInput, opts: { passwordHash?: string } = {}) {
  const role = await assertCanGrantRole(actor, input.roleId);
  const clearance = input.clearance ?? "STANDARD";
  if (clearance !== "STANDARD") assertCanSetClearance(actor);
  const placement = await resolvePlacement(input);
  assertPlacementInScope(actor, placement);
  if (role.scopeLevel === "REGIONAL" && !placement.regionId) throw new BusinessError("A regional role requires a region.");
  if (role.scopeLevel === "DEPARTMENTAL" && !placement.adminDepartmentId) throw new BusinessError("A departmental role requires an administrative department.");
  if ((role.scopeLevel === "STATION" || role.scopeLevel === "OWN") && !placement.stationId) throw new BusinessError("A station-scoped role requires a station.");
  if (!opts.passwordHash) {
    const pwErrors = passwordPolicyErrors(input.temporaryPassword, { username: input.username, email: input.email });
    if (pwErrors.length) throw new BusinessError(`Temporary password does not meet the policy: ${pwErrors.join("; ")}.`);
  }
  const dup = await prisma.user.findFirst({ where: { OR: [{ username: input.username }, { email: input.email }] }, select: { id: true, username: true } });
  if (dup) throw new BusinessError(dup.username === input.username ? "This username is already taken." : "This e-mail is already registered.", "CONFLICT");
  if (input.officerId) {
    const off = await prisma.officer.findFirst({ where: { id: input.officerId, deletedAt: null }, select: { userId: true } });
    if (!off) throw new BusinessError("Selected officer does not exist.");
    if (off.userId) throw new BusinessError("This officer already has a user account.", "CONFLICT");
  }
  return { role, placement, clearance };
}

/** Creates the account. Direct write: callers go through the approval workflow (`submitUserCreate`), which replays this after approval. */
export async function createUser(actor: Actor, input: UserCreateInput, ctx: RequestContext, opts: { passwordHash?: string } = {}) {
  const { role, placement, clearance } = await checkUserCreation(actor, input, opts);
  const created = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        username: input.username,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone || null,
        passwordHash: opts.passwordHash ?? (await hashPassword(input.temporaryPassword)),
        mustChangePassword: true,
        clearance,
        roleId: role.id,
        regionId: placement.regionId,
        adminDepartmentId: placement.adminDepartmentId,
        stationId: placement.stationId,
        organizationId: actor.organizationId,
        createdById: actor.id,
      },
      select: publicUser,
    });
    if (input.officerId) await tx.officer.update({ where: { id: input.officerId }, data: { userId: u.id } });
    await logAudit({ actor, action: "USER_CREATED", module: "users", entityType: "User", entityId: u.id, entityLabel: u.username, summary: `Created user ${u.username} (${role.code})`, after: u, context: ctx }, tx);
    return u;
  });
  return created;
}

export async function updateUser(actor: Actor, id: string, input: UserUpdateInput, ctx: RequestContext) {
  const before = await getUser(actor, id);
  const roleChanged = before.roleId !== input.roleId;
  const clearanceChanged = input.clearance !== undefined && input.clearance !== before.clearance;
  if (clearanceChanged) {
    if (id === actor.id) throw new BusinessError("You cannot change your own security clearance.", "STATE");
    assertCanSetClearance(actor);
  }
  if (roleChanged) {
    if (id === actor.id) throw new BusinessError("You cannot change your own role.", "STATE");
    await assertCanGrantRole(actor, input.roleId);
    if (LOCKED_ROLE_CODES.includes(before.role.code)) {
      const admins = await prisma.user.count({ where: { role: { code: before.role.code }, status: "ACTIVE", deletedAt: null } });
      if (admins <= 1) throw new BusinessError("Cannot demote the last active system administrator.", "STATE");
    }
  }
  const placement = await resolvePlacement(input);
  assertPlacementInScope(actor, placement);
  const dup = await prisma.user.findFirst({ where: { email: input.email, id: { not: id } }, select: { id: true } });
  if (dup) throw new BusinessError("This e-mail is already registered.", "CONFLICT");
  const after = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id },
      data: { email: input.email, firstName: input.firstName, lastName: input.lastName, phone: input.phone || null, roleId: input.roleId, ...(clearanceChanged ? { clearance: input.clearance } : {}), regionId: placement.regionId, adminDepartmentId: placement.adminDepartmentId, stationId: placement.stationId },
      select: publicUser,
    });
    if (input.officerId !== undefined) {
      await tx.officer.updateMany({ where: { userId: id, id: { not: input.officerId || "__none__" } }, data: { userId: null } });
      if (input.officerId) {
        const off = await tx.officer.findFirst({ where: { id: input.officerId, deletedAt: null }, select: { userId: true } });
        if (!off) throw new BusinessError("Selected officer does not exist.");
        if (off.userId && off.userId !== id) throw new BusinessError("This officer already has a user account.", "CONFLICT");
        await tx.officer.update({ where: { id: input.officerId }, data: { userId: id } });
      }
    }
    if (roleChanged || clearanceChanged) await revokeAllSessions(id, roleChanged ? "role_changed" : "clearance_changed", null, tx);
    if (clearanceChanged) await logAudit({ actor, action: "USER_CLEARANCE_CHANGED", module: "users", entityType: "User", entityId: id, entityLabel: u.username, summary: `Security clearance of ${u.username}: ${before.clearance} → ${input.clearance}; sessions revoked`, before: { clearance: before.clearance }, after: { clearance: input.clearance }, context: ctx }, tx);
    await logAudit({ actor, action: roleChanged ? "USER_ROLE_CHANGED" : "USER_UPDATED", module: "users", entityType: "User", entityId: id, entityLabel: u.username, summary: roleChanged ? `Role of ${u.username} changed ${before.role.code} → ${u.role.code}; sessions revoked` : `Updated user ${u.username}`, before, after: u, context: ctx }, tx);
    return u;
  });
  if (roleChanged) await notify({ userId: id, kind: "SECURITY", title: "Your role was changed", body: `Your role is now ${after.role.name}. Please sign in again.` });
  else if (clearanceChanged) await notify({ userId: id, kind: "SECURITY", title: "Your security clearance was changed", body: "Your access to sensitive records changed. Please sign in again." });
  return after;
}

const STATUS_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
  PENDING: ["ACTIVE", "DISABLED"],
  ACTIVE: ["SUSPENDED", "DISABLED"],
  LOCKED: ["ACTIVE", "SUSPENDED", "DISABLED"],
  SUSPENDED: ["ACTIVE", "DISABLED"],
  DISABLED: ["ACTIVE"],
};

export async function setUserStatus(actor: Actor, id: string, status: UserStatus, reason: string, ctx: RequestContext) {
  if (id === actor.id) throw new BusinessError("You cannot change your own account status.", "STATE");
  const u = await getUser(actor, id);
  if (!STATUS_TRANSITIONS[u.status].includes(status)) throw new BusinessError(`Cannot move an account from ${u.status} to ${status}.`, "STATE");
  if (LOCKED_ROLE_CODES.includes(u.role.code) && status !== "ACTIVE") {
    const admins = await prisma.user.count({ where: { role: { code: u.role.code }, status: "ACTIVE", deletedAt: null, id: { not: id } } });
    if (admins < 1) throw new BusinessError("Cannot deactivate the last active system administrator.", "STATE");
  }
  await prisma.$transaction(async (tx) => {
    const r = await tx.user.updateMany({ where: { id, status: u.status }, data: { status, lockedUntil: null, failedLoginCount: 0 } });
    if (r.count !== 1) throw new BusinessError("The account was modified concurrently. Reload and retry.", "CONFLICT");
    if (status !== "ACTIVE") await revokeAllSessions(id, `status_${status.toLowerCase()}`, null, tx);
    await logAudit({ actor, action: `USER_${status}`, module: "users", entityType: "User", entityId: id, entityLabel: u.username, summary: `${u.username}: ${u.status} → ${status}${reason ? ` (${reason})` : ""}`, before: { status: u.status }, after: { status, reason }, context: ctx }, tx);
  });
}

export async function revokeUserSessions(actor: Actor, id: string, ctx: RequestContext): Promise<number> {
  const u = await getUser(actor, id);
  const n = await revokeAllSessions(id, "admin_revoked");
  await logAudit({ actor, action: "USER_SESSIONS_REVOKED", module: "users", entityType: "User", entityId: id, entityLabel: u.username, summary: `Revoked ${n} session(s) of ${u.username}`, context: ctx });
  return n;
}

export async function resetUserMfa(actor: Actor, id: string, ctx: RequestContext) {
  const u = await getUser(actor, id);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { mfaEnabled: false, mfaSecretEnc: null, mfaEnrolledAt: null } });
    await tx.mfaRecoveryCode.deleteMany({ where: { userId: id } });
    await revokeAllSessions(id, "mfa_reset", null, tx);
    await logAudit({ actor, action: "USER_MFA_RESET", module: "users", entityType: "User", entityId: id, entityLabel: u.username, summary: `MFA reset for ${u.username}; they must enrol again`, context: ctx }, tx);
  });
  await notify({ userId: id, kind: "SECURITY", title: "Your MFA was reset", body: "An administrator reset your authenticator. You will be asked to enrol again at next sign-in." });
}

export async function listUserSessions(actor: Actor, id: string) {
  await getUser(actor, id);
  return prisma.session.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, ipAddress: true, userAgent: true, createdAt: true, lastSeenAt: true, expiresAt: true, revokedAt: true, revokedReason: true, mfaVerified: true } });
}

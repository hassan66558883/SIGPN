import "server-only";
import { cache } from "react";
import { forbidden, redirect, unauthorized } from "next/navigation";
import type { ScopeLevel } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError } from "@/server/errors";
import { getSessionToken, resolveSession } from "@/server/auth/session";
import type { Permission } from "@/server/rbac/permissions";
import { mfaRequired, usablePermissions, type Clearance } from "@/server/rbac/sensitivity";

/**
 * Authorization principle: Role + Organizational scope + Permission.
 * - permissions: what the actor may do (from the role)
 * - scopeLevel + regionId / adminDepartmentId / stationIds: where the actor may do it
 *   NATIONAL → everywhere · REGIONAL → one province · DEPARTMENTAL → all stations of one administrative
 *   department · STATION/OWN → the actor's station **and its child posts/units** (stationIds).
 */
export type Actor = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  scopeLevel: ScopeLevel;
  /** Multi-factor authentication is mandatory: the role says so, OR it holds a sensitive permission, OR the user is cleared above standard (lot 3). */
  roleRequiresMfa: boolean;
  /** Security clearance of the user (provisional tiers). */
  clearance: Clearance;
  /** What the actor can actually do: the role's permissions, minus the sensitive ones the actor is not cleared for. */
  permissions: ReadonlySet<string>;
  organizationId: string | null;
  regionId: string | null;
  regionName: string | null;
  adminDepartmentId: string | null;
  adminDepartmentName: string | null;
  stationId: string | null;
  stationName: string | null;
  /** Station ids visible to a DEPARTMENTAL / STATION / OWN actor (own station + descendants, or all stations of the department). null = not station-restricted. */
  stationIds: string[] | null;
  officerId: string | null;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  mustChangePassword: boolean;
  sessionId: string | null;
  authMethod: "session" | "api_key";
};

const userSelect = {
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true,
  deletedAt: true,
  mfaEnabled: true,
  clearance: true,
  mustChangePassword: true,
  organizationId: true,
  regionId: true,
  adminDepartmentId: true,
  stationId: true,
  region: { select: { name: true } },
  adminDepartment: { select: { name: true } },
  station: { select: { name: true } },
  officer: { select: { id: true } },
  role: { select: { id: true, code: true, name: true, scopeLevel: true, requiresMfa: true, isActive: true, permissions: { select: { permission: { select: { code: true } } } } } },
} as const;

type UserRow = NonNullable<Awaited<ReturnType<typeof loadUserRow>>>;

export async function loadUserRow(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: userSelect });
}

/** Own station plus every descendant post/unit (recursive), regardless of status. */
export async function stationDescendantIds(stationId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE tree AS (
      SELECT id FROM "Station" WHERE id = ${stationId}
      UNION ALL
      SELECT s.id FROM "Station" s JOIN tree t ON s."parentId" = t.id
    )
    SELECT id FROM tree`;
  return rows.map((r) => r.id);
}

export async function departmentStationIds(adminDepartmentId: string): Promise<string[]> {
  const rows = await prisma.station.findMany({ where: { adminDepartmentId }, select: { id: true } });
  return rows.map((r) => r.id);
}

export async function buildActor(u: UserRow, session: { id: string | null; mfaVerified: boolean }, authMethod: Actor["authMethod"]): Promise<Actor | null> {
  if (!u || u.deletedAt || u.status !== "ACTIVE" || !u.role.isActive) return null;
  let stationIds: string[] | null = null;
  if (u.role.scopeLevel === "STATION" || u.role.scopeLevel === "OWN") stationIds = u.stationId ? await stationDescendantIds(u.stationId) : [];
  else if (u.role.scopeLevel === "DEPARTMENTAL") stationIds = u.adminDepartmentId ? await departmentStationIds(u.adminDepartmentId) : [];
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: `${u.firstName} ${u.lastName}`,
    roleId: u.role.id,
    roleCode: u.role.code,
    roleName: u.role.name,
    scopeLevel: u.role.scopeLevel,
    roleRequiresMfa: mfaRequired({ roleRequiresMfa: u.role.requiresMfa, permissions: u.role.permissions.map((p) => p.permission.code), clearance: u.clearance }),
    clearance: u.clearance,
    permissions: usablePermissions(
      u.role.permissions.map((p) => p.permission.code),
      u.clearance,
    ),
    organizationId: u.organizationId,
    regionId: u.regionId,
    regionName: u.region?.name ?? null,
    adminDepartmentId: u.adminDepartmentId,
    adminDepartmentName: u.adminDepartment?.name ?? null,
    stationId: u.stationId,
    stationName: u.station?.name ?? null,
    stationIds,
    officerId: u.officer?.id ?? null,
    mfaEnabled: u.mfaEnabled,
    mfaVerified: session.mfaVerified,
    mustChangePassword: u.mustChangePassword,
    sessionId: session.id,
    authMethod,
  };
}

/** Current actor from the session cookie (request-scoped cache). */
export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await resolveSession(await getSessionToken());
  if (!session) return null;
  const u = await loadUserRow(session.userId);
  if (!u) return null;
  return buildActor(u, { id: session.id, mfaVerified: session.mfaVerified }, "session");
});

export function can(actor: Pick<Actor, "permissions">, permission: Permission): boolean {
  return actor.permissions.has(permission);
}

export function canAny(actor: Pick<Actor, "permissions">, permissions: Permission[]): boolean {
  return permissions.some((p) => actor.permissions.has(p));
}

/** True when the actor still has to complete an onboarding/security step before using the app. */
export function pendingSecurityStep(actor: Actor): "password" | "mfa_enrol" | "mfa_verify" | null {
  if (actor.authMethod === "api_key") return null;
  if (actor.mustChangePassword) return "password";
  if (actor.mfaEnabled && !actor.mfaVerified) return "mfa_verify";
  if (actor.roleRequiresMfa && !actor.mfaEnabled) return "mfa_enrol";
  return null;
}

// ---------- Page helpers (redirect / interrupt) ----------

export async function requireActor(opts: { allowPending?: boolean } = {}): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (!opts.allowPending) {
    const step = pendingSecurityStep(actor);
    if (step === "password") redirect("/account/password?forced=1");
    if (step === "mfa_enrol") redirect("/account/mfa?forced=1");
    if (step === "mfa_verify") redirect("/login?mfa=1");
  }
  return actor;
}

export async function requirePermission(permission: Permission): Promise<Actor> {
  const actor = await requireActor();
  if (!can(actor, permission)) {
    await logAudit({ actor, action: "ACCESS_DENIED", module: permission.split(":")[0], outcome: "DENIED", summary: `Page access denied: permission ${permission} required (role ${actor.roleCode})` });
    forbidden();
  }
  return actor;
}

export async function requireActorOrUnauthorized(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) unauthorized();
  return actor;
}

// ---------- Server-action helpers (throw) ----------

export async function requireActorForAction(opts: { allowPending?: boolean } = {}): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new AuthError("unauthenticated");
  if (!opts.allowPending) {
    const step = pendingSecurityStep(actor);
    if (step === "password") throw new AuthError("password_change_required");
    if (step) throw new AuthError("mfa_required");
  }
  return actor;
}

export async function requirePermissionForAction(permission: Permission, actorIn?: Actor): Promise<Actor> {
  const actor = actorIn ?? (await requireActorForAction());
  if (!can(actor, permission)) {
    await logAudit({ actor, action: "ACCESS_DENIED", module: permission.split(":")[0], outcome: "DENIED", summary: `Action denied: permission ${permission} required (role ${actor.roleCode})` });
    throw new AuthError("forbidden", `Permission ${permission} required`);
  }
  return actor;
}

// ---------- Scope helpers ----------

export type ScopeFields = {
  /** column holding the station id (default "stationId") */
  stationId?: string;
  /** column holding the province id (default "regionId"); set `via: "station"` when the table has no province column */
  regionId?: string;
  /** "column" (default) filters REGIONAL actors on the province column; "station" filters through the `station` relation */
  via?: "column" | "station";
};

const NONE = "__none__";

/**
 * Prisma where-fragment restricting rows to the actor's organizational scope.
 * STATION/OWN and DEPARTMENTAL actors are restricted to `stationIds`; REGIONAL to their province; NATIONAL unrestricted.
 */
export function scopeWhere(actor: Actor, fields: ScopeFields = {}): Record<string, unknown> {
  const stationField = fields.stationId ?? "stationId";
  const regionField = fields.regionId ?? "regionId";
  switch (actor.scopeLevel) {
    case "NATIONAL":
      return {};
    case "REGIONAL":
      return fields.via === "station" ? { station: { regionId: actor.regionId ?? NONE } } : { [regionField]: actor.regionId ?? NONE };
    case "DEPARTMENTAL":
    case "STATION":
    case "OWN":
      return { [stationField]: { in: actor.stationIds && actor.stationIds.length ? actor.stationIds : [NONE] } };
  }
}

/** Whether a record located at (stationId, regionId) is inside the actor's scope. */
export function inScope(actor: Actor, rec: { stationId?: string | null; regionId?: string | null }): boolean {
  switch (actor.scopeLevel) {
    case "NATIONAL":
      return true;
    case "REGIONAL":
      return !!actor.regionId && rec.regionId === actor.regionId;
    default:
      return !!rec.stationId && !!actor.stationIds && actor.stationIds.includes(rec.stationId);
  }
}

/** Whether the actor may administer master data of a province (NATIONAL, or REGIONAL of that province). */
export function canManageRegion(actor: Actor, regionId: string | null | undefined): boolean {
  if (actor.scopeLevel === "NATIONAL") return true;
  return actor.scopeLevel === "REGIONAL" && !!regionId && actor.regionId === regionId;
}

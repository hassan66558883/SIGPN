import "server-only";
import { cache } from "react";
import { forbidden, redirect, unauthorized } from "next/navigation";
import type { ScopeLevel } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError } from "@/server/errors";
import { getSessionToken, resolveSession } from "@/server/auth/session";
import type { Permission } from "@/server/rbac/permissions";

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
  roleRequiresMfa: boolean;
  permissions: ReadonlySet<string>;
  organizationId: string | null;
  regionId: string | null;
  regionName: string | null;
  stationId: string | null;
  stationName: string | null;
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
  mustChangePassword: true,
  organizationId: true,
  regionId: true,
  stationId: true,
  region: { select: { name: true } },
  station: { select: { name: true } },
  officer: { select: { id: true } },
  role: { select: { id: true, code: true, name: true, scopeLevel: true, requiresMfa: true, isActive: true, permissions: { select: { permission: { select: { code: true } } } } } },
} as const;

type UserRow = NonNullable<Awaited<ReturnType<typeof loadUserRow>>>;

export async function loadUserRow(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: userSelect });
}

export function buildActor(u: UserRow, session: { id: string | null; mfaVerified: boolean }, authMethod: Actor["authMethod"]): Actor | null {
  if (!u || u.deletedAt || u.status !== "ACTIVE" || !u.role.isActive) return null;
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
    roleRequiresMfa: u.role.requiresMfa,
    permissions: new Set(u.role.permissions.map((p) => p.permission.code)),
    organizationId: u.organizationId,
    regionId: u.regionId,
    regionName: u.region?.name ?? null,
    stationId: u.stationId,
    stationName: u.station?.name ?? null,
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

/** Prisma where-fragment restricting rows to the actor's organizational scope. */
export function scopeWhere(actor: Actor, fields: { stationId?: string; regionId?: string } = { stationId: "stationId", regionId: "regionId" }): Record<string, unknown> {
  const stationField = fields.stationId ?? "stationId";
  const regionField = fields.regionId ?? "regionId";
  switch (actor.scopeLevel) {
    case "NATIONAL":
      return {};
    case "REGIONAL":
      return { [regionField]: actor.regionId ?? "__none__" };
    case "STATION":
    case "OWN":
      return { [stationField]: actor.stationId ?? "__none__" };
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
      return !!actor.stationId && rec.stationId === actor.stationId;
  }
}

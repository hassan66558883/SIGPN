import "server-only";
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { logAudit } from "@/server/audit";
import { decryptSecret, encryptSecret, randomToken, sha256 } from "@/server/crypto";
import { AuthError, BusinessError } from "@/server/errors";
import { enforceRateLimit, resetRateLimit } from "@/server/auth/rate-limit";
import { hashPassword, isPasswordExpired, passwordPolicyErrors, verifyPassword } from "@/server/auth/password";
import { challengeToken, generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, otpauthUri, verifyTotp } from "@/server/auth/mfa";
import { createSession, revokeAllSessions, revokeSessionById, revokeSessionByToken } from "@/server/auth/session";
import type { RequestContext } from "@/server/request-context";
import type { Actor } from "@/server/auth/dal";
import { notifyPermission } from "@/server/notifications";
import { keyExpiryDays } from "@/server/auth/api-key-policy";

const GENERIC_LOGIN_ERROR = "Invalid username or password.";
const MFA_CHALLENGE_MINUTES = 5;
const MFA_MAX_ATTEMPTS = 5;

export type LoginResult = { kind: "session"; token: string; userId: string } | { kind: "mfa"; challenge: string };

function actorLite(u: { id: string; username: string; firstName: string; lastName: string }) {
  return { id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName };
}

/** Step 1: identifier + password. Never reveals whether the account exists. */
export async function login(input: { identifier: string; password: string }, context: RequestContext): Promise<LoginResult> {
  const identifier = input.identifier.trim().toLowerCase();
  enforceRateLimit("loginIp", context.ip);
  enforceRateLimit("loginIdentifier", identifier);

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }], deletedAt: null },
    select: { id: true, username: true, firstName: true, lastName: true, passwordHash: true, passwordChangedAt: true, status: true, failedLoginCount: true, lockedUntil: true, mfaEnabled: true, mustChangePassword: true },
  });

  // Auto-unlock when the lock period has elapsed.
  if (user && user.status === "LOCKED" && user.lockedUntil && user.lockedUntil.getTime() <= Date.now()) {
    await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE", lockedUntil: null, failedLoginCount: 0 } });
    user.status = "ACTIVE";
    user.failedLoginCount = 0;
  }

  const ok = await verifyPassword(input.password, user?.passwordHash);
  if (!user || !ok) {
    await prisma.loginAttempt.create({ data: { identifier, ipAddress: context.ip, success: false, reason: user ? "bad_password" : "unknown_user" } });
    if (user) {
      const failures = user.failedLoginCount + 1;
      const lock = failures >= env.login.maxFailures && user.status === "ACTIVE";
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: failures, ...(lock ? { status: "LOCKED", lockedUntil: new Date(Date.now() + env.login.lockMinutes * 60_000) } : {}) },
      });
      await logAudit({ actor: null, action: lock ? "ACCOUNT_LOCKED" : "LOGIN_FAILED", module: "auth", entityType: "User", entityId: user.id, entityLabel: user.username, outcome: "FAILURE", summary: lock ? `Account ${user.username} locked after ${failures} failed logins` : `Failed login for ${user.username} (${failures}/${env.login.maxFailures})`, context });
    } else {
      await logAudit({ actor: null, action: "LOGIN_FAILED", module: "auth", outcome: "FAILURE", summary: `Failed login for unknown identifier "${identifier.slice(0, 60)}"`, context });
    }
    throw new BusinessError(GENERIC_LOGIN_ERROR);
  }

  if (user.status !== "ACTIVE") {
    await prisma.loginAttempt.create({ data: { identifier, ipAddress: context.ip, success: false, reason: `status_${user.status.toLowerCase()}` } });
    await logAudit({ actor: null, action: "LOGIN_REJECTED", module: "auth", entityType: "User", entityId: user.id, entityLabel: user.username, outcome: "DENIED", summary: `Login rejected: account ${user.username} is ${user.status}`, context });
    throw new BusinessError(user.status === "LOCKED" ? `Account temporarily locked. Try again in ${env.login.lockMinutes} minutes or contact an administrator.` : "This account is not active. Contact your administrator.");
  }

  const expired = isPasswordExpired(user.passwordChangedAt);
  if (user.mfaEnabled) {
    const token = challengeToken();
    await prisma.loginChallenge.create({ data: { userId: user.id, tokenHash: sha256(token), ipAddress: context.ip, userAgent: context.userAgent, expiresAt: new Date(Date.now() + MFA_CHALLENGE_MINUTES * 60_000) } });
    await prisma.loginAttempt.create({ data: { identifier, ipAddress: context.ip, success: true, reason: "password_ok_mfa_pending" } });
    await logAudit({ actor: actorLite(user), action: "MFA_CHALLENGE", module: "auth", entityType: "User", entityId: user.id, entityLabel: user.username, summary: `Password accepted for ${user.username}; second factor requested`, context });
    return { kind: "mfa", challenge: token };
  }

  const session = await createSession(user.id, context, { mfaVerified: false });
  await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: context.ip, ...(expired ? { mustChangePassword: true } : {}) } });
  await prisma.loginAttempt.create({ data: { identifier, ipAddress: context.ip, success: true } });
  resetRateLimit("loginIdentifier", identifier);
  await logAudit({ actor: { ...actorLite(user), sessionId: session.id }, action: "LOGIN", module: "auth", entityType: "User", entityId: user.id, entityLabel: user.username, summary: `${user.username} signed in`, context });
  return { kind: "session", token: session.token, userId: user.id };
}

/** Step 2: TOTP or recovery code against a pending challenge. */
export async function verifyMfaChallenge(input: { challenge: string | undefined; code: string }, context: RequestContext): Promise<{ token: string; userId: string }> {
  enforceRateLimit("mfa", context.ip);
  if (!input.challenge) throw new BusinessError("Your sign-in session expired. Please sign in again.", "STATE");
  const ch = await prisma.loginChallenge.findUnique({
    where: { tokenHash: sha256(input.challenge) },
    include: { user: { select: { id: true, username: true, firstName: true, lastName: true, status: true, mfaSecretEnc: true, mfaEnabled: true, passwordChangedAt: true } } },
  });
  if (!ch || ch.consumedAt || ch.expiresAt.getTime() < Date.now()) throw new BusinessError("Your sign-in session expired. Please sign in again.", "STATE");
  if (ch.attempts >= MFA_MAX_ATTEMPTS) throw new BusinessError("Too many incorrect codes. Please sign in again.", "STATE");
  const u = ch.user;
  if (u.status !== "ACTIVE" || !u.mfaEnabled || !u.mfaSecretEnc) throw new BusinessError("This account cannot complete sign-in. Contact your administrator.", "STATE");

  const code = input.code.trim();
  let method: "totp" | "recovery" | null = null;
  if (/^\d{6}$/.test(code.replace(/\s+/g, ""))) {
    if (verifyTotp(decryptSecret(u.mfaSecretEnc), code) !== null) method = "totp";
  } else {
    const rc = await prisma.mfaRecoveryCode.findUnique({ where: { codeHash: hashRecoveryCode(code) } });
    if (rc && rc.userId === u.id && !rc.usedAt) {
      await prisma.mfaRecoveryCode.update({ where: { id: rc.id }, data: { usedAt: new Date() } });
      method = "recovery";
    }
  }
  if (!method) {
    await prisma.loginChallenge.update({ where: { id: ch.id }, data: { attempts: { increment: 1 } } });
    await logAudit({ actor: actorLite(u), action: "MFA_FAILED", module: "auth", entityType: "User", entityId: u.id, entityLabel: u.username, outcome: "FAILURE", summary: `Incorrect second factor for ${u.username} (attempt ${ch.attempts + 1}/${MFA_MAX_ATTEMPTS})`, context });
    throw new BusinessError("Incorrect verification code.");
  }
  await prisma.loginChallenge.update({ where: { id: ch.id }, data: { consumedAt: new Date() } });
  const session = await createSession(u.id, context, { mfaVerified: true });
  await prisma.user.update({ where: { id: u.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: context.ip, ...(isPasswordExpired(u.passwordChangedAt) ? { mustChangePassword: true } : {}) } });
  resetRateLimit("loginIdentifier", u.username);
  await logAudit({ actor: { ...actorLite(u), sessionId: session.id }, action: "LOGIN", module: "auth", entityType: "User", entityId: u.id, entityLabel: u.username, summary: `${u.username} signed in with second factor (${method})`, context });
  if (method === "recovery") {
    const remaining = await prisma.mfaRecoveryCode.count({ where: { userId: u.id, usedAt: null } });
    await logAudit({ actor: actorLite(u), action: "MFA_RECOVERY_USED", module: "auth", entityType: "User", entityId: u.id, entityLabel: u.username, summary: `Recovery code used by ${u.username}; ${remaining} remaining`, context });
  }
  return { token: session.token, userId: u.id };
}

export async function logout(actor: Actor, token: string | undefined, context: RequestContext) {
  await revokeSessionByToken(token, "logout");
  await logAudit({ actor, action: "LOGOUT", module: "auth", entityType: "User", entityId: actor.id, entityLabel: actor.username, summary: `${actor.username} signed out`, context });
}

// ---------- Passwords ----------

export async function changePassword(actor: Actor, input: { currentPassword: string; newPassword: string }, context: RequestContext) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: actor.id }, select: { passwordHash: true, username: true, email: true } });
  if (!(await verifyPassword(input.currentPassword, u.passwordHash))) {
    await logAudit({ actor, action: "PASSWORD_CHANGE_FAILED", module: "auth", entityType: "User", entityId: actor.id, entityLabel: actor.username, outcome: "FAILURE", summary: "Password change rejected: current password incorrect", context });
    throw new BusinessError("Current password is incorrect.");
  }
  await setNewPassword(actor.id, input.newPassword, { username: u.username, email: u.email }, actor.sessionId);
  await logAudit({ actor, action: "PASSWORD_CHANGED", module: "auth", entityType: "User", entityId: actor.id, entityLabel: actor.username, summary: `${actor.username} changed their password; other sessions revoked`, context });
}

async function setNewPassword(userId: string, newPassword: string, identity: { username: string; email: string }, keepSessionId: string | null) {
  const errors = passwordPolicyErrors(newPassword, identity);
  if (errors.length) throw new BusinessError(`Password does not meet the policy: ${errors.join("; ")}.`);
  const history = await prisma.passwordHistory.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: env.password.historySize, select: { passwordHash: true } });
  const current = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  for (const h of [current, ...history]) if (await verifyPassword(newPassword, h.passwordHash)) throw new BusinessError(`You cannot reuse one of your last ${env.password.historySize} passwords.`);
  const hash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.passwordHistory.create({ data: { userId, passwordHash: current.passwordHash } });
    await tx.user.update({ where: { id: userId }, data: { passwordHash: hash, passwordChangedAt: new Date(), mustChangePassword: false, failedLoginCount: 0, lockedUntil: null, ...(keepSessionId ? {} : {}) } });
    await revokeAllSessions(userId, "password_changed", keepSessionId, tx);
    await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  });
}

/** Self-service request: never reveals whether the identifier exists. Notifies administrators (no e-mail gateway configured). */
export async function requestPasswordReset(identifier: string, context: RequestContext) {
  enforceRateLimit("passwordReset", context.ip);
  const id = identifier.trim().toLowerCase();
  const user = await prisma.user.findFirst({ where: { OR: [{ username: id }, { email: id }], deletedAt: null }, select: { id: true, username: true, firstName: true, lastName: true, stationId: true, regionId: true } });
  if (!user) {
    await logAudit({ actor: null, action: "PASSWORD_RESET_REQUESTED", module: "auth", outcome: "FAILURE", summary: `Reset requested for unknown identifier "${id.slice(0, 60)}"`, context });
    return;
  }
  await logAudit({ actor: null, action: "PASSWORD_RESET_REQUESTED", module: "auth", entityType: "User", entityId: user.id, entityLabel: user.username, summary: `${user.username} requested a password reset`, context });
  await notifyPermission({ permission: "users:reset_password", kind: "SECURITY", title: "Password reset requested", body: `${user.firstName} ${user.lastName} (${user.username}) requested a password reset. Issue a reset link from Administration › Users.`, href: `/admin/users/${user.id}` });
}

/** Administrator issues a one-time reset link (valid 60 minutes). Returned once; only its hash is stored. */
export async function issuePasswordReset(admin: Actor, userId: string, context: RequestContext): Promise<{ url: string; expiresAt: Date }> {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true, username: true } });
  if (!user) throw new BusinessError("User not found.", "STATE");
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 60 * 60_000);
  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
    await tx.passwordResetToken.create({ data: { userId, tokenHash: sha256(token), issuedById: admin.id, expiresAt } });
  });
  await logAudit({ actor: admin, action: "PASSWORD_RESET_ISSUED", module: "users", entityType: "User", entityId: userId, entityLabel: user.username, summary: `Reset link issued for ${user.username} (expires ${expiresAt.toISOString()})`, context });
  return { url: `${env.appUrl}/reset-password/${token}`, expiresAt };
}

export async function resetPasswordWithToken(token: string, newPassword: string, context: RequestContext) {
  enforceRateLimit("passwordReset", context.ip);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: { select: { id: true, username: true, email: true, firstName: true, lastName: true, status: true } } } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) throw new BusinessError("This reset link is invalid or has expired.", "STATE");
  if (row.user.status === "DISABLED") throw new BusinessError("This account is disabled.", "STATE");
  await setNewPassword(row.user.id, newPassword, { username: row.user.username, email: row.user.email }, null);
  await prisma.user.update({ where: { id: row.user.id }, data: { status: row.user.status === "LOCKED" ? "ACTIVE" : row.user.status, lockedUntil: null, failedLoginCount: 0 } });
  await logAudit({ actor: actorLite(row.user), action: "PASSWORD_RESET_COMPLETED", module: "auth", entityType: "User", entityId: row.user.id, entityLabel: row.user.username, summary: `${row.user.username} reset their password via reset link; all sessions revoked`, context });
}

// ---------- MFA enrolment ----------

export async function beginMfaEnrolment(actor: Actor): Promise<{ secret: string; uri: string }> {
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: actor.id }, data: { mfaSecretEnc: encryptSecret(secret), mfaEnabled: false } });
  return { secret, uri: otpauthUri(secret, actor.username) };
}

export async function confirmMfaEnrolment(actor: Actor, code: string, context: RequestContext): Promise<string[]> {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: actor.id }, select: { mfaSecretEnc: true, mfaEnabled: true } });
  if (!u.mfaSecretEnc || u.mfaEnabled) throw new BusinessError("Start the enrolment first.", "STATE");
  if (verifyTotp(decryptSecret(u.mfaSecretEnc), code) === null) throw new BusinessError("The code is incorrect. Check the time on your device and try again.");
  const codes = generateRecoveryCodes();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: actor.id }, data: { mfaEnabled: true, mfaEnrolledAt: new Date() } });
    await tx.mfaRecoveryCode.deleteMany({ where: { userId: actor.id } });
    await tx.mfaRecoveryCode.createMany({ data: codes.map((c) => ({ userId: actor.id, codeHash: c.hash })) });
    if (actor.sessionId) await tx.session.update({ where: { id: actor.sessionId }, data: { mfaVerified: true } });
  });
  await logAudit({ actor, action: "MFA_ENROLLED", module: "auth", entityType: "User", entityId: actor.id, entityLabel: actor.username, summary: `${actor.username} enrolled a TOTP authenticator; 8 recovery codes issued`, context });
  return codes.map((c) => c.plain);
}

export async function disableMfa(actor: Actor, password: string, context: RequestContext) {
  if (actor.roleRequiresMfa) throw new BusinessError("Your role requires multi-factor authentication; it cannot be disabled.", "STATE");
  const u = await prisma.user.findUniqueOrThrow({ where: { id: actor.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(password, u.passwordHash))) throw new BusinessError("Password is incorrect.");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: actor.id }, data: { mfaEnabled: false, mfaSecretEnc: null, mfaEnrolledAt: null } });
    await tx.mfaRecoveryCode.deleteMany({ where: { userId: actor.id } });
  });
  await logAudit({ actor, action: "MFA_DISABLED", module: "auth", entityType: "User", entityId: actor.id, entityLabel: actor.username, summary: `${actor.username} disabled multi-factor authentication`, context });
}

export async function regenerateRecoveryCodes(actor: Actor, code: string, context: RequestContext): Promise<string[]> {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: actor.id }, select: { mfaSecretEnc: true, mfaEnabled: true } });
  if (!u.mfaEnabled || !u.mfaSecretEnc) throw new BusinessError("MFA is not enabled.", "STATE");
  if (verifyTotp(decryptSecret(u.mfaSecretEnc), code) === null) throw new BusinessError("The code is incorrect.");
  const codes = generateRecoveryCodes();
  await prisma.$transaction(async (tx) => {
    await tx.mfaRecoveryCode.deleteMany({ where: { userId: actor.id } });
    await tx.mfaRecoveryCode.createMany({ data: codes.map((c) => ({ userId: actor.id, codeHash: c.hash })) });
  });
  await logAudit({ actor, action: "MFA_RECOVERY_REGENERATED", module: "auth", entityType: "User", entityId: actor.id, entityLabel: actor.username, summary: `${actor.username} regenerated recovery codes`, context });
  return codes.map((c) => c.plain);
}

// ---------- Sessions & API keys (self-service) ----------

export async function listOwnSessions(actor: Actor) {
  return prisma.session.findMany({ where: { userId: actor.id, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" }, select: { id: true, ipAddress: true, userAgent: true, createdAt: true, lastSeenAt: true, mfaVerified: true } });
}

export async function revokeOwnSession(actor: Actor, sessionId: string, context: RequestContext) {
  const s = await prisma.session.findFirst({ where: { id: sessionId, userId: actor.id } });
  if (!s) throw new BusinessError("Session not found.", "STATE");
  await revokeSessionById(sessionId, "user_revoked");
  await logAudit({ actor, action: "SESSION_REVOKED", module: "auth", entityType: "Session", entityId: sessionId, summary: `${actor.username} revoked one of their sessions`, context });
}

export async function createApiKey(actor: Actor, name: string, expiresInDays: number | null, context: RequestContext): Promise<string> {
  if (!actor.permissions.has("apikeys:manage_own")) throw new AuthError("forbidden");
  // Every key expires, at most `API_KEY_MAX_DAYS` (90) after its creation: rotation (security audit, lot 7).
  const days = keyExpiryDays(expiresInDays, env.apiKey.maxDays);
  if (days === null) throw new BusinessError(`An API key must expire: choose a validity between 1 and ${env.apiKey.maxDays} days.`, "VALIDATION", { expiresInDays: "required" });
  const count = await prisma.apiKey.count({ where: { userId: actor.id, revokedAt: null } });
  if (count >= 5) throw new BusinessError("You already have 5 active API keys. Revoke one first.", "STATE");
  const prefix = randomToken(6).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  const secret = randomToken(32);
  const key = `pms_${prefix}_${secret}`;
  await prisma.apiKey.create({ data: { userId: actor.id, name: name.trim().slice(0, 80) || "API key", keyPrefix: prefix, keyHash: sha256(key), noSensitive: true, expiresAt: new Date(Date.now() + days * 86_400_000) } });
  await logAudit({ actor, action: "API_KEY_CREATED", module: "auth", entityType: "ApiKey", entityLabel: prefix, summary: `${actor.username} created API key ${prefix} (${name})`, context });
  return key;
}

export async function revokeApiKey(actor: Actor, id: string, context: RequestContext) {
  const k = await prisma.apiKey.findFirst({ where: { id, userId: actor.id, revokedAt: null } });
  if (!k) throw new BusinessError("API key not found.", "STATE");
  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  await logAudit({ actor, action: "API_KEY_REVOKED", module: "auth", entityType: "ApiKey", entityId: id, entityLabel: k.keyPrefix, summary: `${actor.username} revoked API key ${k.keyPrefix}`, context });
}

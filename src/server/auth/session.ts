import { cookies } from "next/headers";
import { prisma, type Db } from "@/server/db";
import { env } from "@/server/env";
import { randomToken, sha256 } from "@/server/crypto";
import type { RequestContext } from "@/server/request-context";

export const SESSION_COOKIE = "pms_session";
export const MFA_COOKIE = "pms_mfa";

const cookieBase = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: env.isProduction };

export type ResolvedSession = { id: string; userId: string; mfaVerified: boolean; createdAt: Date };

export async function createSession(userId: string, context: RequestContext, opts: { mfaVerified: boolean }, db: Db = prisma): Promise<{ token: string; id: string }> {
  const token = randomToken(32);
  const absoluteMs = env.session.absoluteHours * 3_600_000;
  const s = await db.session.create({
    data: { userId, tokenHash: sha256(token), ipAddress: context.ip, userAgent: context.userAgent, mfaVerified: opts.mfaVerified, expiresAt: new Date(Date.now() + absoluteMs) },
    select: { id: true },
  });
  return { token, id: s.id };
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { ...cookieBase, maxAge: env.session.absoluteHours * 3600 });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...cookieBase, maxAge: 0 });
}

export async function setMfaCookie(token: string) {
  const jar = await cookies();
  jar.set(MFA_COOKIE, token, { ...cookieBase, maxAge: 300 });
}

export async function clearMfaCookie() {
  const jar = await cookies();
  jar.set(MFA_COOKIE, "", { ...cookieBase, maxAge: 0 });
}

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function getMfaToken(): Promise<string | undefined> {
  return (await cookies()).get(MFA_COOKIE)?.value;
}

/** Validates a session token: existence, revocation, absolute expiry, idle expiry. Touches lastSeenAt at most once a minute. */
export async function resolveSession(token: string | undefined | null): Promise<ResolvedSession | null> {
  if (!token || token.length < 32) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    select: { id: true, userId: true, lastSeenAt: true, expiresAt: true, revokedAt: true, mfaVerified: true, createdAt: true },
  });
  if (!session || session.revokedAt) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() < now) return null;
  if (now - session.lastSeenAt.getTime() > env.session.idleMinutes * 60_000) {
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date(), revokedReason: "idle_timeout" } });
    return null;
  }
  if (now - session.lastSeenAt.getTime() > 60_000) {
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }
  return { id: session.id, userId: session.userId, mfaVerified: session.mfaVerified, createdAt: session.createdAt };
}

export async function revokeSessionByToken(token: string | undefined, reason = "logout") {
  if (!token) return;
  await prisma.session.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } });
}

export async function revokeSessionById(id: string, reason: string, db: Db = prisma) {
  await db.session.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } });
}

/** Revoke every active session of a user, optionally keeping one (the current). */
export async function revokeAllSessions(userId: string, reason: string, keepSessionId?: string | null, db: Db = prisma): Promise<number> {
  const r = await db.session.updateMany({
    where: { userId, revokedAt: null, ...(keepSessionId ? { id: { not: keepSessionId } } : {}) },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
  return r.count;
}

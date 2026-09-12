import "server-only";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { sha256 } from "@/server/crypto";
import { buildActor, loadUserRow, type Actor } from "@/server/auth/dal";
import { resolveSession, SESSION_COOKIE } from "@/server/auth/session";

/** Resolves the actor of a REST request: Bearer API key first, then the session cookie. */
export async function resolveApiActor(req: NextRequest): Promise<Actor | null> {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const key = auth.slice(7).trim();
    if (!key.startsWith("pms_") || key.length < 40) return null;
    const row = await prisma.apiKey.findUnique({ where: { keyHash: sha256(key) }, select: { id: true, userId: true, revokedAt: true, expiresAt: true } });
    if (!row || row.revokedAt || (row.expiresAt && row.expiresAt.getTime() < Date.now())) return null;
    const u = await loadUserRow(row.userId);
    if (!u) return null;
    prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    return buildActor(u, { id: null, mfaVerified: true }, "api_key");
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await resolveSession(token);
  if (!session) return null;
  const u = await loadUserRow(session.userId);
  if (!u) return null;
  return buildActor(u, { id: session.id, mfaVerified: session.mfaVerified }, "session");
}

import "server-only";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError } from "@/server/errors";
import type { Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";

/**
 * Oversight of API keys (security audit, lot 7): the security administrator sees every active key (never the secret, only its
 * prefix) and can revoke any of them.
 */
function need(actor: Actor) {
  if (!actor.permissions.has("security:manage")) throw new BusinessError("Only the security administrator can see and revoke every API key.", "STATE");
}

export async function listActiveApiKeys(actor: Actor) {
  need(actor);
  const rows = await prisma.apiKey.findMany({
    where: { revokedAt: null },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, name: true, keyPrefix: true, noSensitive: true, createdAt: true, lastUsedAt: true, expiresAt: true, user: { select: { id: true, username: true, firstName: true, lastName: true } } },
  });
  const now = Date.now();
  return rows.map((k) => ({ ...k, expired: !!k.expiresAt && k.expiresAt.getTime() < now }));
}

export async function revokeAnyApiKey(actor: Actor, id: string, ctx: RequestContext) {
  need(actor);
  const k = await prisma.apiKey.findFirst({ where: { id, revokedAt: null }, select: { keyPrefix: true, name: true, user: { select: { username: true } } } });
  if (!k) throw new BusinessError("API key not found.", "STATE");
  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  await logAudit({ actor, action: "API_KEY_REVOKED_BY_ADMIN", module: "auth", entityType: "ApiKey", entityId: id, entityLabel: k.keyPrefix, summary: `${actor.username} revoked API key ${k.keyPrefix} (${k.name}) of ${k.user.username}`, context: ctx });
}

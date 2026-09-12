import { prisma, type Db, type Prisma } from "@/server/db";
import type { AuditOutcome } from "@/generated/prisma/client";
import type { RequestContext } from "@/server/request-context";

export type AuditActor = { id: string; username: string; firstName: string; lastName: string; sessionId?: string | null } | null;

export type AuditEntry = {
  actor: AuditActor;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string | null;
  entityLabel?: string | null;
  summary: string;
  before?: unknown;
  after?: unknown;
  outcome?: AuditOutcome;
  context?: RequestContext | null;
};

const SENSITIVE = /password|passwordHash|tokenHash|secret|mfaSecretEnc|keyHash|codeHash|token$/i;

function redact<T>(value: T, depth = 0): T {
  if (depth > 6) return "[depth]" as unknown as T;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1)) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1);
    return out as T;
  }
  return value;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    return JSON.parse(JSON.stringify(redact(value), (_k, v) => (typeof v === "bigint" ? v.toString() : v))) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

/**
 * Immutable audit log. Never throws: an audit failure must not break the business operation
 * (except where the caller passes a transaction — then it is part of the atomic unit).
 */
export async function logAudit(entry: AuditEntry, db: Db = prisma): Promise<void> {
  const data = {
    actorId: entry.actor?.id ?? null,
    actorLabel: entry.actor ? `${entry.actor.username} (${entry.actor.firstName} ${entry.actor.lastName})` : "system",
    action: entry.action.slice(0, 64),
    module: entry.module.slice(0, 64),
    entityType: entry.entityType ?? null,
    entityId: entry.entityId ?? null,
    entityLabel: entry.entityLabel?.slice(0, 200) ?? null,
    summary: entry.summary.slice(0, 500),
    before: toJson(entry.before),
    after: toJson(entry.after),
    outcome: entry.outcome ?? "SUCCESS",
    ipAddress: entry.context?.ip ?? null,
    userAgent: entry.context?.userAgent ?? null,
    sessionId: entry.actor?.sessionId ?? null,
  };
  if (db !== prisma) {
    await db.auditLog.create({ data });
    return;
  }
  try {
    await prisma.auditLog.create({ data });
  } catch (error) {
    console.error("[audit] write failed", entry.action, entry.module, error);
  }
}

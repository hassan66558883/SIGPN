import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { logAudit } from "@/server/audit";
import type { Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";

/**
 * When an officer leaves the service (retirement, cessation, dismissal, deceased, deactivation) their open transfers
 * (proposed, examined by HR, validated but not executed) can never be executed: they are cancelled in the same transaction.
 * Kept free of the organisation service so that it can be called from there without an import cycle.
 */
export async function cancelOpenTransfers(tx: Prisma.TransactionClient, officerId: string, reason: string, actor: Actor | null, ctx: RequestContext | null) {
  const open = await tx.transferRequest.findMany({ where: { officerId, status: { in: ["PROPOSED", "HR_APPROVED", "APPROVED"] } }, select: { id: true, number: true, status: true } });
  for (const t of open) {
    await tx.transferRequest.update({ where: { id: t.id }, data: { status: "CANCELLED", closeReason: reason } });
    await logAudit({ actor, action: "TRANSFER_CANCELLED", module: "hr", entityType: "TransferRequest", entityId: t.id, entityLabel: t.number, summary: `Transfer ${t.number} cancelled automatically: ${reason}`, before: { status: t.status }, after: { status: "CANCELLED", reason }, context: ctx }, tx);
  }
  return open.length;
}

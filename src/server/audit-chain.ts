import "server-only";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import type { Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";

export type AuditChainReport = {
  /** True when every row is in place, linked to the previous one and unaltered. */
  intact: boolean;
  checked: number;
  /** Position and hash of the last row: record them outside the database to also detect the removal of the newest rows. */
  headSeq: number;
  headHash: string | null;
  brokenSeq: number | null;
  reason: string | null;
  verifiedAt: string;
};

/**
 * Walks the whole audit chain in the database (function pms_audit_verify) and reports the first break. The verification is
 * itself audited, and that row joins the chain after the head that is returned.
 */
export async function verifyAuditChain(actor: Actor, ctx: RequestContext): Promise<AuditChainReport> {
  const [row] = await prisma.$queryRaw<{ checked: number; head_seq: number; head_hash: string | null; broken_seq: number | null; reason: string | null }[]>`SELECT * FROM pms_audit_verify()`;
  const report: AuditChainReport = { intact: row.broken_seq === null, checked: row.checked, headSeq: row.head_seq, headHash: row.head_hash, brokenSeq: row.broken_seq, reason: row.reason, verifiedAt: new Date().toISOString() };
  await logAudit({
    actor,
    action: report.intact ? "AUDIT_CHAIN_VERIFIED" : "AUDIT_CHAIN_BROKEN",
    module: "audit",
    summary: report.intact ? `Audit chain verified: ${report.checked} rows intact (head ${report.headSeq})` : `Audit chain BROKEN at position ${report.brokenSeq}: ${report.reason}`,
    outcome: report.intact ? "SUCCESS" : "FAILURE",
    after: report,
    context: ctx,
  });
  return report;
}

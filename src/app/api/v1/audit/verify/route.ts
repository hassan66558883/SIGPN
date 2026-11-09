import { apiOk, withApi } from "@/server/api";
import { verifyAuditChain } from "@/server/audit-chain";

/** GET /api/v1/audit/verify — walks the tamper-evident audit chain and reports the first break (itself audited). */
export const GET = withApi({ permission: "audit:view" }, async ({ actor, ctx }) => apiOk(await verifyAuditChain(actor, ctx)));

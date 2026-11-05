import { apiOk, withApi } from "@/server/api";
import { logAudit } from "@/server/audit";
import { integrityReport } from "@/server/hr/integrity";

/** GET /api/v1/hr/integrity — consistency checks of the HR data (national audit access only). */
export const GET = withApi({ permission: "audit:view" }, async ({ actor, ctx }) => {
  const r = await integrityReport(actor);
  await logAudit({ actor, action: "HR_INTEGRITY_CHECKED", module: "hr", summary: `HR integrity checks run: ${r.errors} error type(s), ${r.warnings} warning type(s)`, context: ctx });
  return apiOk(r);
});

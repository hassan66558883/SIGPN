import { apiOk, parseJson, withApi } from "@/server/api";
import { getLeaveSettings, updateLeaveSettings } from "@/server/hr/attendance";
import { leaveSettingsSchema } from "@/server/hr/attendance-schemas";

/** GET /api/v1/hr/leaves/settings — annual leave entitlement. */
export const GET = withApi({ permission: "hr:view" }, async () => apiOk(await getLeaveSettings()));

/** PUT /api/v1/hr/leaves/settings — change the annual entitlement (system settings permission). */
export const PUT = withApi({ permission: "system:settings" }, async ({ actor, ctx, req }) => apiOk(await updateLeaveSettings(actor, await parseJson(req, leaveSettingsSchema), ctx)));

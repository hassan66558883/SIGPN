import { apiOk, parseJson, withApi } from "@/server/api";
import { getRotationSettings, rotationSettingsSchema, updateRotationSettings } from "@/server/hr/rotation-settings";

/** GET /api/v1/hr/rotation/settings */
export const GET = withApi({ permission: "hr:view" }, async () => apiOk(await getRotationSettings()));

/** PUT /api/v1/hr/rotation/settings — activate/deactivate AFFECTATION_AUTOMATIQUE and set its parameters. */
export const PUT = withApi({ permission: "hr:auto_assign_config" }, async ({ actor, ctx, req }) => apiOk(await updateRotationSettings(actor, await parseJson(req, rotationSettingsSchema), ctx)));

import { apiOk, parseJson, withApi } from "@/server/api";
import { getStatsSettings, statsSettingsSchema, updateStatsSettings } from "@/server/hr/stats";

/** GET /api/v1/hr/stats/settings — retirement age and promotion seniority used by the statistics. */
export const GET = withApi({ permission: "hr:view" }, async () => apiOk(await getStatsSettings()));

/** PUT /api/v1/hr/stats/settings — change them (system settings permission). */
export const PUT = withApi({ permission: "system:settings" }, async ({ actor, ctx, req }) => apiOk(await updateStatsSettings(actor, await parseJson(req, statsSettingsSchema), ctx)));

import { apiOk, withApi } from "@/server/api";
import { heartbeat } from "@/server/alerts/service";

/** POST /api/v1/alerts/heartbeat — presence of the caller's unit; returns the number of waiting alerts. */
export const POST = withApi({ permission: "alerts:view" }, async ({ actor }) => apiOk(await heartbeat(actor)));

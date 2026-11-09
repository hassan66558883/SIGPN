import { apiOk, withApi } from "@/server/api";
import { listActiveApiKeys } from "@/server/auth/api-keys-admin";

/** GET /api/v1/security/api-keys — every active API key of every user (prefix only, never the secret). Security administrator. */
export const GET = withApi({ permission: "security:manage" }, async ({ actor }) => apiOk(await listActiveApiKeys(actor)));

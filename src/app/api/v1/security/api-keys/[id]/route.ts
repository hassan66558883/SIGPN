import { apiOk, withApi } from "@/server/api";
import { revokeAnyApiKey } from "@/server/auth/api-keys-admin";

type P = { id: string };

/** DELETE /api/v1/security/api-keys/{id} — revokes any API key. Security administrator. */
export const DELETE = withApi<P>({ permission: "security:manage" }, async ({ actor, ctx, params }) => {
  await revokeAnyApiKey(actor, params.id, ctx);
  return apiOk({ revoked: true });
});

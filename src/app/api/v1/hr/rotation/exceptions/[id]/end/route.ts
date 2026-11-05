import { apiOk, withApi } from "@/server/api";
import { endException } from "@/server/hr/rotation";

/** POST /api/v1/hr/rotation/exceptions/:id/end */
export const POST = withApi<{ id: string }>({ permission: "hr:manage" }, async ({ actor, ctx, params }) => {
  await endException(actor, params.id, ctx);
  return apiOk({ ended: true });
});

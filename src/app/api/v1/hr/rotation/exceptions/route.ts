import { apiOk, parseJson, withApi } from "@/server/api";
import { createException } from "@/server/hr/rotation";
import { exceptionSchema } from "@/server/hr/rotation-schemas";

/** POST /api/v1/hr/rotation/exceptions — exempt an officer from the automatic rotation (administrative exception). */
export const POST = withApi({ permission: "hr:manage" }, async ({ actor, ctx, req }) => apiOk(await createException(actor, await parseJson(req, exceptionSchema), ctx), { status: 201 }));

import { z } from "zod";
import { apiOk, parseJson, parseQuery, withApi } from "@/server/api";
import { addDistinction, distinctionSchema, listDistinctions } from "@/server/hr/discipline";

/** GET /api/v1/hr/distinctions?officerId= — distinctions and rewards of an officer. */
export const GET = withApi({ permission: "hr:view" }, async ({ actor, req }) => apiOk(await listDistinctions(actor, parseQuery(req, z.object({ officerId: z.string().min(1).max(64) })).officerId)));

/** POST /api/v1/hr/distinctions — record a distinction or reward. */
export const POST = withApi({ permission: "hr:manage" }, async ({ actor, ctx, req }) => apiOk(await addDistinction(actor, await parseJson(req, distinctionSchema), ctx), { status: 201 }));

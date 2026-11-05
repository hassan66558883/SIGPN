import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { createSkill, listSkills } from "@/server/hr/training";

/** GET /api/v1/hr/skills — competence referential. */
export const GET = withApi({ permission: "hr:view" }, async () => apiOk(await listSkills()));

/** POST /api/v1/hr/skills — add a competence. */
export const POST = withApi({ permission: "hr:training_manage" }, async ({ actor, ctx, req }) => apiOk(await createSkill(actor, await parseJson(req, z.object({ code: z.string().trim().min(2).max(12), name: z.string().trim().min(2).max(100) })), ctx), { status: 201 }));

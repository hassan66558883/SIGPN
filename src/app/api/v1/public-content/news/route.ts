import { apiOk, parseJson, withApi } from "@/server/api";
import { listNewsAdmin, newsSchema, saveNews } from "@/server/public/admin";

export const GET = withApi({ permission: "public:content" }, async ({ actor }) => apiOk(await listNewsAdmin(actor)));
export const POST = withApi({ permission: "public:content" }, async ({ actor, ctx, req }) => apiOk(await saveNews(actor, await parseJson(req, newsSchema), ctx), { status: 201 }));

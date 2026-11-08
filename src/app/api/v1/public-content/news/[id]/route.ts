import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { setNewsPublished } from "@/server/public/admin";

/** PATCH /api/v1/public-content/news/{id} — publish or withdraw (a second person than the author publishes, unless the role also publishes notices). */
export const PATCH = withApi<{ id: string }>({ permission: "public:content" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, z.object({ published: z.boolean() }));
  await setNewsPublished(actor, params.id, body.published, ctx);
  return apiOk({ id: params.id, published: body.published });
});

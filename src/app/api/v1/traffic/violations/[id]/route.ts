import { z } from "zod";
import { apiOk, parseJson, withApi } from "@/server/api";
import { setViolationActive } from "@/server/traffic/registry";

type P = { id: string };

/** PATCH /api/v1/traffic/violations/{id} — { isActive } only (traffic:catalog_manage). Names, classes, legal texts and amounts are never editable. */
export const PATCH = withApi<P>({ permission: "traffic:catalog_manage" }, async ({ actor, ctx, params, req }) => {
  const body = await parseJson(req, z.object({ isActive: z.boolean() }).strict());
  return apiOk(await setViolationActive(actor, params.id, body.isActive, ctx));
});

import { z } from "zod";
import { apiOk, parseJson, parseQuery, withApi } from "@/server/api";
import { listControls } from "@/server/traffic/queries";
import { recordControl } from "@/server/traffic/enforcement";
import { controlSchema } from "@/server/traffic/schemas";
import { listQuery } from "@/server/traffic/api-utils";

const query = listQuery.extend({ outcome: z.enum(["COMPLIANT", "INFRACTION"]).optional(), stationId: z.string().max(64).optional(), officerId: z.string().max(64).optional(), mine: z.enum(["1", "true"]).optional() });

/** GET /api/v1/traffic/controls — controls inside the caller's scope. */
export const GET = withApi({ permission: "traffic:view" }, async ({ actor, req }) => {
  const { mine, ...q } = parseQuery(req, query);
  const r = await listControls(actor, { ...q, mine: !!mine });
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

/** POST /api/v1/traffic/controls — records a control; with `violationIds` it also issues the PV and the fine. */
export const POST = withApi({ permission: "traffic:control_create" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, controlSchema);
  return apiOk(await recordControl(actor, body, ctx), { status: 201 });
});

import { z } from "zod";
import { apiOk, paginationSchema, parseJson, parseQuery, withApi } from "@/server/api";
import { listComplaints } from "@/server/complaints/queries";
import { createComplaint } from "@/server/complaints/service";
import { complaintSchema, OFFENSE_CATEGORIES, PRIORITIES } from "@/server/complaints/schemas";

const querySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["DRAFT", "REGISTERED", "UNDER_REVIEW", "ASSIGNED", "CONVERTED", "CLOSED", "REJECTED"]).optional(),
  category: z.enum(OFFENSE_CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  stationId: z.string().max(64).optional(),
  assignedToId: z.string().max(64).optional(),
  mine: z.coerce.boolean().optional(),
});

export const GET = withApi({ permission: "complaints:view" }, async ({ actor, req }) => {
  const q = parseQuery(req, querySchema);
  const r = await listComplaints(actor, q);
  return apiOk(r.items, { meta: { page: r.page, pageSize: r.pageSize, total: r.total } });
});

export const POST = withApi({ permission: "complaints:create" }, async ({ actor, ctx, req }) => {
  const body = await parseJson(req, complaintSchema);
  return apiOk(await createComplaint(actor, body, ctx), { status: 201 });
});

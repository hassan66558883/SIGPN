import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { listViolations, violationSummary } from "@/server/traffic/queries";
import { TRAFFIC_CATEGORY_CODES, TRAFFIC_OFFENCE_CLASSES } from "@/server/traffic/schemas";

const query = z.object({ q: z.string().trim().max(100).optional(), category: z.enum(TRAFFIC_CATEGORY_CODES).optional(), offenceClass: z.enum(TRAFFIC_OFFENCE_CLASSES).optional() });

/** GET /api/v1/traffic/violations — the offence catalogue imported from the official table, with the summary counts. */
export const GET = withApi({ permission: "traffic:violations_view" }, async ({ req }) => {
  const items = await listViolations(parseQuery(req, query));
  return apiOk(items, { meta: { total: items.length, summary: await violationSummary() } });
});

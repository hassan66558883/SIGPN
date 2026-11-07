import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { supervisionOverview } from "@/server/alerts/service";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
  regionId: z.string().max(64).optional(),
  stationId: z.string().max(64).optional(),
  status: z.enum(["PENDING", "DELIVERED", "READ", "ACKNOWLEDGED", "FAILED"]).optional(),
  kind: z.enum(["PUBLISHED", "UPDATED", "SUSPENDED", "REACTIVATED", "WITHDRAWN", "EXPIRED", "CLOSED"]).optional(),
});

/** GET /api/v1/alerts/supervision — national supervision: alerts with their receipt counters and the connected / offline units. */
export const GET = withApi({ permission: "alerts:supervise" }, async ({ actor, req }) => apiOk(await supervisionOverview(actor, parseQuery(req, querySchema))));

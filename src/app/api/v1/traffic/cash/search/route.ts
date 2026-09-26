import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { searchRevenue } from "@/server/traffic/cash-queries";
import { rangeQuery } from "@/server/traffic/api-utils";

const query = z.object({ ...rangeQuery, q: z.string().trim().max(100).optional(), unit: z.string().trim().max(100).optional(), method: z.enum(["CASH", "ELECTRONIC", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER"]).optional(), status: z.enum(["OPEN", "CLOSED", "PENDING_DEPOSIT", "DEPOSITED", "VALIDATED", "BLOCKED"]).optional(), amount: z.coerce.number().int().positive().optional() });

/** GET /api/v1/traffic/cash/search — payments booked in registers and deposits (receipt, PV, fine, agent, badge, unit, deposit, slip, reference, date, method, status, amount). */
export const GET = withApi({}, async ({ actor, req }) => apiOk(await searchRevenue(actor, parseQuery(req, query))));

import { z } from "zod";
import { apiOk, parseQuery, withApi } from "@/server/api";
import { leaveBalance } from "@/server/hr/attendance";
import { getOfficer } from "@/server/org/service";
import { BusinessError } from "@/server/errors";

const query = z.object({ officerId: z.string().max(64).optional(), year: z.coerce.number().int().min(2000).max(2100).optional() });

/** GET /api/v1/hr/leaves/balance?officerId=&year= — annual leave balance (own balance by default). */
export const GET = withApi({}, async ({ actor, req }) => {
  const q = parseQuery(req, query);
  const officerId = q.officerId ?? actor.officerId;
  if (!officerId) throw new BusinessError("Select the officer concerned.", "VALIDATION", { officerId: "required" });
  if (officerId !== actor.officerId) await getOfficer(actor, officerId);
  return apiOk(await leaveBalance(officerId, q.year));
});

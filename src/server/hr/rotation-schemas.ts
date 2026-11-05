import { z } from "zod";
import { optionalDate } from "@/server/action-utils";

export const exceptionSchema = z.object({
  officerId: z.string().min(1),
  reason: z.string().trim().min(5, "reason is required").max(500),
  startsAt: optionalDate,
  endsAt: optionalDate,
});

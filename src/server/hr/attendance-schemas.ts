import { z } from "zod";
import { dateInput, optionalText } from "@/server/action-utils";

export const ATTENDANCE_STATUSES = ["PRESENT", "LATE", "ABSENT", "ON_LEAVE", "PERMISSION", "UNAVAILABLE"] as const;
/** Statuses a roll-call may set by hand; the others come from approved leave. */
export const ROLL_CALL_STATUSES = ["PRESENT", "LATE", "ABSENT"] as const;
export const LEAVE_TYPES = ["ANNUAL", "EXCEPTIONAL", "PERMISSION", "ABSENCE_AUTHORIZATION", "UNAVAILABILITY"] as const;
export const LEAVE_STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "CANCELLED"] as const;

export const rollCallSchema = z.object({
  stationId: z.string().min(1),
  date: dateInput,
  entries: z
    .array(
      z.object({
        officerId: z.string().min(1),
        status: z.enum(ROLL_CALL_STATUSES),
        lateMinutes: z.number().int().min(1).max(720).optional(),
        note: z.string().trim().max(300).optional(),
      }),
    )
    .min(1)
    .max(1000),
});
export type RollCallInput = z.infer<typeof rollCallSchema>;

export const leaveRequestSchema = z.object({
  officerId: optionalText(64),
  type: z.enum(LEAVE_TYPES),
  startDate: dateInput,
  endDate: dateInput,
  reason: optionalText(500),
});
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;

export const leaveDecisionSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  note: optionalText(500),
});
export type LeaveDecisionInput = z.infer<typeof leaveDecisionSchema>;

export const leaveCancelSchema = z.object({ id: z.string().min(1), reason: z.string().trim().min(3).max(500) });

export const leaveSettingsSchema = z.object({ annualDays: z.number().int().min(1).max(120).default(30) });
export type LeaveSettings = z.infer<typeof leaveSettingsSchema>;

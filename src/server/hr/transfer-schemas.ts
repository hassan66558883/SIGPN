import { z } from "zod";
import { dateInput, optionalText } from "@/server/action-utils";

export const TRANSFER_STATUSES = ["PROPOSED", "HR_APPROVED", "APPROVED", "EXECUTED", "REJECTED", "CANCELLED"] as const;

export const proposeTransferSchema = z.object({
  officerId: z.string().min(1),
  toStationId: z.string().min(1, "destination structure is required"),
  toDepartmentId: optionalText(64),
  toPositionId: optionalText(64),
  effectiveDate: dateInput,
  reason: z.string().trim().min(5, "reason is required").max(1000),
});
export type ProposeTransferInput = z.infer<typeof proposeTransferSchema>;

export const transferDecisionSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  note: optionalText(1000),
});
export type TransferDecisionInput = z.infer<typeof transferDecisionSchema>;

export const cancelTransferSchema = z.object({
  id: z.string().min(1),
  reason: z.string().trim().min(5, "reason is required").max(500),
});

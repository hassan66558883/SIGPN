import { z } from "zod";
import { dateInput, optionalText } from "@/server/action-utils";

/** Legal limit of a police custody before a judicial decision is needed, and the longest single extension. */
export const LEGAL_LIMIT_HOURS = 48;
export const MAX_EXTENSION_HOURS = 48;

export const DETENTION_END_REASONS = ["RELEASED_NO_CHARGE", "RELEASED_ON_BAIL", "TRANSFERRED_PROSECUTION", "TRANSFERRED_STATION", "COURT_APPEARANCE", "MEDICAL", "OTHER"] as const;
export const DETENTION_LOG_TYPES = ["WELFARE_CHECK", "MEAL", "MEDICAL", "VISIT", "LEGAL_COUNSEL", "TRANSFER", "INCIDENT", "NOTE"] as const;

export const startDetentionSchema = z.object({
  arrestId: z.string().min(1, "select an arrest"),
  cellNumber: optionalText(20),
  startedAt: dateInput,
  medicalNotes: optionalText(1000),
});
export type StartDetentionInput = z.infer<typeof startDetentionSchema>;

export const detentionLogSchema = z.object({
  detentionId: z.string().min(1),
  type: z.enum(DETENTION_LOG_TYPES),
  notes: z.string().trim().min(3).max(2000),
});
export type DetentionLogInput = z.infer<typeof detentionLogSchema>;

export const extendDetentionSchema = z.object({
  detentionId: z.string().min(1),
  extendedUntil: dateInput,
  extensionAuthority: z.string().trim().min(3).max(200),
  extensionReason: z.string().trim().min(10).max(2000),
});
export type ExtendDetentionInput = z.infer<typeof extendDetentionSchema>;

export const endDetentionSchema = z.object({
  detentionId: z.string().min(1),
  endReason: z.enum(DETENTION_END_REASONS),
  endNotes: z.string().trim().min(3).max(2000),
});
export type EndDetentionInput = z.infer<typeof endDetentionSchema>;

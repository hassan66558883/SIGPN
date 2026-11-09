import { z } from "zod";
import { optionalDate, optionalText } from "@/server/action-utils";
import { WARRANT_TYPES } from "@/server/wanted/schemas";

export const warrantSchema = z.object({
  type: z.enum(WARRANT_TYPES).default("ARREST"),
  personId: z.string().min(1, "select a person"),
  caseId: optionalText(64),
  issuingAuthority: z.string().trim().min(3).max(200),
  issuingAuthorityRef: optionalText(120),
  grounds: z.string().trim().min(10).max(3000),
  targetAddress: optionalText(300),
  expiresAt: optionalDate,
});
export type WarrantInput = z.infer<typeof warrantSchema>;

export const warrantDecisionSchema = z.object({
  warrantId: z.string().min(1),
  status: z.enum(["ACTIVE", "REJECTED", "EXECUTED", "CANCELLED"]),
  notes: optionalText(2000),
});
export type WarrantDecisionInput = z.infer<typeof warrantDecisionSchema>;

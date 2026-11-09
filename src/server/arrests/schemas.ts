import { z } from "zod";
import { dateInput, optionalDate, optionalText } from "@/server/action-utils";

export const ARREST_AUTHORITIES = ["WARRANT", "FLAGRANTE_DELICTO", "COURT_ORDER", "PROBABLE_CAUSE", "OTHER"] as const;
export const ARREST_STATUSES = ["RECORDED", "IN_CUSTODY", "RELEASED", "TRANSFERRED", "CHARGED"] as const;

export const arrestSchema = z.object({
  personId: z.string().min(1, "select a person"),
  caseId: optionalText(64),
  warrantId: optionalText(64),
  arrestingOfficerId: optionalText(64),
  arrestedAt: dateInput,
  locationText: z.string().trim().min(3).max(300),
  authority: z.enum(ARREST_AUTHORITIES).default("FLAGRANTE_DELICTO"),
  charges: z.string().trim().min(3).max(2000),
  circumstances: optionalText(3000),
  rightsReadAt: optionalDate,
  notes: optionalText(2000),
});
export type ArrestInput = z.infer<typeof arrestSchema>;

export const arrestStatusSchema = z.object({
  arrestId: z.string().min(1),
  status: z.enum(["IN_CUSTODY", "RELEASED", "TRANSFERRED", "CHARGED"]),
  notes: optionalText(2000),
});
export type ArrestStatusInput = z.infer<typeof arrestStatusSchema>;

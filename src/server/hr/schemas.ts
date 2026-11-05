import { z } from "zod";
import { dateInput, optionalDate, optionalText } from "@/server/action-utils";

export const ADMIN_STATUSES = ["ACTIVE", "SECONDED", "AT_DISPOSAL", "SUSPENDED", "RETIRED", "CEASED", "DECEASED"] as const;

/** Career events that can be recorded by hand. TRANSFER is produced by the mutation circuit (phase 4), RECRUITMENT at creation. */
export const MANUAL_CAREER_EVENTS = ["APPOINTMENT", "PROMOTION", "ADVANCEMENT", "FUNCTION_CHANGE", "SECONDMENT", "AT_DISPOSAL", "REINSTATEMENT", "RETIREMENT", "CESSATION"] as const;

export const dossierSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]).default("UNKNOWN"),
  dateOfBirth: optionalDate,
  birthPlace: optionalText(100),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "UNKNOWN"]).optional().or(z.literal("")),
  phone: optionalText(30),
  email: optionalText(120),
  corpsId: optionalText(64),
  hiredAt: optionalDate,
  serviceStartDate: optionalDate,
  specialties: optionalText(300),
  notes: optionalText(1000),
});
export type DossierInput = z.infer<typeof dossierSchema>;

export const careerEventSchema = z.object({
  officerId: z.string().min(1),
  type: z.enum(MANUAL_CAREER_EVENTS),
  effectiveDate: dateInput,
  reference: z.string().trim().min(3, "decision reference is required").max(60),
  reason: optionalText(500),
  toRankId: optionalText(64),
  toPositionId: optionalText(64),
});
export type CareerEventInput = z.infer<typeof careerEventSchema>;

import { z } from "zod";
import { optionalDate, optionalText } from "@/server/action-utils";

export const OFFENSE_CATEGORIES = ["HOMICIDE", "ASSAULT", "SEXUAL_OFFENSE", "ROBBERY", "THEFT", "BURGLARY", "FRAUD", "CORRUPTION", "DRUG_OFFENSE", "TRAFFICKING", "CYBERCRIME", "ARMS_OFFENSE", "KIDNAPPING", "DOMESTIC_VIOLENCE", "TRAFFIC_OFFENSE", "PUBLIC_ORDER", "PROPERTY_DAMAGE", "MISSING_PERSON", "TERRORISM", "OTHER"] as const;
export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export const complaintSchema = z.object({
  complainantId: optionalText(64),
  isAnonymous: z.preprocess((v) => v === "on" || v === "true" || v === "1" || v === true, z.boolean()).default(false),
  category: z.enum(OFFENSE_CATEGORIES).default("OTHER"),
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(20).max(5000),
  incidentAt: optionalDate,
  locationText: optionalText(300),
  stationId: optionalText(64),
  priority: z.enum(PRIORITIES).default("NORMAL"),
  /** "register" submits immediately (REGISTERED); anything else keeps a DRAFT */
  submit: optionalText(16),
});
export type ComplaintInput = z.infer<typeof complaintSchema>;

export const reviewSchema = z.object({ id: z.string().min(1), reviewNotes: optionalText(2000), priority: z.enum(PRIORITIES).optional() });
export const assignSchema = z.object({ id: z.string().min(1), assignedToId: z.string().min(1, "select an investigator"), reviewNotes: optionalText(2000) });
export const closeSchema = z.object({ id: z.string().min(1), outcome: z.enum(["CLOSED", "REJECTED"]), closureReason: z.string().trim().min(5).max(1000) });
export const convertSchema = z.object({ id: z.string().min(1), title: optionalText(200), leadId: optionalText(64), isSensitive: z.preprocess((v) => v === "on" || v === "true" || v === "1" || v === true, z.boolean()).default(false) });

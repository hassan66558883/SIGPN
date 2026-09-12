import { z } from "zod";
import { optionalDate, optionalText } from "@/server/action-utils";
import { OFFENSE_CATEGORIES, PRIORITIES } from "@/server/complaints/schemas";

export const caseSchema = z.object({
  title: z.string().trim().min(5).max(200),
  category: z.enum(OFFENSE_CATEGORIES),
  description: z.string().trim().min(20).max(8000),
  occurredAt: optionalDate,
  locationText: optionalText(300),
  stationId: optionalText(64),
  departmentId: optionalText(64),
  priority: z.enum(PRIORITIES).default("NORMAL"),
  isSensitive: z.preprocess((v) => v === "on" || v === "true" || v === "1" || v === true, z.boolean()).default(false),
  leadId: optionalText(64),
});
export type CaseInput = z.infer<typeof caseSchema>;

export const caseAssignSchema = z.object({ caseId: z.string().min(1), userId: z.string().min(1, "select a user"), role: z.enum(["LEAD", "INVESTIGATOR", "SUPERVISOR", "ANALYST", "SUPPORT"]).default("INVESTIGATOR"), notes: optionalText(300) });
export const partySchema = z.object({ caseId: z.string().min(1), personId: z.string().min(1, "select a person"), role: z.enum(["COMPLAINANT", "VICTIM", "WITNESS", "SUSPECT", "PERSON_OF_INTEREST", "ACCUSED", "OTHER"]), notes: optionalText(1000), injuries: optionalText(500) });
export const partyStatusSchema = z.object({ id: z.string().min(1), status: z.enum(["ACTIVE", "UNDER_INVESTIGATION", "CLEARED", "CHARGED", "REFERRED", "WITHDRAWN"]), notes: optionalText(500) });
export const noteSchema = z.object({ caseId: z.string().min(1), content: z.string().trim().min(3).max(5000), isConfidential: z.preprocess((v) => v === "on" || v === "true" || v === "1" || v === true, z.boolean()).default(false) });
export const taskSchema = z.object({ caseId: z.string().min(1), title: z.string().trim().min(3).max(200), description: optionalText(2000), priority: z.enum(PRIORITIES).default("NORMAL"), assignedToId: optionalText(64), dueAt: optionalDate });
export const taskStatusSchema = z.object({ id: z.string().min(1), status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"]), result: optionalText(2000) });
export const caseStatusSchema = z.object({ caseId: z.string().min(1), status: z.enum(["UNDER_INVESTIGATION", "PENDING_REVIEW", "REFERRED", "CLOSED", "ARCHIVED"]), disposition: z.enum(["SOLVED", "UNSOLVED", "UNFOUNDED", "REFERRED_TO_PROSECUTION", "TRANSFERRED", "DISMISSED", ""]).optional(), notes: optionalText(2000) });

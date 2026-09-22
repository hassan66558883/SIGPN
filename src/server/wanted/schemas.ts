import { z } from "zod";
import { dateInput, optionalDate, optionalText } from "@/server/action-utils";

export const DANGER_LEVELS = ["LOW", "MEDIUM", "HIGH", "EXTREME"] as const;
export const WANTED_STATUSES = ["DRAFT", "PENDING_APPROVAL", "ACTIVE", "LOCATED", "ARRESTED", "CANCELLED", "EXPIRED"] as const;
export const WARRANT_TYPES = ["ARREST", "SEARCH", "DETENTION", "SUMMONS", "SEIZURE", "OTHER"] as const;
export const WARRANT_STATUSES = ["DRAFT", "PENDING_APPROVAL", "ACTIVE", "EXECUTED", "EXPIRED", "CANCELLED", "REJECTED"] as const;

export const wantedPersonSchema = z.object({
  personId: z.string().min(1, "select a person"),
  caseId: optionalText(64),
  stationId: optionalText(64),
  offense: z.string().trim().min(3).max(300),
  reason: z.string().trim().min(10).max(3000),
  dangerLevel: z.enum(DANGER_LEVELS).default("MEDIUM"),
  lastSeenLocation: optionalText(300),
  expiresAt: optionalDate,
});
export type WantedPersonInput = z.infer<typeof wantedPersonSchema>;

export const wantedStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(WANTED_STATUSES),
  closureNotes: optionalText(2000),
});
export type WantedStatusInput = z.infer<typeof wantedStatusSchema>;

export const sightingSchema = z.object({
  wantedPersonId: z.string().min(1),
  location: z.string().trim().min(2).max(300),
  occurredAt: dateInput,
  source: optionalText(120),
  notes: optionalText(1000),
});
export type SightingInput = z.infer<typeof sightingSchema>;

export const wantedVehicleSchema = z.object({
  wantedPersonId: z.string().min(1),
  plateNumber: optionalText(20),
  make: optionalText(60),
  model: optionalText(60),
  color: optionalText(40),
  year: optionalText(4),
  notes: optionalText(300),
});
export type WantedVehicleInput = z.infer<typeof wantedVehicleSchema>;

export const createWarrantSchema = z.object({
  wantedPersonId: z.string().min(1),
  type: z.enum(WARRANT_TYPES).default("ARREST"),
  issuingAuthority: z.string().trim().min(3).max(200),
  issuingAuthorityRef: optionalText(120),
  grounds: z.string().trim().min(10).max(3000),
  targetAddress: optionalText(300),
  expiresAt: optionalDate,
});
export type CreateWarrantInput = z.infer<typeof createWarrantSchema>;

export const warrantStatusSchema = z.object({
  warrantId: z.string().min(1),
  status: z.enum(WARRANT_STATUSES),
  notes: optionalText(2000),
});
export type WarrantStatusInput = z.infer<typeof warrantStatusSchema>;

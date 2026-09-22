import { z } from "zod";
import { checkbox, dateInput, optionalText } from "@/server/action-utils";

export const EVIDENCE_CATEGORIES = ["PHYSICAL", "DOCUMENT", "DIGITAL", "BIOLOGICAL", "WEAPON", "NARCOTICS", "VEHICLE", "CURRENCY", "AUDIO_VIDEO", "OTHER"] as const;
export const CUSTODY_ACTIONS = ["STORED", "TRANSFERRED", "CHECKED_OUT", "CHECKED_IN", "EXAMINED", "RETURNED", "RELEASED", "DESTROYED", "ARCHIVED"] as const;
export const STORAGE_LOCATION_TYPES = ["EVIDENCE_ROOM", "SAFE", "REFRIGERATED", "VEHICLE_LOT", "LABORATORY", "ARMORY", "EXTERNAL"] as const;

export const evidenceSchema = z.object({
  caseId: z.string().min(1, "select a case"),
  category: z.enum(EVIDENCE_CATEGORIES).default("PHYSICAL"),
  description: z.string().trim().min(5).max(2000),
  quantity: optionalText(20),
  unit: optionalText(20),
  sealNumber: optionalText(60),
  collectedAt: dateInput,
  collectedFrom: optionalText(200),
  collectedFromPersonId: optionalText(64),
  condition: optionalText(300),
  currentLocationId: optionalText(64),
  isSensitive: checkbox.default(false),
  notes: optionalText(2000),
});
export type EvidenceInput = z.infer<typeof evidenceSchema>;

export const custodyTransferSchema = z.object({
  evidenceId: z.string().min(1),
  action: z.enum(CUSTODY_ACTIONS),
  toUserId: optionalText(64),
  toLocationId: optionalText(64),
  reason: z.string().trim().min(3).max(500),
  condition: optionalText(300),
  notes: optionalText(1000),
});
export type CustodyTransferInput = z.infer<typeof custodyTransferSchema>;

export const storageLocationSchema = z.object({
  id: optionalText(64),
  stationId: z.string().min(1),
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  type: z.enum(STORAGE_LOCATION_TYPES).default("EVIDENCE_ROOM"),
  description: optionalText(300),
  isActive: checkbox.default(true),
});
export type StorageLocationInput = z.infer<typeof storageLocationSchema>;

import { z } from "zod";
import { optionalText } from "@/server/action-utils";

export const SEARCH_MODES = ["VERIFY_1_1", "IDENTIFY_1_N"] as const;
export const BIOMETRIC_ACTIONS = ["SENT_FOR_VERIFICATION", "VERIFIED_BY_INVESTIGATOR", "REJECTED", "LINKED_TO_CASE"] as const;
export const FINGER_POSITIONS = ["RIGHT_THUMB", "RIGHT_INDEX", "RIGHT_MIDDLE", "RIGHT_RING", "RIGHT_LITTLE", "LEFT_THUMB", "LEFT_INDEX", "LEFT_MIDDLE", "LEFT_RING", "LEFT_LITTLE", "UNKNOWN"] as const;
export const LPR_STATUSES = ["NEW", "REVIEWED", "LINKED_TO_CASE", "DISMISSED"] as const;

/** Mandatory pre-search gate (spec §10): case, reason, officer (from actor) and type are always required. */
export const searchGateSchema = z.object({
  caseId: z.string().min(1, "select a case"),
  reason: z.string().trim().min(10, "explain the reason for this search (min 10 characters)").max(500),
  device: optionalText(120),
  location: optionalText(200),
});

export const fingerprintSearchSchema = searchGateSchema.extend({
  mode: z.enum(SEARCH_MODES),
  position: z.enum(FINGER_POSITIONS).default("UNKNOWN"),
  personId: optionalText(64), // required for VERIFY_1_1, validated in the service
});
export type FingerprintSearchInput = z.infer<typeof fingerprintSearchSchema>;

export const faceSearchSchema = searchGateSchema.extend({
  mode: z.enum(SEARCH_MODES),
  personId: optionalText(64),
});
export type FaceSearchInput = z.infer<typeof faceSearchSchema>;

export const voiceSearchSchema = searchGateSchema.extend({
  mode: z.enum(SEARCH_MODES),
  personId: optionalText(64),
});
export type VoiceSearchInput = z.infer<typeof voiceSearchSchema>;

export const anprDetectSchema = searchGateSchema;
export type AnprDetectInput = z.infer<typeof anprDetectSchema>;

export const anprSearchSchema = searchGateSchema.extend({
  plateNumber: z.string().trim().min(2).max(20),
});
export type AnprSearchInput = z.infer<typeof anprSearchSchema>;

export const enrollFingerprintSchema = z.object({ personId: z.string().min(1), position: z.enum(FINGER_POSITIONS).default("UNKNOWN") });
export type EnrollFingerprintInput = z.infer<typeof enrollFingerprintSchema>;
export const enrollFaceSchema = z.object({ personId: z.string().min(1) });
export type EnrollFaceInput = z.infer<typeof enrollFaceSchema>;
export const enrollVoiceSchema = z.object({ personId: z.string().min(1) });
export type EnrollVoiceInput = z.infer<typeof enrollVoiceSchema>;

export const recordActionSchema = z.object({ searchId: z.string().min(1), action: z.enum(BIOMETRIC_ACTIONS), notes: optionalText(1000) });
export type RecordActionInput = z.infer<typeof recordActionSchema>;

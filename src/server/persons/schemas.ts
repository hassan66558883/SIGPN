import { z } from "zod";
import { optionalDate, optionalText } from "@/server/action-utils";

export const personSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  otherNames: optionalText(120),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]).default("UNKNOWN"),
  dateOfBirth: optionalDate,
  placeOfBirth: optionalText(120),
  nationality: optionalText(60),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "UNKNOWN"]).default("UNKNOWN"),
  occupation: optionalText(100),
  phone: optionalText(30),
  email: optionalText(120),
  address: optionalText(200),
  city: optionalText(100),
  regionId: optionalText(64),
  physicalDescription: optionalText(1000),
  distinguishingMarks: optionalText(500),
  notes: optionalText(2000),
  isDeceased: z.preprocess((v) => v === "on" || v === "true" || v === "1" || v === true, z.boolean()).default(false),
  /** optional first identifier captured with the registration */
  idType: z.enum(["NATIONAL_ID", "PASSPORT", "DRIVER_LICENSE", "VOTER_CARD", "RESIDENCE_PERMIT", "BIRTH_CERTIFICATE", "OTHER", ""]).optional(),
  idValue: optionalText(60),
  /** "1" = the user acknowledged the duplicate warning and wants to create anyway */
  forceCreate: optionalText(2),
});
export type PersonInput = z.infer<typeof personSchema>;

export const identifierSchema = z.object({
  personId: z.string().min(1),
  type: z.enum(["NATIONAL_ID", "PASSPORT", "DRIVER_LICENSE", "VOTER_CARD", "RESIDENCE_PERMIT", "BIRTH_CERTIFICATE", "OTHER"]),
  value: z.string().trim().min(2).max(60),
  issuedBy: optionalText(120),
  issuedAt: optionalDate,
  expiresAt: optionalDate,
});
export type IdentifierInput = z.infer<typeof identifierSchema>;

export const aliasSchema = z.object({ personId: z.string().min(1), alias: z.string().trim().min(2).max(120) });

export const relationshipSchema = z.object({
  fromPersonId: z.string().min(1),
  toPersonId: z.string().min(1),
  type: z.enum(["SPOUSE", "PARENT", "CHILD", "SIBLING", "RELATIVE", "ASSOCIATE", "EMPLOYER", "EMPLOYEE", "NEIGHBOUR", "OTHER"]),
  notes: optionalText(300),
});
export type RelationshipInput = z.infer<typeof relationshipSchema>;

export const mergeSchema = z.object({ keepId: z.string().min(1), mergeId: z.string().min(1), reason: z.string().trim().min(5).max(300) });

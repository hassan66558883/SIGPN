import { z } from "zod";
import { checkbox, optionalDate, optionalText } from "@/server/action-utils";

const code = (max = 20) =>
  z
    .string()
    .trim()
    .min(2)
    .max(max)
    .regex(/^[A-Z0-9][A-Z0-9_-]*$/i, "letters, digits, dash, underscore")
    .transform((s) => s.toUpperCase());

export const organizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  shortName: optionalText(30),
  description: optionalText(500),
});
export type OrganizationInput = z.infer<typeof organizationSchema>;

/** Province (table Region). */
export const regionSchema = z.object({
  code: code(12),
  name: z.string().trim().min(2).max(100),
  capital: optionalText(100),
  isActive: checkbox.default(true),
});
export type RegionInput = z.infer<typeof regionSchema>;

export const adminDepartmentSchema = z.object({
  regionId: z.string().min(1, "province is required"),
  code: code(16),
  name: z.string().trim().min(2).max(120),
  capital: optionalText(100),
  isActive: checkbox.default(true),
});
export type AdminDepartmentInput = z.infer<typeof adminDepartmentSchema>;

export const communeSchema = z.object({
  adminDepartmentId: z.string().min(1, "department is required"),
  code: code(20),
  name: z.string().trim().min(2).max(120),
  type: z.enum(["COMMUNE", "SOUS_PREFECTURE", "ARRONDISSEMENT"]).default("COMMUNE"),
  isActive: checkbox.default(true),
});
export type CommuneInput = z.infer<typeof communeSchema>;

export const localitySchema = z.object({
  communeId: z.string().min(1, "commune is required"),
  code: optionalText(24),
  name: z.string().trim().min(2).max(120),
  type: z.enum(["QUARTIER", "VILLAGE", "CANTON", "LOCALITE"]).default("QUARTIER"),
  isActive: checkbox.default(true),
});
export type LocalityInput = z.infer<typeof localitySchema>;

export const STATION_TYPES = ["HEADQUARTERS", "CENTRAL_DIRECTION", "DELEGATION", "PROVINCIAL_DIRECTION", "DEPARTMENTAL_DIRECTION", "CENTRAL_STATION", "STATION", "POST", "UNIT", "BRIGADE", "SPECIAL_UNIT"] as const;
export const STATION_STATUSES = ["ACTIVE", "INACTIVE", "UNDER_CONSTRUCTION", "PLANNED"] as const;
/** Types that must hang under a parent structure. */
export const CHILD_STATION_TYPES: readonly string[] = ["POST", "UNIT"];

export const stationSchema = z.object({
  regionId: z.string().min(1, "province is required"),
  adminDepartmentId: optionalText(64),
  communeId: optionalText(64),
  localityId: optionalText(64),
  parentId: optionalText(64),
  code: code(16),
  name: z.string().trim().min(2).max(120),
  type: z.enum(STATION_TYPES),
  status: z.enum(STATION_STATUSES).default("ACTIVE"),
  address: optionalText(200),
  city: optionalText(100),
  phone: optionalText(30),
  email: optionalText(120),
  latitude: optionalText(20),
  longitude: optionalText(20),
  commanderId: optionalText(64),
});
export type StationInput = z.infer<typeof stationSchema>;

export const departmentSchema = z.object({
  stationId: z.string().min(1, "station is required"),
  code: code(16),
  name: z.string().trim().min(2).max(120),
  type: z.enum(["COMMAND", "INVESTIGATION", "PATROL", "TRAFFIC", "FORENSICS", "INTELLIGENCE", "CUSTODY", "LOGISTICS", "ADMINISTRATION", "SPECIAL"]),
  headId: optionalText(64),
  isActive: checkbox.default(true),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export const rankSchema = z.object({
  code: code(12),
  name: z.string().trim().min(2).max(80),
  level: z.coerce.number().int().min(1).max(99),
  category: z.enum(["COMMISSIONER", "OFFICER", "INSPECTOR", "NON_COMMISSIONED", "CONSTABLE", "CIVILIAN"]),
  isActive: checkbox.default(true),
});
export type RankInput = z.infer<typeof rankSchema>;

export const officerSchema = z.object({
  badgeNumber: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/i)
    .transform((s) => s.toUpperCase()),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]).default("UNKNOWN"),
  dateOfBirth: optionalDate,
  phone: optionalText(30),
  email: optionalText(120),
  rankId: z.string().min(1, "rank is required"),
  stationId: z.string().min(1, "station is required"),
  departmentId: optionalText(64),
  hiredAt: optionalDate,
  specialties: optionalText(300),
  notes: optionalText(1000),
});
export type OfficerInput = z.infer<typeof officerSchema>;

export const assignmentSchema = z.object({
  officerId: z.string().min(1),
  stationId: z.string().min(1, "station is required"),
  departmentId: optionalText(64),
  rankId: optionalText(64),
  position: optionalText(100),
  startDate: z
    .string()
    .trim()
    .min(1, "start date is required")
    .transform((s) => new Date(s))
    .refine((d) => !Number.isNaN(d.getTime()), "invalid date"),
  reason: optionalText(300),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

export const dutyStatusSchema = z.object({
  officerId: z.string().min(1),
  dutyStatus: z.enum(["ON_DUTY", "OFF_DUTY", "ON_LEAVE", "TRAINING", "SUSPENDED", "RETIRED", "DECEASED"]),
  reason: optionalText(300),
});

import { z } from "zod";
import { checkbox, dateInput, optionalDate, optionalText } from "@/server/action-utils";

export const INCIDENT_TYPES = ["DISTURBANCE", "TRAFFIC_ACCIDENT", "ASSAULT", "THEFT", "FIRE", "MEDICAL", "SUSPICIOUS_ACTIVITY", "PUBLIC_ORDER", "DOMESTIC", "NOISE", "MISSING_PERSON", "OTHER"] as const;
export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const INCIDENT_STATUSES = ["REPORTED", "RESPONDING", "ON_SCENE", "RESOLVED", "ESCALATED", "CLOSED"] as const;
export const SHIFTS = ["MORNING", "AFTERNOON", "NIGHT", "CUSTOM"] as const;
export const PATROL_STATUSES = ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"] as const;

const optionalCoord = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().min(min).max(max).optional(),
  );

export const incidentSchema = z.object({
  type: z.enum(INCIDENT_TYPES).default("OTHER"),
  severity: z.enum(SEVERITIES).default("MEDIUM"),
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(8000),
  occurredAt: dateInput,
  locationText: z.string().trim().min(3).max(300),
  latitude: optionalCoord(-90, 90),
  longitude: optionalCoord(-180, 180),
  stationId: optionalText(64),
  patrolId: optionalText(64),
});
export type IncidentInput = z.infer<typeof incidentSchema>;

export const incidentStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["RESPONDING", "ON_SCENE", "RESOLVED", "CLOSED"]),
  report: optionalText(8000),
});

export const incidentEscalateSchema = z.object({
  id: z.string().min(1),
  title: optionalText(200),
  leadId: optionalText(64),
  isSensitive: checkbox.default(false),
});

export const incidentOfficerSchema = z.object({ incidentId: z.string().min(1), officerId: z.string().min(1, "select an officer"), role: optionalText(60) });
export const incidentPersonSchema = z.object({
  incidentId: z.string().min(1),
  personId: z.string().min(1, "select a person"),
  role: z.enum(["COMPLAINANT", "VICTIM", "WITNESS", "SUSPECT", "PERSON_OF_INTEREST", "ACCUSED", "OTHER"]).default("OTHER"),
  notes: optionalText(1000),
});

export const zoneSchema = z.object({
  id: optionalText(64),
  stationId: z.string().min(1),
  code: z.string().trim().min(1).max(20).regex(/^[A-Z0-9_-]+$/i, "letters, digits, - and _ only"),
  name: z.string().trim().min(2).max(120),
  description: optionalText(500),
  // absent → true (API default); hidden "0" + checkbox "on" from the form; JSON boolean accepted
  isActive: z.preprocess((v) => (v === undefined || v === null ? true : v === true || v === "on" || v === "true" || v === "1"), z.boolean()),
});
export type ZoneInput = z.infer<typeof zoneSchema>;

export const patrolSchema = z.object({
  stationId: optionalText(64),
  zoneId: optionalText(64),
  shift: z.enum(SHIFTS).default("MORNING"),
  mission: z.string().trim().min(5).max(500),
  plannedStart: dateInput,
  plannedEnd: dateInput,
  supervisorId: z.string().min(1, "select a supervisor"),
  vehicleId: optionalText(64),
  notes: optionalText(2000),
});
export type PatrolInput = z.infer<typeof patrolSchema>;

export const patrolStartSchema = z.object({ id: z.string().min(1), startKm: optionalText(10) });
export const patrolCompleteSchema = z.object({ id: z.string().min(1), endKm: optionalText(10), report: z.string().trim().min(10).max(8000) });
export const patrolCancelSchema = z.object({ id: z.string().min(1), reason: z.string().trim().min(5).max(500) });
export const patrolOfficerSchema = z.object({ patrolId: z.string().min(1), officerId: z.string().min(1, "select an officer"), role: optionalText(60) });

export { optionalDate };

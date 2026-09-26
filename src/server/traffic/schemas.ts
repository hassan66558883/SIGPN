import { z } from "zod";
import { checkbox, dateInput, optionalDate, optionalText } from "@/server/action-utils";

export const TRAFFIC_VEHICLE_TYPES = ["CAR", "PICKUP", "MOTORCYCLE", "MOTO_TAXI", "TRICYCLE", "CYCLE", "MINIBUS", "BUS", "TRUCK", "TRACTOR_TRAILER", "OTHER"] as const;
export const TRAFFIC_VEHICLE_STATUSES = ["ACTIVE", "SUSPENDED", "SEIZED", "STOLEN", "SCRAPPED"] as const;
export const TRAFFIC_VEHICLE_DOC_TYPES = ["REGISTRATION_CARD", "INSURANCE", "TECHNICAL_INSPECTION", "BLUE_CARD", "TRANSPORT_LICENSE", "STICKER", "OTHER"] as const;
export const TRAFFIC_FINE_STATUSES = ["PENDING", "TO_PAY", "PARTIALLY_PAID", "PAID", "CONTESTED", "CANCELLED"] as const;
export const TRAFFIC_PAYMENT_METHODS = ["CASH", "ELECTRONIC", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER"] as const;
export const TRAFFIC_CATEGORY_CODES = ["ROAD", "CYCLE_MOTORCYCLE", "MOTO_TAXI"] as const;
export const TRAFFIC_OFFENCE_CLASSES = ["CLASS_2", "CLASS_3", "CLASS_4", "DELIT"] as const;

/** Normalizes a plate number: uppercase, single spaces trimmed (hyphens are kept: TD-1234-AB). */
export function normalizePlate(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  return v ? v : null;
}

const plate = z
  .string()
  .trim()
  .max(20)
  .regex(/^[A-Za-z0-9][A-Za-z0-9 \-]{1,19}$/, "invalid plate")
  .optional()
  .or(z.literal(""));

const numToString = (v: unknown) => (typeof v === "number" ? String(v) : v);

const gps = (min: number, max: number) =>
  z
    .preprocess(numToString, z.string().trim().optional().or(z.literal("")))
    .transform((s) => (s ? Number(s.replace(",", ".")) : null))
    .refine((n) => n === null || (Number.isFinite(n) && n >= min && n <= max), "out of range");

const optionalYear = z
  .preprocess(numToString, z.string().trim().optional().or(z.literal("")))
  .transform((s) => (s ? Number(s) : null))
  .refine((n) => n === null || (Number.isInteger(n) && n >= 1900 && n <= 2100), "invalid year");

/* ------------------------------------------------------------------ drivers */

export const driverFields = {
  licenseNumber: optionalText(40),
  licenseCategory: optionalText(40),
  licenseIssuedAt: optionalDate,
  licenseExpiresAt: optionalDate,
  licenseIssuedBy: optionalText(120),
  notes: optionalText(1000),
};

export const driverCreateSchema = z.object({
  personId: optionalText(64),
  firstName: optionalText(80),
  lastName: optionalText(80),
  dateOfBirth: optionalDate,
  phone: optionalText(40),
  address: optionalText(300),
  cni: optionalText(40),
  ...driverFields,
});
export type DriverCreateInput = z.infer<typeof driverCreateSchema>;

export const driverUpdateSchema = z.object({ id: z.string().min(1), ...driverFields });
export type DriverUpdateInput = z.infer<typeof driverUpdateSchema>;

/* ------------------------------------------------------------------ vehicles */

export const vehicleFields = {
  registrationCardNumber: optionalText(40),
  make: optionalText(60),
  model: optionalText(60),
  color: optionalText(40),
  vehicleType: z.enum(TRAFFIC_VEHICLE_TYPES).default("CAR"),
  year: optionalYear,
  ownerPersonId: optionalText(64),
  chassisNumber: optionalText(40),
  insuranceCompany: optionalText(80),
  insurancePolicyNumber: optionalText(60),
  insuranceExpiresAt: optionalDate,
  technicalInspectionExpiresAt: optionalDate,
  status: z.enum(TRAFFIC_VEHICLE_STATUSES).default("ACTIVE"),
  notes: optionalText(1000),
};

export const vehicleCreateSchema = z.object({ plateNumber: plate.refine((v) => !!v, "required"), ...vehicleFields });
export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;

export const vehicleUpdateSchema = z.object({ id: z.string().min(1), ...vehicleFields });
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;

export const vehicleDocumentSchema = z.object({
  vehicleId: z.string().min(1),
  type: z.enum(TRAFFIC_VEHICLE_DOC_TYPES),
  number: optionalText(60),
  issuedAt: optionalDate,
  expiresAt: optionalDate,
  notes: optionalText(300),
});
export type VehicleDocumentInput = z.infer<typeof vehicleDocumentSchema>;

/* ------------------------------------------------------------------ control + PV */

export const controlSchema = z.object({
  controlledAt: dateInput,
  location: z.string().trim().min(2, "required").max(300),
  latitude: gps(-90, 90),
  longitude: gps(-180, 180),
  stationId: optionalText(64),
  // driver: an existing person, or inline identity (a person is found by CNI / licence, else created)
  driverPersonId: optionalText(64),
  driverFirstName: optionalText(80),
  driverLastName: optionalText(80),
  driverBirthDate: optionalDate,
  driverPhone: optionalText(40),
  driverAddress: optionalText(300),
  driverCni: optionalText(40),
  licenseNumber: optionalText(40),
  licenseCategory: optionalText(40),
  licenseIssuedAt: optionalDate,
  licenseExpiresAt: optionalDate,
  // vehicle: an existing record, or inline (found by plate, else created)
  vehicleId: optionalText(64),
  plateNumber: plate,
  vehicleType: z.enum(TRAFFIC_VEHICLE_TYPES).default("CAR"),
  vehicleMake: optionalText(60),
  vehicleModel: optionalText(60),
  vehicleColor: optionalText(40),
  vehicleYear: optionalYear,
  registrationCardNumber: optionalText(40),
  observations: optionalText(2000),
  caseId: optionalText(64),
  incidentId: optionalText(64),
  violationIds: z.array(z.string().min(1)).max(20).default([]),
});
export type ControlInput = z.infer<typeof controlSchema>;

export const ticketCancelSchema = z.object({ ticketId: z.string().min(1), reason: z.string().trim().min(10, "min 10 characters").max(1000) });
export type TicketCancelInput = z.infer<typeof ticketCancelSchema>;

export const evidenceSchema = z.object({ controlId: z.string().min(1), caption: optionalText(300), latitude: gps(-90, 90), longitude: gps(-180, 180) });
export type EvidenceInput = z.infer<typeof evidenceSchema>;

export const openCaseSchema = z.object({ ticketId: z.string().min(1), title: optionalText(200), description: optionalText(4000) });

/* ------------------------------------------------------------------ fines + payments */

export const fineStatusSchema = z.object({
  fineId: z.string().min(1),
  status: z.enum(TRAFFIC_FINE_STATUSES),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type FineStatusInput = z.infer<typeof fineStatusSchema>;

export const paymentSchema = z.object({
  fineId: z.string().min(1),
  amountFcfa: z.coerce.number().int().min(1, "amount required").max(100_000_000),
  method: z.enum(TRAFFIC_PAYMENT_METHODS),
  provider: optionalText(80),
  transactionReference: optionalText(80),
  paidAt: optionalDate,
  paymentPoint: optionalText(120),
  notes: optionalText(500),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const paymentVoidSchema = z.object({ paymentId: z.string().min(1), reason: z.string().trim().min(10, "min 10 characters").max(1000) });
export type PaymentVoidInput = z.infer<typeof paymentVoidSchema>;

export const violationToggleSchema = z.object({ id: z.string().min(1), isActive: checkbox });

/* ------------------------------------------------------------------ list filters */

export const TRAFFIC_LIST_PAGE_SIZE = 25;

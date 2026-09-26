import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma, type Db } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError, NotFoundError } from "@/server/errors";
import type { Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import { resolveTrafficStation } from "@/server/traffic/scope";
import { normalizePlate, type DriverCreateInput, type DriverUpdateInput, type VehicleCreateInput, type VehicleDocumentInput, type VehicleUpdateInput } from "@/server/traffic/schemas";

const nul = (v: string | undefined | null) => (v ? v : null);

export type DriverIdentity = {
  personId?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date | null;
  phone?: string;
  address?: string;
  cni?: string;
  licenseNumber?: string;
  licenseCategory?: string;
  licenseIssuedAt?: Date | null;
  licenseExpiresAt?: Date | null;
  licenseIssuedBy?: string;
};

type ResolvedPerson = { id: string; number: string; firstName: string; lastName: string; created: boolean };

/**
 * Finds the person behind a driver identity, or registers one. Reuses the shared persons register:
 * a person is matched by id, then by CNI, then by licence number, and only created when none matches
 * (never a duplicate of an identifier that already exists).
 */
export async function resolveDriverPerson(tx: Db, actor: Actor, station: { id: string; regionId: string }, i: DriverIdentity, context: string): Promise<ResolvedPerson | null> {
  const pick = { id: true, number: true, firstName: true, lastName: true } as const;
  let person: { id: string; number: string; firstName: string; lastName: string } | null = null;
  let created = false;
  if (i.personId) {
    person = await tx.person.findFirst({ where: { id: i.personId, deletedAt: null, mergedIntoId: null }, select: pick });
    if (!person) throw new BusinessError("Selected person is invalid, merged or removed.");
  }
  if (!person && i.cni) {
    const idr = await tx.personIdentifier.findUnique({ where: { type_value: { type: "NATIONAL_ID", value: i.cni.trim() } }, select: { person: { select: { ...pick, deletedAt: true, mergedIntoId: true } } } });
    if (idr && !idr.person.deletedAt && !idr.person.mergedIntoId) person = idr.person;
  }
  if (!person && i.licenseNumber) {
    const drv = await tx.trafficDriver.findUnique({ where: { licenseNumber: i.licenseNumber.trim() }, select: { person: { select: pick } } });
    if (drv) person = drv.person;
  }
  if (!person) {
    if (!i.firstName || !i.lastName) return null;
    const number = await nextNumber("PERSON", tx);
    const p = await tx.person.create({
      data: { number, firstName: i.firstName, lastName: i.lastName, dateOfBirth: i.dateOfBirth ?? null, phone: nul(i.phone), address: nul(i.address), nationality: "Tchadienne", regionId: station.regionId, stationId: station.id, createdById: actor.id },
      select: pick,
    });
    await logAudit({ actor, action: "PERSON_CREATED", module: "persons", entityType: "Person", entityId: p.id, entityLabel: p.number, summary: `Person ${p.number} — ${p.firstName} ${p.lastName} registered from ${context}`, after: { source: "traffic" }, context: null }, tx);
    person = p;
    created = true;
  }
  if (i.cni && !(await tx.personIdentifier.findFirst({ where: { personId: person.id, type: "NATIONAL_ID", value: i.cni.trim() }, select: { id: true } }))) {
    const clash = await tx.personIdentifier.findUnique({ where: { type_value: { type: "NATIONAL_ID", value: i.cni.trim() } }, select: { id: true } });
    if (clash) throw new BusinessError("This CNI number already belongs to another person.", "CONFLICT");
    await tx.personIdentifier.create({ data: { personId: person.id, type: "NATIONAL_ID", value: i.cni.trim() } });
  }
  return { ...person, created };
}

/** Creates or completes the driver profile of a person from the licence fields that were provided. */
export async function upsertDriverProfile(tx: Db, actor: Actor, personId: string, i: DriverIdentity): Promise<{ id: string } | null> {
  const has = i.licenseNumber || i.licenseCategory || i.licenseIssuedAt || i.licenseExpiresAt || i.licenseIssuedBy;
  const existing = await tx.trafficDriver.findUnique({ where: { personId }, select: { id: true, licenseNumber: true } });
  if (!has && !existing) return null;
  const licenseNumber = nul(i.licenseNumber?.trim());
  if (licenseNumber && licenseNumber !== existing?.licenseNumber) {
    const clash = await tx.trafficDriver.findUnique({ where: { licenseNumber }, select: { personId: true } });
    if (clash && clash.personId !== personId) throw new BusinessError("This licence number already belongs to another driver.", "CONFLICT");
    const idClash = await tx.personIdentifier.findUnique({ where: { type_value: { type: "DRIVER_LICENSE", value: licenseNumber } }, select: { personId: true } });
    if (idClash && idClash.personId !== personId) throw new BusinessError("This licence number already belongs to another person.", "CONFLICT");
    if (!idClash) await tx.personIdentifier.create({ data: { personId, type: "DRIVER_LICENSE", value: licenseNumber, issuedAt: i.licenseIssuedAt ?? null, expiresAt: i.licenseExpiresAt ?? null } });
  }
  const data = {
    ...(licenseNumber ? { licenseNumber } : {}),
    ...(i.licenseCategory ? { licenseCategory: i.licenseCategory } : {}),
    ...(i.licenseIssuedAt ? { licenseIssuedAt: i.licenseIssuedAt } : {}),
    ...(i.licenseExpiresAt ? { licenseExpiresAt: i.licenseExpiresAt } : {}),
    ...(i.licenseIssuedBy ? { licenseIssuedBy: i.licenseIssuedBy } : {}),
  };
  if (existing) {
    if (Object.keys(data).length) await tx.trafficDriver.update({ where: { id: existing.id }, data });
    return { id: existing.id };
  }
  const drv = await tx.trafficDriver.create({ data: { personId, createdById: actor.id, ...data }, select: { id: true } });
  await logAudit({ actor, action: "TRAFFIC_DRIVER_CREATED", module: "traffic", entityType: "TrafficDriver", entityId: drv.id, entityLabel: licenseNumber, summary: `Driver profile created${licenseNumber ? ` (licence ${licenseNumber})` : ""}`, after: { personId, ...data }, context: null }, tx);
  return drv;
}

export type VehicleIdentity = { vehicleId?: string; plateNumber?: string; vehicleType: VehicleCreateInput["vehicleType"]; make?: string; model?: string; color?: string; year?: number | null; registrationCardNumber?: string; ownerPersonId?: string };

/** Finds a vehicle by id or plate, or registers it. A vehicle without plate (cycles) is not registered. */
export async function resolveVehicle(tx: Db, actor: Actor, i: VehicleIdentity, context: string): Promise<{ id: string; plateNumber: string; created: boolean } | null> {
  if (i.vehicleId) {
    const v = await tx.trafficVehicle.findUnique({ where: { id: i.vehicleId }, select: { id: true, plateNumber: true } });
    if (!v) throw new BusinessError("Selected vehicle is invalid.");
    return { ...v, created: false };
  }
  const plate = normalizePlate(i.plateNumber);
  if (!plate) return null;
  const found = await tx.trafficVehicle.findUnique({ where: { plateNumber: plate }, select: { id: true, plateNumber: true, make: true, model: true, color: true, year: true, registrationCardNumber: true } });
  if (found) {
    const fill: Prisma.TrafficVehicleUpdateInput = {};
    if (!found.make && i.make) fill.make = i.make;
    if (!found.model && i.model) fill.model = i.model;
    if (!found.color && i.color) fill.color = i.color;
    if (!found.year && i.year) fill.year = i.year;
    if (!found.registrationCardNumber && i.registrationCardNumber) {
      const clash = await tx.trafficVehicle.findUnique({ where: { registrationCardNumber: i.registrationCardNumber }, select: { id: true } });
      if (!clash) fill.registrationCardNumber = i.registrationCardNumber;
    }
    if (Object.keys(fill).length) await tx.trafficVehicle.update({ where: { id: found.id }, data: fill });
    return { id: found.id, plateNumber: found.plateNumber, created: false };
  }
  if (i.registrationCardNumber && (await tx.trafficVehicle.findUnique({ where: { registrationCardNumber: i.registrationCardNumber }, select: { id: true } }))) throw new BusinessError("This registration card number already belongs to another vehicle.", "CONFLICT");
  const v = await tx.trafficVehicle.create({
    data: { plateNumber: plate, vehicleType: i.vehicleType, make: nul(i.make), model: nul(i.model), color: nul(i.color), year: i.year ?? null, registrationCardNumber: nul(i.registrationCardNumber), ownerPersonId: nul(i.ownerPersonId), createdById: actor.id },
    select: { id: true, plateNumber: true },
  });
  await logAudit({ actor, action: "TRAFFIC_VEHICLE_CREATED", module: "traffic", entityType: "TrafficVehicle", entityId: v.id, entityLabel: v.plateNumber, summary: `Vehicle ${v.plateNumber} registered from ${context}`, after: { plateNumber: v.plateNumber, type: i.vehicleType }, context: null }, tx);
  return { ...v, created: true };
}

/* ------------------------------------------------------------------ drivers (service) */

export async function createDriver(actor: Actor, input: DriverCreateInput, ctx: RequestContext) {
  const station = await resolveTrafficStation(actor, null);
  const id: DriverIdentity = { personId: nul(input.personId) ?? undefined, firstName: nul(input.firstName) ?? undefined, lastName: nul(input.lastName) ?? undefined, dateOfBirth: input.dateOfBirth, phone: nul(input.phone) ?? undefined, address: nul(input.address) ?? undefined, cni: nul(input.cni) ?? undefined, licenseNumber: nul(input.licenseNumber) ?? undefined, licenseCategory: nul(input.licenseCategory) ?? undefined, licenseIssuedAt: input.licenseIssuedAt, licenseExpiresAt: input.licenseExpiresAt };
  return prisma.$transaction(async (tx) => {
    const person = await resolveDriverPerson(tx, actor, station, id, "the driver register");
    if (!person) throw new BusinessError("Select a person or enter the first and last name of the driver.");
    if (await tx.trafficDriver.findUnique({ where: { personId: person.id }, select: { id: true } })) throw new BusinessError("A driver profile already exists for this person.", "CONFLICT");
    if (!id.licenseNumber && !id.licenseCategory && !id.licenseIssuedAt && !id.licenseExpiresAt) throw new BusinessError("Enter at least the licence number or category to create a driver profile.");
    const drv = await upsertDriverProfile(tx, actor, person.id, id);
    if (input.notes) await tx.trafficDriver.update({ where: { id: drv!.id }, data: { notes: input.notes } });
    await logAudit({ actor, action: "TRAFFIC_DRIVER_REGISTERED", module: "traffic", entityType: "TrafficDriver", entityId: drv!.id, entityLabel: person.number, summary: `Driver profile registered for ${person.number} — ${person.firstName} ${person.lastName}`, context: ctx }, tx);
    return { id: drv!.id, personId: person.id };
  });
}

export async function updateDriver(actor: Actor, input: DriverUpdateInput, ctx: RequestContext) {
  const before = await prisma.trafficDriver.findUnique({ where: { id: input.id }, select: { id: true, personId: true, licenseNumber: true, licenseCategory: true, licenseIssuedAt: true, licenseExpiresAt: true, licenseIssuedBy: true, notes: true, person: { select: { number: true } } } });
  if (!before) throw new NotFoundError("TrafficDriver");
  await prisma.$transaction(async (tx) => {
    await upsertDriverProfile(tx, actor, before.personId, { licenseNumber: nul(input.licenseNumber) ?? undefined, licenseCategory: nul(input.licenseCategory) ?? undefined, licenseIssuedAt: input.licenseIssuedAt, licenseExpiresAt: input.licenseExpiresAt, licenseIssuedBy: nul(input.licenseIssuedBy) ?? undefined });
    if (input.notes !== undefined) await tx.trafficDriver.update({ where: { id: before.id }, data: { notes: nul(input.notes) } });
    await logAudit({ actor, action: "TRAFFIC_DRIVER_UPDATED", module: "traffic", entityType: "TrafficDriver", entityId: before.id, entityLabel: before.person.number, summary: `Driver profile of ${before.person.number} updated`, before: { licenseNumber: before.licenseNumber, licenseCategory: before.licenseCategory, licenseExpiresAt: before.licenseExpiresAt }, after: { licenseNumber: input.licenseNumber || before.licenseNumber, licenseCategory: input.licenseCategory || before.licenseCategory, licenseExpiresAt: input.licenseExpiresAt ?? before.licenseExpiresAt }, context: ctx }, tx);
  });
}

/* ------------------------------------------------------------------ vehicles (service) */

export async function createVehicle(actor: Actor, input: VehicleCreateInput, ctx: RequestContext) {
  const plate = normalizePlate(input.plateNumber);
  if (!plate) throw new BusinessError("The registration number is required.");
  return prisma.$transaction(async (tx) => {
    if (await tx.trafficVehicle.findUnique({ where: { plateNumber: plate }, select: { id: true } })) throw new BusinessError("A vehicle with this registration number already exists.", "CONFLICT");
    if (input.chassisNumber && (await tx.trafficVehicle.findUnique({ where: { chassisNumber: input.chassisNumber }, select: { id: true } }))) throw new BusinessError("This chassis number already belongs to another vehicle.", "CONFLICT");
    if (input.registrationCardNumber && (await tx.trafficVehicle.findUnique({ where: { registrationCardNumber: input.registrationCardNumber }, select: { id: true } }))) throw new BusinessError("This registration card number already belongs to another vehicle.", "CONFLICT");
    if (input.ownerPersonId && !(await tx.person.findFirst({ where: { id: input.ownerPersonId, deletedAt: null, mergedIntoId: null }, select: { id: true } }))) throw new BusinessError("Selected owner is invalid.");
    const v = await tx.trafficVehicle.create({
      data: { plateNumber: plate, registrationCardNumber: nul(input.registrationCardNumber), make: nul(input.make), model: nul(input.model), color: nul(input.color), vehicleType: input.vehicleType, year: input.year, ownerPersonId: nul(input.ownerPersonId), chassisNumber: nul(input.chassisNumber), insuranceCompany: nul(input.insuranceCompany), insurancePolicyNumber: nul(input.insurancePolicyNumber), insuranceExpiresAt: input.insuranceExpiresAt, technicalInspectionExpiresAt: input.technicalInspectionExpiresAt, status: input.status, notes: nul(input.notes), createdById: actor.id },
      select: { id: true, plateNumber: true },
    });
    await logAudit({ actor, action: "TRAFFIC_VEHICLE_CREATED", module: "traffic", entityType: "TrafficVehicle", entityId: v.id, entityLabel: v.plateNumber, summary: `Vehicle ${v.plateNumber} registered`, after: { plateNumber: v.plateNumber, make: input.make, model: input.model, type: input.vehicleType }, context: ctx }, tx);
    return v;
  });
}

export async function updateVehicle(actor: Actor, input: VehicleUpdateInput, ctx: RequestContext) {
  const before = await prisma.trafficVehicle.findUnique({ where: { id: input.id }, select: { id: true, plateNumber: true, status: true, make: true, model: true, color: true, ownerPersonId: true, insuranceExpiresAt: true, technicalInspectionExpiresAt: true } });
  if (!before) throw new NotFoundError("TrafficVehicle");
  return prisma.$transaction(async (tx) => {
    if (input.chassisNumber) {
      const c = await tx.trafficVehicle.findUnique({ where: { chassisNumber: input.chassisNumber }, select: { id: true } });
      if (c && c.id !== before.id) throw new BusinessError("This chassis number already belongs to another vehicle.", "CONFLICT");
    }
    if (input.registrationCardNumber) {
      const c = await tx.trafficVehicle.findUnique({ where: { registrationCardNumber: input.registrationCardNumber }, select: { id: true } });
      if (c && c.id !== before.id) throw new BusinessError("This registration card number already belongs to another vehicle.", "CONFLICT");
    }
    if (input.ownerPersonId && !(await tx.person.findFirst({ where: { id: input.ownerPersonId, deletedAt: null, mergedIntoId: null }, select: { id: true } }))) throw new BusinessError("Selected owner is invalid.");
    const v = await tx.trafficVehicle.update({
      where: { id: before.id },
      data: { registrationCardNumber: nul(input.registrationCardNumber), make: nul(input.make), model: nul(input.model), color: nul(input.color), vehicleType: input.vehicleType, year: input.year, ownerPersonId: nul(input.ownerPersonId), chassisNumber: nul(input.chassisNumber), insuranceCompany: nul(input.insuranceCompany), insurancePolicyNumber: nul(input.insurancePolicyNumber), insuranceExpiresAt: input.insuranceExpiresAt, technicalInspectionExpiresAt: input.technicalInspectionExpiresAt, status: input.status, notes: nul(input.notes) },
      select: { id: true, plateNumber: true, status: true, make: true, model: true, color: true, ownerPersonId: true, insuranceExpiresAt: true, technicalInspectionExpiresAt: true },
    });
    await logAudit({ actor, action: before.status !== v.status ? `TRAFFIC_VEHICLE_${v.status}` : "TRAFFIC_VEHICLE_UPDATED", module: "traffic", entityType: "TrafficVehicle", entityId: v.id, entityLabel: v.plateNumber, summary: `Vehicle ${v.plateNumber} updated${before.status !== v.status ? ` (status ${before.status} → ${v.status})` : ""}`, before, after: v, context: ctx }, tx);
    return v;
  });
}

export async function addVehicleDocument(actor: Actor, input: VehicleDocumentInput, ctx: RequestContext) {
  const v = await prisma.trafficVehicle.findUnique({ where: { id: input.vehicleId }, select: { id: true, plateNumber: true } });
  if (!v) throw new NotFoundError("TrafficVehicle");
  return prisma.$transaction(async (tx) => {
    const d = await tx.trafficVehicleDocument.create({ data: { vehicleId: v.id, type: input.type, number: nul(input.number), issuedAt: input.issuedAt, expiresAt: input.expiresAt, notes: nul(input.notes) } });
    // The registry columns used by the control screen stay in sync with the latest insurance / inspection document.
    if (input.type === "INSURANCE" && input.expiresAt) await tx.trafficVehicle.update({ where: { id: v.id }, data: { insuranceExpiresAt: input.expiresAt } });
    if (input.type === "TECHNICAL_INSPECTION" && input.expiresAt) await tx.trafficVehicle.update({ where: { id: v.id }, data: { technicalInspectionExpiresAt: input.expiresAt } });
    await logAudit({ actor, action: "TRAFFIC_VEHICLE_DOCUMENT_ADDED", module: "traffic", entityType: "TrafficVehicle", entityId: v.id, entityLabel: v.plateNumber, summary: `${v.plateNumber}: document ${input.type}${input.number ? ` n° ${input.number}` : ""} recorded`, after: { type: input.type, number: input.number, expiresAt: input.expiresAt }, context: ctx }, tx);
    return d;
  });
}

/* ------------------------------------------------------------------ offence catalogue (activation only) */

/** The only locally managed attribute of the catalogue: an administrator may deactivate an offence (never edit it). */
export async function setViolationActive(actor: Actor, id: string, isActive: boolean, ctx: RequestContext) {
  const v = await prisma.trafficViolation.findUnique({ where: { id }, select: { id: true, code: true, name: true, isActive: true } });
  if (!v) throw new NotFoundError("TrafficViolation");
  if (v.isActive === isActive) return v;
  await prisma.$transaction(async (tx) => {
    await tx.trafficViolation.update({ where: { id }, data: { isActive } });
    await logAudit({ actor, action: isActive ? "TRAFFIC_VIOLATION_ACTIVATED" : "TRAFFIC_VIOLATION_DEACTIVATED", module: "traffic", entityType: "TrafficViolation", entityId: v.id, entityLabel: v.code, summary: `Offence ${v.code} « ${v.name} » ${isActive ? "activated" : "deactivated"}`, before: { isActive: v.isActive }, after: { isActive }, context: ctx }, tx);
  });
  return { ...v, isActive };
}

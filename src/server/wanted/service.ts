import "server-only";
import type { Prisma, WantedStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError, NotFoundError } from "@/server/errors";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import { saveUpload } from "@/server/storage";
import type { CreateWarrantInput, SightingInput, WantedPersonInput, WantedStatusInput, WantedVehicleInput, WarrantStatusInput } from "@/server/wanted/schemas";

export function wantedScopeWhere(actor: Actor): Prisma.WantedPersonWhereInput {
  return scopeWhere(actor) as Prisma.WantedPersonWhereInput;
}

async function resolveStation(actor: Actor, stationId: string | null, what: string) {
  const id = stationId ?? actor.stationId;
  if (!id) throw new BusinessError(`Select the station in charge of the ${what}.`);
  const st = await prisma.station.findUnique({ where: { id }, select: { id: true, regionId: true, isActive: true, name: true, code: true } });
  if (!st || !st.isActive) throw new BusinessError("Selected station is invalid or inactive.");
  if (!inScope(actor, { stationId: st.id, regionId: st.regionId })) throw new BusinessError(`You can only record ${what}s for a station inside your scope.`, "STATE");
  return st;
}

export const wantedSelect = {
  id: true,
  number: true,
  personId: true,
  caseId: true,
  stationId: true,
  regionId: true,
  offense: true,
  reason: true,
  dangerLevel: true,
  status: true,
  lastSeenLocation: true,
  lastSeenAt: true,
  warrantId: true,
  mainPhotoDocumentId: true,
  issuedAt: true,
  expiresAt: true,
  closedAt: true,
  closureNotes: true,
  createdAt: true,
  updatedAt: true,
  person: { select: { id: true, number: true, firstName: true, lastName: true, dateOfBirth: true, gender: true, nationality: true, physicalDescription: true, distinguishingMarks: true, address: true, city: true, phone: true, aliases: { select: { alias: true } }, identifiers: { select: { type: true, value: true } } } },
  case: { select: { id: true, number: true, title: true, status: true } },
  station: { select: { id: true, code: true, name: true } },
  issuedBy: { select: { id: true, username: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, username: true, firstName: true, lastName: true } },
  warrant: { select: { id: true, number: true, type: true, status: true, issuingAuthority: true, issuingAuthorityRef: true, issuedAt: true, expiresAt: true, grounds: true, documents: { select: { id: true, title: true, versions: { orderBy: { version: "desc" }, take: 1, select: { fileName: true, storagePath: true } } } } } },
  mainPhoto: { select: { id: true, versions: { orderBy: { version: "desc" }, take: 1, select: { storagePath: true, fileName: true } } } },
  photos: { orderBy: { createdAt: "desc" }, select: { id: true, title: true, createdAt: true, uploadedBy: { select: { firstName: true, lastName: true } }, versions: { orderBy: { version: "desc" }, take: 1, select: { fileName: true, storagePath: true, sizeBytes: true } } } },
  sightings: { orderBy: { occurredAt: "desc" }, select: { id: true, location: true, occurredAt: true, source: true, notes: true, officer: { select: { firstName: true, lastName: true } } } },
  vehicles: { orderBy: { createdAt: "desc" }, select: { id: true, plateNumber: true, make: true, model: true, color: true, year: true, notes: true } },
} satisfies Prisma.WantedPersonSelect;

export async function getWantedPerson(actor: Actor, id: string) {
  const w = await prisma.wantedPerson.findUnique({ where: { id }, select: wantedSelect });
  if (!w || !inScope(actor, { stationId: w.stationId, regionId: w.regionId })) throw new NotFoundError("WantedPerson");
  return w;
}

export async function createWantedPerson(actor: Actor, input: WantedPersonInput, ctx: RequestContext) {
  const st = await resolveStation(actor, input.stationId || null, "wanted notice");
  const person = await prisma.person.findUnique({ where: { id: input.personId }, select: { id: true, number: true, firstName: true, lastName: true } });
  if (!person) throw new BusinessError("Selected person is invalid.");
  if (input.caseId) {
    const kase = await prisma.case.findUnique({ where: { id: input.caseId }, select: { id: true, stationId: true, regionId: true } });
    if (!kase || !inScope(actor, { stationId: kase.stationId, regionId: kase.regionId })) throw new BusinessError("Selected case is invalid or outside your scope.");
  }
  const created = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("WANTED", tx);
    const w = await tx.wantedPerson.create({
      data: {
        number,
        personId: person.id,
        caseId: input.caseId || null,
        stationId: st.id,
        regionId: st.regionId,
        offense: input.offense,
        reason: input.reason,
        dangerLevel: input.dangerLevel,
        lastSeenLocation: input.lastSeenLocation || null,
        expiresAt: input.expiresAt,
        issuedById: actor.id,
      },
      select: wantedSelect,
    });
    await logAudit({ actor, action: "WANTED_CREATED", module: "wanted", entityType: "WantedPerson", entityId: w.id, entityLabel: w.number, summary: `Wanted notice ${w.number} drafted for ${person.number} — ${person.firstName} ${person.lastName} (${input.offense})`, after: { offense: w.offense, dangerLevel: w.dangerLevel }, context: ctx }, tx);
    return w;
  });
  return created;
}

export async function updateWantedPerson(actor: Actor, id: string, input: Omit<WantedPersonInput, "personId" | "stationId">, ctx: RequestContext) {
  const before = await getWantedPerson(actor, id);
  if (before.status === "ARRESTED" || before.status === "CANCELLED" || before.status === "EXPIRED") throw new BusinessError(`A wanted notice in status ${before.status} can no longer be edited.`, "STATE");
  const after = await prisma.wantedPerson.update({ where: { id }, data: { offense: input.offense, reason: input.reason, dangerLevel: input.dangerLevel, lastSeenLocation: input.lastSeenLocation || null, expiresAt: input.expiresAt }, select: wantedSelect });
  await logAudit({ actor, action: "WANTED_UPDATED", module: "wanted", entityType: "WantedPerson", entityId: id, entityLabel: after.number, summary: `Wanted notice ${after.number} updated`, before: { offense: before.offense, dangerLevel: before.dangerLevel }, after: { offense: after.offense, dangerLevel: after.dangerLevel }, context: ctx });
  return after;
}

const WANTED_TRANSITIONS: Record<WantedStatus, WantedStatus[]> = {
  DRAFT: ["PENDING_APPROVAL", "ACTIVE", "CANCELLED"],
  PENDING_APPROVAL: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["LOCATED", "ARRESTED", "CANCELLED", "EXPIRED"],
  LOCATED: ["ARRESTED", "ACTIVE", "CANCELLED", "EXPIRED"],
  ARRESTED: [],
  CANCELLED: [],
  EXPIRED: ["ACTIVE"],
};
const APPROVAL_TARGETS = new Set<WantedStatus>(["PENDING_APPROVAL", "ACTIVE"]);

/** Status changes out of DRAFT/PENDING_APPROVAL need wanted:approve (publishing an active notice);
 * every other transition (located/apprehended/cancelled/expired/reactivated) needs wanted:status. */
export async function setWantedStatus(actor: Actor, input: WantedStatusInput, ctx: RequestContext) {
  const before = await getWantedPerson(actor, input.id);
  if (!WANTED_TRANSITIONS[before.status].includes(input.status)) throw new BusinessError(`Cannot move a wanted notice from ${before.status} to ${input.status}.`, "STATE");
  const isApprovalStep = (before.status === "DRAFT" || before.status === "PENDING_APPROVAL") && APPROVAL_TARGETS.has(input.status);
  const required = isApprovalStep ? "wanted:approve" : "wanted:status";
  if (!actor.permissions.has(required)) throw new AuthError("forbidden", `Permission ${required} required`);
  const closing = input.status === "CANCELLED" || input.status === "ARRESTED" || input.status === "EXPIRED";
  const r = await prisma.wantedPerson.updateMany({
    where: { id: before.id, status: before.status },
    data: { status: input.status, approvedById: isApprovalStep ? actor.id : undefined, approvedAt: isApprovalStep ? new Date() : undefined, closedAt: closing ? new Date() : null, closureNotes: closing ? input.closureNotes || null : null },
  });
  if (r.count !== 1) throw new BusinessError("The wanted notice was modified concurrently. Reload and retry.", "CONFLICT");
  await logAudit({ actor, action: `WANTED_${input.status}`, module: "wanted", entityType: "WantedPerson", entityId: before.id, entityLabel: before.number, summary: `${before.number}: ${before.status} → ${input.status}${input.closureNotes ? ` — ${input.closureNotes}` : ""}`, before: { status: before.status }, after: { status: input.status }, context: ctx });
  return getWantedPerson(actor, before.id);
}

export async function addSighting(actor: Actor, input: SightingInput, ctx: RequestContext) {
  const w = await getWantedPerson(actor, input.wantedPersonId);
  const s = await prisma.$transaction(async (tx) => {
    const created = await tx.wantedSighting.create({ data: { wantedPersonId: w.id, location: input.location, occurredAt: input.occurredAt, source: input.source || null, officerId: actor.id, notes: input.notes || null } });
    if (!w.lastSeenAt || input.occurredAt > w.lastSeenAt) await tx.wantedPerson.update({ where: { id: w.id }, data: { lastSeenLocation: input.location, lastSeenAt: input.occurredAt } });
    await logAudit({ actor, action: "WANTED_SIGHTING_ADDED", module: "wanted", entityType: "WantedPerson", entityId: w.id, entityLabel: w.number, summary: `${w.number}: sighting recorded at ${input.location}`, after: { location: input.location, occurredAt: input.occurredAt }, context: ctx }, tx);
    return created;
  });
  return s;
}

export async function addVehicle(actor: Actor, input: WantedVehicleInput, ctx: RequestContext) {
  const w = await getWantedPerson(actor, input.wantedPersonId);
  const year = input.year ? Number(input.year) : null;
  const v = await prisma.wantedVehicle.create({ data: { wantedPersonId: w.id, plateNumber: input.plateNumber ? input.plateNumber.toUpperCase() : null, make: input.make || null, model: input.model || null, color: input.color || null, year, notes: input.notes || null, addedById: actor.id } });
  await logAudit({ actor, action: "WANTED_VEHICLE_ADDED", module: "wanted", entityType: "WantedPerson", entityId: w.id, entityLabel: w.number, summary: `${w.number}: vehicle associated${input.plateNumber ? ` — ${input.plateNumber.toUpperCase()}` : ""}`, after: { plateNumber: input.plateNumber, make: input.make, model: input.model }, context: ctx });
  return v;
}

export async function attachPhoto(actor: Actor, wantedPersonId: string, file: File, setAsMain: boolean, ctx: RequestContext) {
  const w = await getWantedPerson(actor, wantedPersonId);
  const upload = await saveUpload("wanted", file);
  const doc = await prisma.$transaction(async (tx) => {
    const d = await tx.document.create({ data: { title: `${w.number} — photo`, entityType: "WANTED_PERSON", entityId: w.id, category: "PHOTO", uploadedById: actor.id, stationId: w.stationId, wantedPersonId: w.id } });
    await tx.documentVersion.create({ data: { documentId: d.id, version: 1, fileName: file.name, mimeType: upload.mimeType, sizeBytes: upload.size, storagePath: upload.relPath, sha256: upload.sha256, uploadedById: actor.id } });
    if (setAsMain) await tx.wantedPerson.update({ where: { id: w.id }, data: { mainPhotoDocumentId: d.id } });
    await logAudit({ actor, action: setAsMain ? "WANTED_MAIN_PHOTO_SET" : "WANTED_PHOTO_ADDED", module: "wanted", entityType: "WantedPerson", entityId: w.id, entityLabel: w.number, summary: `${w.number}: ${setAsMain ? "main photo updated" : "photo added"} (${file.name})`, context: ctx }, tx);
    return d;
  });
  return doc;
}

/* ------------------------------------------------------------------ warrant (reuses the existing Warrant model) */

export async function createWarrantForWantedPerson(actor: Actor, input: CreateWarrantInput, ctx: RequestContext) {
  const w = await getWantedPerson(actor, input.wantedPersonId);
  if (w.warrantId) throw new BusinessError("This wanted notice is already linked to a warrant.", "STATE");
  const warrant = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("WARRANT", tx);
    const wr = await tx.warrant.create({ data: { number, type: input.type, personId: w.personId, caseId: w.caseId, issuingAuthority: input.issuingAuthority, issuingAuthorityRef: input.issuingAuthorityRef || null, grounds: input.grounds, targetAddress: input.targetAddress || null, expiresAt: input.expiresAt, status: "DRAFT", requestedById: actor.id } });
    await tx.wantedPerson.update({ where: { id: w.id }, data: { warrantId: wr.id } });
    await logAudit({ actor, action: "WARRANT_CREATED", module: "wanted", entityType: "Warrant", entityId: wr.id, entityLabel: wr.number, summary: `Warrant ${wr.number} (${input.type}) requested for wanted notice ${w.number}`, after: { type: wr.type, issuingAuthority: wr.issuingAuthority }, context: ctx }, tx);
    return wr;
  });
  return warrant;
}

const WARRANT_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING_APPROVAL", "ACTIVE", "CANCELLED"],
  PENDING_APPROVAL: ["ACTIVE", "REJECTED", "CANCELLED"],
  ACTIVE: ["EXECUTED", "EXPIRED", "CANCELLED"],
  EXECUTED: [],
  EXPIRED: [],
  CANCELLED: [],
  REJECTED: [],
};

export async function setWarrantStatus(actor: Actor, input: WarrantStatusInput, ctx: RequestContext) {
  const before = await prisma.warrant.findUnique({ where: { id: input.warrantId }, select: { id: true, number: true, status: true, personId: true } });
  if (!before) throw new NotFoundError("Warrant");
  if (!WARRANT_TRANSITIONS[before.status]?.includes(input.status)) throw new BusinessError(`Cannot move a warrant from ${before.status} to ${input.status}.`, "STATE");
  const isApproval = before.status === "DRAFT" || before.status === "PENDING_APPROVAL";
  if (isApproval && !actor.permissions.has("warrants:approve") && !actor.permissions.has("wanted:approve")) throw new AuthError("forbidden", "Permission warrants:approve required");
  const data: Prisma.WarrantUpdateInput = { status: input.status as Prisma.EnumWarrantStatusFieldUpdateOperationsInput["set"] };
  if (input.status === "ACTIVE" && isApproval) Object.assign(data, { approvedById: actor.id, approvedAt: new Date() });
  if (input.status === "EXECUTED") Object.assign(data, { executedById: actor.id, executedAt: new Date(), executionNotes: input.notes || null });
  if (input.status === "CANCELLED") Object.assign(data, { cancelledAt: new Date(), cancellationReason: input.notes || null });
  if (input.status === "REJECTED") Object.assign(data, { decisionNotes: input.notes || null });
  const after = await prisma.warrant.update({ where: { id: before.id }, data });
  await logAudit({ actor, action: `WARRANT_${input.status}`, module: "wanted", entityType: "Warrant", entityId: before.id, entityLabel: before.number, summary: `${before.number}: ${before.status} → ${input.status}`, before: { status: before.status }, after: { status: after.status }, context: ctx });
  return after;
}

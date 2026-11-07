import "server-only";
import type { AlertKind, Prisma, WantedStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { AuthError, BusinessError, NotFoundError } from "@/server/errors";
import { inScope, scopeWhere, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import { saveUpload } from "@/server/storage";
import { alertKindForTransition, publishAlert } from "@/server/alerts/publish";
import type { CreateWarrantInput, SightingInput, WantedPersonInput, WantedStatusInput, WantedVehicleInput, WantedVerifyInput, WarrantStatusInput } from "@/server/wanted/schemas";

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
  kind: true,
  diffusionLevel: true,
  legalBasis: true,
  issuingAuthority: true,
  verifiedAt: true,
  verificationNotes: true,
  suspendedAt: true,
  suspensionReason: true,
  createdAt: true,
  updatedAt: true,
  person: { select: { id: true, number: true, firstName: true, lastName: true, dateOfBirth: true, gender: true, nationality: true, physicalDescription: true, distinguishingMarks: true, address: true, city: true, phone: true, aliases: { select: { alias: true } }, identifiers: { select: { type: true, value: true } } } },
  case: { select: { id: true, number: true, title: true, status: true } },
  station: { select: { id: true, code: true, name: true } },
  issuedBy: { select: { id: true, username: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, username: true, firstName: true, lastName: true } },
  verifiedBy: { select: { id: true, username: true, firstName: true, lastName: true } },
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
  const live = await prisma.wantedPerson.findFirst({ where: { personId: person.id, status: { in: [...LIVE_STATUSES] } }, select: { number: true } });
  if (live) throw new BusinessError(`Person ${person.number} already has a live wanted notice (${live.number}). Update it instead of creating another.`, "STATE");
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
        kind: input.kind,
        diffusionLevel: input.diffusionLevel,
        legalBasis: input.legalBasis || null,
        issuingAuthority: input.issuingAuthority || null,
        lastSeenLocation: input.lastSeenLocation || null,
        expiresAt: input.expiresAt,
        issuedById: actor.id,
      },
      select: wantedSelect,
    });
    await logAudit({ actor, action: "WANTED_CREATED", module: "wanted", entityType: "WantedPerson", entityId: w.id, entityLabel: w.number, summary: `Wanted notice ${w.number} drafted for ${person.number} — ${person.firstName} ${person.lastName} (${input.offense})`, after: { offense: w.offense, dangerLevel: w.dangerLevel, kind: w.kind }, context: ctx }, tx);
    return w;
  });
  return created;
}

export async function updateWantedPerson(actor: Actor, id: string, input: Omit<WantedPersonInput, "personId" | "stationId">, ctx: RequestContext) {
  const before = await getWantedPerson(actor, id);
  if (before.status === "ARRESTED" || before.status === "CANCELLED" || before.status === "EXPIRED") throw new BusinessError(`A wanted notice in status ${before.status} can no longer be edited.`, "STATE");
  const diffusionChanged = input.diffusionLevel !== before.diffusionLevel;
  if (diffusionChanged && before.status !== "DRAFT" && before.status !== "PENDING_APPROVAL") throw new BusinessError("The diffusion perimeter can only be changed before approval.", "STATE");
  const legalChanged = input.kind !== before.kind || (input.legalBasis || null) !== before.legalBasis || (input.issuingAuthority || null) !== before.issuingAuthority;
  if (legalChanged && before.status !== "DRAFT" && before.status !== "PENDING_APPROVAL") throw new BusinessError("The nature, legal basis and issuing authority can only be changed before approval.", "STATE");
  const after = await prisma.$transaction(async (tx) => {
  const updated = await tx.wantedPerson.update({ where: { id }, data: { offense: input.offense, reason: input.reason, dangerLevel: input.dangerLevel, kind: input.kind, diffusionLevel: input.diffusionLevel, legalBasis: input.legalBasis || null, issuingAuthority: input.issuingAuthority || null, lastSeenLocation: input.lastSeenLocation || null, expiresAt: input.expiresAt, ...(legalChanged && before.verifiedAt ? { verifiedAt: null, verifiedById: null, verificationNotes: null, status: "DRAFT" as const } : {}) }, select: wantedSelect });
  await logAudit({ actor, action: "WANTED_UPDATED", module: "wanted", entityType: "WantedPerson", entityId: id, entityLabel: updated.number, summary: `Wanted notice ${updated.number} updated`, before: { offense: before.offense, dangerLevel: before.dangerLevel }, after: { offense: updated.offense, dangerLevel: updated.dangerLevel }, context: ctx }, tx);
  const published: WantedStatus[] = ["ACTIVE", "LOCATED", "SUSPENDED"];
  const material = before.offense !== updated.offense || before.dangerLevel !== updated.dangerLevel || before.lastSeenLocation !== updated.lastSeenLocation;
  if (published.includes(before.status) && material) await publishWantedAlert(tx, actor, { ...before, offense: updated.offense, dangerLevel: updated.dangerLevel }, "UPDATED", before.status, ctx);
  return updated;
  });
  return after;
}

const ALERT_INSTRUCTION: Record<string, string> = {
  PUBLISHED: "Vérification humaine obligatoire avant toute action. Une correspondance n'établit jamais la culpabilité.",
  UPDATED: "Avis mis à jour : consulter les nouveaux éléments avant toute action.",
  SUSPENDED: "Avis suspendu : ne prendre aucune mesure fondée sur cet avis jusqu'à nouvel ordre.",
  REACTIVATED: "Avis réactivé : vérification humaine obligatoire avant toute action.",
  WITHDRAWN: "Avis retiré : cesser toute recherche fondée sur cet avis.",
  EXPIRED: "Avis expiré : ne plus l'utiliser.",
  CLOSED: "Dossier clos (personne appréhendée) : cesser la recherche.",
};

type WantedForAlert = Awaited<ReturnType<typeof getWantedPerson>>;

/** Minimal bulletin sent to the network: identity needed to recognise the person, never investigation detail or the internal reason. */
async function publishWantedAlert(tx: Prisma.TransactionClient, actor: Actor, w: WantedForAlert, kind: AlertKind, status: WantedStatus, ctx: RequestContext) {
  const stamp = Date.now();
  return publishAlert(tx, actor, {
    kind,
    wantedPersonId: w.id,
    idempotencyKey: `${w.id}:${kind}:${stamp}`,
    diffusion: w.diffusionLevel,
    source: { stationId: w.stationId, regionId: w.regionId },
    priority: w.dangerLevel,
    title: `${w.number} — ${kind}`,
    payload: {
      number: w.number,
      status,
      nature: w.kind,
      person: { name: `${w.person.lastName} ${w.person.firstName}`, aliases: w.person.aliases.map((a) => a.alias), dateOfBirth: w.person.dateOfBirth, gender: w.person.gender, physicalDescription: w.person.physicalDescription, distinguishingMarks: w.person.distinguishingMarks },
      offense: w.offense,
      dangerLevel: w.dangerLevel,
      issuingAuthority: w.issuingAuthority,
      unit: `${w.station.code} · ${w.station.name}`,
      instruction: ALERT_INSTRUCTION[kind],
    },
  }, ctx);
}

export const LIVE_STATUSES = ["DRAFT", "PENDING_APPROVAL", "ACTIVE", "LOCATED", "SUSPENDED"] as const;

/** DRAFT -> PENDING_APPROVAL only happens through `verifyWanted` (check of the exhibits and the legal basis). */
const WANTED_TRANSITIONS: Record<WantedStatus, WantedStatus[]> = {
  DRAFT: ["CANCELLED"],
  PENDING_APPROVAL: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["LOCATED", "ARRESTED", "SUSPENDED", "CANCELLED", "EXPIRED"],
  LOCATED: ["ARRESTED", "ACTIVE", "SUSPENDED", "CANCELLED", "EXPIRED"],
  SUSPENDED: ["ACTIVE", "CANCELLED", "EXPIRED"],
  ARRESTED: [],
  CANCELLED: [],
  EXPIRED: ["ACTIVE"],
};

type WarrantLite = { status: string; expiresAt: Date | null } | null;

/** A search-warrant notice may only be live while its warrant is ACTIVE and unexpired. */
function assertWarrantValid(kind: string, warrant: WarrantLite, what: string) {
  if (kind !== "SEARCH_WARRANT") return;
  if (!warrant) throw new BusinessError(`A search-warrant notice needs a linked warrant before ${what}.`, "STATE");
  if (warrant.status !== "ACTIVE") throw new BusinessError(`The linked warrant must be ACTIVE before ${what} (currently ${warrant.status}).`, "STATE");
  if (warrant.expiresAt && warrant.expiresAt.getTime() < Date.now()) throw new BusinessError(`The linked warrant has expired; it cannot support ${what}.`, "STATE");
}

/**
 * Verification of the exhibits and the legal basis (workflow step 2). Needs wanted:verify and a different person than the issuer.
 * Moves a DRAFT to PENDING_APPROVAL; any later change of the legal fields resets it.
 */
export async function verifyWanted(actor: Actor, input: WantedVerifyInput, ctx: RequestContext) {
  if (!actor.permissions.has("wanted:verify")) throw new AuthError("forbidden", "Permission wanted:verify required");
  const before = await getWantedPerson(actor, input.id);
  if (before.status !== "DRAFT" && before.status !== "PENDING_APPROVAL") throw new BusinessError(`A wanted notice in status ${before.status} cannot be verified.`, "STATE");
  const issuer = await prisma.wantedPerson.findUnique({ where: { id: before.id }, select: { issuedById: true } });
  if (issuer?.issuedById === actor.id) throw new BusinessError("The issuer of a wanted notice cannot verify it (four-eyes rule).", "STATE");
  if (!before.legalBasis?.trim() || !before.issuingAuthority?.trim()) throw new BusinessError("Fill in the legal basis and the issuing authority before verification.", "STATE");
  if (before.kind === "SEARCH_WARRANT" && !before.warrant) throw new BusinessError("A search-warrant notice needs a linked warrant before verification.", "STATE");
  const r = await prisma.wantedPerson.updateMany({ where: { id: before.id, status: before.status }, data: { verifiedById: actor.id, verifiedAt: new Date(), verificationNotes: input.notes || null, status: "PENDING_APPROVAL" } });
  if (r.count !== 1) throw new BusinessError("The wanted notice was modified concurrently. Reload and retry.", "CONFLICT");
  await logAudit({ actor, action: "WANTED_VERIFIED", module: "wanted", entityType: "WantedPerson", entityId: before.id, entityLabel: before.number, summary: `${before.number}: exhibits and legal basis verified`, before: { status: before.status }, after: { status: "PENDING_APPROVAL" }, context: ctx });
  return getWantedPerson(actor, before.id);
}

/** Status changes: approval/activation needs wanted:approve, verification, a different person than the issuer and a valid warrant;
 * every other transition needs wanted:status. Suspension and withdrawal need a stated reason. */
export async function setWantedStatus(actor: Actor, input: WantedStatusInput, ctx: RequestContext) {
  const before = await getWantedPerson(actor, input.id);
  if (!WANTED_TRANSITIONS[before.status].includes(input.status)) throw new BusinessError(`Cannot move a wanted notice from ${before.status} to ${input.status}.`, "STATE");
  const isApprovalStep = before.status === "PENDING_APPROVAL" && input.status === "ACTIVE";
  const required = isApprovalStep ? "wanted:approve" : "wanted:status";
  if (!actor.permissions.has(required)) throw new AuthError("forbidden", `Permission ${required} required`);
  const reason = input.closureNotes?.trim();
  if ((input.status === "SUSPENDED" || input.status === "CANCELLED") && !reason) throw new BusinessError(input.status === "CANCELLED" ? "State the reason for the withdrawal." : "State the reason for the suspension.", "STATE");
  if (isApprovalStep) {
    const meta = await prisma.wantedPerson.findUnique({ where: { id: before.id }, select: { issuedById: true } });
    if (!before.verifiedAt) throw new BusinessError("The exhibits and the legal basis must be verified before approval.", "STATE");
    if (meta?.issuedById === actor.id) throw new BusinessError("The issuer of a wanted notice cannot approve it (four-eyes rule).", "STATE");
  }
  if (input.status === "ACTIVE") assertWarrantValid(before.kind, before.warrant, isApprovalStep ? "approval" : "reactivation");
  const closing = input.status === "CANCELLED" || input.status === "ARRESTED" || input.status === "EXPIRED";
  const suspending = input.status === "SUSPENDED";
  const alertKind = alertKindForTransition(before.status, input.status);
  await prisma.$transaction(async (tx) => {
    const r = await tx.wantedPerson.updateMany({
      where: { id: before.id, status: before.status },
      data: {
        status: input.status,
        approvedById: isApprovalStep ? actor.id : undefined,
        approvedAt: isApprovalStep ? new Date() : undefined,
        closedAt: closing ? new Date() : null,
        closureNotes: closing ? reason || null : null,
        suspendedAt: suspending ? new Date() : null,
        suspensionReason: suspending ? reason : null,
      },
    });
    if (r.count !== 1) throw new BusinessError("The wanted notice was modified concurrently. Reload and retry.", "CONFLICT");
    if (alertKind) await publishWantedAlert(tx, actor, before, alertKind, input.status, ctx);
    await logAudit({ actor, action: `WANTED_${input.status}`, module: "wanted", entityType: "WantedPerson", entityId: before.id, entityLabel: before.number, summary: `${before.number}: ${before.status} → ${input.status}${reason ? ` — ${reason}` : ""}`, before: { status: before.status }, after: { status: input.status }, context: ctx }, tx);
  });
  return getWantedPerson(actor, before.id);
}

/** Sensitive consultation of a notice: audited (who looked at whom, when). */
export async function viewWantedPerson(actor: Actor, id: string, ctx: RequestContext) {
  const w = await getWantedPerson(actor, id);
  await logAudit({ actor, action: "WANTED_VIEWED", module: "wanted", entityType: "WantedPerson", entityId: w.id, entityLabel: w.number, summary: `Wanted notice ${w.number} consulted`, context: ctx });
  return w;
}

/** Other persons with the same first and last name that also carry a notice in the actor's scope. Shown as a warning, never merged. */
export async function listHomonyms(actor: Actor, wantedId: string) {
  const w = await getWantedPerson(actor, wantedId);
  return prisma.wantedPerson.findMany({
    where: { AND: [wantedScopeWhere(actor)], personId: { not: w.personId }, person: { firstName: { equals: w.person.firstName, mode: "insensitive" }, lastName: { equals: w.person.lastName, mode: "insensitive" } } },
    select: { id: true, number: true, status: true, person: { select: { number: true, dateOfBirth: true, city: true } } },
    take: 10,
  });
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

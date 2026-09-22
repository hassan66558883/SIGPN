import "server-only";
import type { CustodyAction, EvidenceStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { sha256 } from "@/server/crypto";
import { BusinessError, NotFoundError } from "@/server/errors";
import { inScope, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import { saveUpload } from "@/server/storage";
import { CUSTODY_ACTIONS, type CustodyTransferInput, type EvidenceInput, type StorageLocationInput } from "@/server/evidence/schemas";

/** Evidence has no station/region column of its own — it is scoped through its Case. */
export function evidenceScopeWhere(actor: Actor): Prisma.EvidenceWhereInput {
  switch (actor.scopeLevel) {
    case "NATIONAL":
      return {};
    case "REGIONAL":
      return { case: { regionId: actor.regionId ?? "__none__" } };
    default:
      return { case: { stationId: { in: actor.stationIds && actor.stationIds.length ? actor.stationIds : ["__none__"] } } };
  }
}

export const evidenceSelect = {
  id: true,
  number: true,
  caseId: true,
  category: true,
  description: true,
  quantity: true,
  unit: true,
  sealNumber: true,
  collectedAt: true,
  collectedFrom: true,
  collectedFromPersonId: true,
  condition: true,
  status: true,
  isSensitive: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  case: { select: { id: true, number: true, title: true, stationId: true, regionId: true, station: { select: { code: true, name: true } } } },
  collectedBy: { select: { id: true, username: true, firstName: true, lastName: true } },
  currentCustodian: { select: { id: true, username: true, firstName: true, lastName: true } },
  currentLocation: { select: { id: true, code: true, name: true } },
  collectedFromPerson: { select: { id: true, number: true, firstName: true, lastName: true } },
  custody: { orderBy: { seq: "asc" }, select: { id: true, seq: true, action: true, occurredAt: true, reason: true, condition: true, notes: true, fromLocation: { select: { name: true } }, toLocation: { select: { name: true } }, fromUser: { select: { firstName: true, lastName: true } }, toUser: { select: { firstName: true, lastName: true } }, recordedBy: { select: { firstName: true, lastName: true } }, hash: true } },
  documents: { where: { isArchived: false }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, category: true, currentVersion: true, versions: { orderBy: { version: "desc" }, take: 1, select: { fileName: true, mimeType: true, sizeBytes: true, sha256: true, storagePath: true } } } },
  _count: { select: { custody: true, documents: true } },
} satisfies Prisma.EvidenceSelect;

export async function getEvidence(actor: Actor, id: string) {
  const e = await prisma.evidence.findUnique({ where: { id }, select: evidenceSelect });
  if (!e || !inScope(actor, { stationId: e.case.stationId, regionId: e.case.regionId })) throw new NotFoundError("Evidence");
  return e;
}

export function custodyHash(input: { evidenceId: string; seq: number; action: string; fromUserId: string | null; toUserId: string | null; fromLocationId: string | null; toLocationId: string | null; occurredAt: Date; reason: string; prevHash: string | null }): string {
  return sha256(JSON.stringify(input));
}

export async function createEvidence(actor: Actor, input: EvidenceInput, file: File | null, ctx: RequestContext) {
  const kase = await prisma.case.findUnique({ where: { id: input.caseId }, select: { id: true, number: true, title: true, stationId: true, regionId: true } });
  if (!kase || !inScope(actor, { stationId: kase.stationId, regionId: kase.regionId })) throw new NotFoundError("Case");
  const upload = file ? await saveUpload("evidence", file) : null;
  const created = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("EVIDENCE", tx);
    const e = await tx.evidence.create({
      data: {
        number,
        caseId: kase.id,
        category: input.category,
        description: input.description,
        quantity: input.quantity ? Number(input.quantity) : null,
        unit: input.unit || null,
        sealNumber: input.sealNumber || null,
        collectedAt: input.collectedAt,
        collectedById: actor.id,
        collectedFrom: input.collectedFrom || null,
        collectedFromPersonId: input.collectedFromPersonId || null,
        condition: input.condition || null,
        status: "REGISTERED",
        currentCustodianId: actor.id,
        currentLocationId: input.currentLocationId || null,
        isSensitive: input.isSensitive,
        notes: input.notes || null,
      },
      select: evidenceSelect,
    });
    const occurredAt = new Date();
    const hash = custodyHash({ evidenceId: e.id, seq: 1, action: "REGISTERED", fromUserId: null, toUserId: actor.id, fromLocationId: null, toLocationId: input.currentLocationId || null, occurredAt, reason: "Initial registration", prevHash: null });
    await tx.custodyEvent.create({ data: { evidenceId: e.id, seq: 1, action: "REGISTERED", toUserId: actor.id, toLocationId: input.currentLocationId || null, occurredAt, reason: "Initial registration", recordedById: actor.id, hash, prevHash: null } });
    if (upload) {
      const doc = await tx.document.create({ data: { title: `${e.number} — ${input.category}`, entityType: "EVIDENCE", entityId: e.id, category: "PHOTO", classification: input.isSensitive ? "RESTRICTED" : "INTERNAL", uploadedById: actor.id, caseId: kase.id, evidenceId: e.id } });
      await tx.documentVersion.create({ data: { documentId: doc.id, version: 1, fileName: file!.name, mimeType: upload.mimeType, sizeBytes: upload.size, storagePath: upload.relPath, sha256: upload.sha256, uploadedById: actor.id } });
    }
    await logAudit({ actor, action: "EVIDENCE_REGISTERED", module: "evidence", entityType: "Evidence", entityId: e.id, entityLabel: e.number, summary: `Evidence ${e.number} registered for case ${kase.number} (${input.category})${upload ? " with file attachment" : ""}`, after: { category: e.category, description: e.description, sealNumber: e.sealNumber }, context: ctx }, tx);
    return e;
  });
  return getEvidence(actor, created.id);
}

/** Attaches a file to already-registered evidence (used directly, and by biometric capture retention). */
export async function attachEvidenceFile(actor: Actor, evidenceId: string, file: File, ctx: RequestContext, category: "PHOTO" | "AUDIO" | "SCAN" | "OTHER" = "OTHER") {
  const e = await getEvidence(actor, evidenceId);
  const upload = await saveUpload("evidence", file);
  const doc = await prisma.$transaction(async (tx) => {
    const d = await tx.document.create({ data: { title: `${e.number} — ${file.name}`, entityType: "EVIDENCE", entityId: e.id, category, classification: e.isSensitive ? "RESTRICTED" : "INTERNAL", uploadedById: actor.id, caseId: e.caseId, evidenceId: e.id } });
    await tx.documentVersion.create({ data: { documentId: d.id, version: 1, fileName: file.name, mimeType: upload.mimeType, sizeBytes: upload.size, storagePath: upload.relPath, sha256: upload.sha256, uploadedById: actor.id } });
    await logAudit({ actor, action: "EVIDENCE_FILE_ATTACHED", module: "evidence", entityType: "Evidence", entityId: e.id, entityLabel: e.number, summary: `File attached to evidence ${e.number} (${file.name}, sha256 ${upload.sha256.slice(0, 12)}…)`, context: ctx }, tx);
    return d;
  });
  return { evidenceId: e.id, documentId: doc.id };
}

const ACTION_TO_STATUS: Record<(typeof CUSTODY_ACTIONS)[number], EvidenceStatus> = {
  STORED: "STORED",
  TRANSFERRED: "TRANSFERRED",
  CHECKED_OUT: "TRANSFERRED",
  CHECKED_IN: "STORED",
  EXAMINED: "UNDER_EXAMINATION",
  RETURNED: "RETURNED",
  RELEASED: "RELEASED",
  DESTROYED: "DESTROYED",
  ARCHIVED: "ARCHIVED",
};

export async function transferCustody(actor: Actor, input: CustodyTransferInput, ctx: RequestContext) {
  const e = await getEvidence(actor, input.evidenceId);
  if (e.status === "DESTROYED" || e.status === "ARCHIVED") throw new BusinessError(`Evidence in status ${e.status} can no longer be transferred.`, "STATE");
  const last = e.custody[e.custody.length - 1];
  const seq = (last?.seq ?? 0) + 1;
  const occurredAt = new Date();
  const action = input.action as CustodyAction;
  const toUserId = input.toUserId || null;
  const toLocationId = input.toLocationId || null;
  const hash = custodyHash({ evidenceId: e.id, seq, action, fromUserId: actor.id, toUserId, fromLocationId: e.currentLocation?.id ?? null, toLocationId, occurredAt, reason: input.reason, prevHash: last?.hash ?? null });
  await prisma.$transaction(async (tx) => {
    await tx.custodyEvent.create({
      data: { evidenceId: e.id, seq, action, fromUserId: actor.id, toUserId, fromLocationId: e.currentLocation?.id ?? null, toLocationId, occurredAt, reason: input.reason, condition: input.condition || null, notes: input.notes || null, recordedById: actor.id, hash, prevHash: last?.hash ?? null },
    });
    await tx.evidence.update({ where: { id: e.id }, data: { status: ACTION_TO_STATUS[action as keyof typeof ACTION_TO_STATUS], currentCustodianId: toUserId ?? e.currentCustodian?.id ?? null, currentLocationId: toLocationId ?? e.currentLocation?.id ?? null, condition: input.condition || e.condition } });
    await logAudit({ actor, action: `EVIDENCE_${action}`, module: "evidence", entityType: "Evidence", entityId: e.id, entityLabel: e.number, summary: `${e.number}: ${action.toLowerCase().replace("_", " ")} — ${input.reason}`, before: { status: e.status }, after: { status: ACTION_TO_STATUS[action as keyof typeof ACTION_TO_STATUS] }, context: ctx }, tx);
  });
  return getEvidence(actor, e.id);
}

export async function upsertStorageLocation(actor: Actor, input: StorageLocationInput, ctx: RequestContext) {
  if (!inScope(actor, { stationId: input.stationId })) throw new BusinessError("You can only manage storage locations inside your scope.", "STATE");
  const code = input.code.toUpperCase();
  if (input.id) {
    const before = await prisma.storageLocation.findUnique({ where: { id: input.id } });
    if (!before || !inScope(actor, { stationId: before.stationId })) throw new NotFoundError("Storage location");
    const after = await prisma.storageLocation.update({ where: { id: before.id }, data: { code, name: input.name, type: input.type, description: input.description || null, isActive: input.isActive } });
    await logAudit({ actor, action: "STORAGE_LOCATION_UPDATED", module: "evidence", entityType: "StorageLocation", entityId: after.id, entityLabel: after.code, summary: `Storage location ${after.code} updated`, before, after, context: ctx });
    return after;
  }
  const existing = await prisma.storageLocation.findUnique({ where: { code } });
  if (existing) throw new BusinessError(`Storage location code ${code} already exists.`, "CONFLICT");
  const loc = await prisma.storageLocation.create({ data: { stationId: input.stationId, code, name: input.name, type: input.type, description: input.description || null, isActive: input.isActive } });
  await logAudit({ actor, action: "STORAGE_LOCATION_CREATED", module: "evidence", entityType: "StorageLocation", entityId: loc.id, entityLabel: loc.code, summary: `Storage location ${loc.code} (${loc.name}) created`, after: loc, context: ctx });
  return loc;
}

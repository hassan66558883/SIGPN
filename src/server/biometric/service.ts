import "server-only";
import type { BiometricAction, BiometricSearchResult, BiometricType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { decryptSecret, encryptSecret } from "@/server/crypto";
import { BusinessError, NotFoundError } from "@/server/errors";
import { inScope, type Actor } from "@/server/auth/dal";
import type { RequestContext } from "@/server/request-context";
import { nextNumber } from "@/server/sequences";
import { saveUpload } from "@/server/storage";
import { custodyHash } from "@/server/evidence/service";
import { getAnprProvider, getFaceProvider, getFingerprintProvider, getVoiceProvider } from "@/server/biometric/providers";
import type { IdentifyCandidate } from "@/server/biometric/providers/types";
import type { EnrollFingerprintInput, EnrollFaceInput, EnrollVoiceInput, FingerprintSearchInput, FaceSearchInput, VoiceSearchInput, AnprDetectInput, AnprSearchInput, RecordActionInput } from "@/server/biometric/schemas";

/** POTENTIAL_MATCH cutoff for the DEMO scorer. Never auto-promoted to VERIFIED_MATCH — only a human
 * investigator action (recordBiometricAction) can mark a match verified. */
const MATCH_THRESHOLD = 60;

export function biometricScopeWhere(actor: Actor): Prisma.BiometricSearchWhereInput {
  switch (actor.scopeLevel) {
    case "NATIONAL":
      return {};
    case "REGIONAL":
      return { case: { regionId: actor.regionId ?? "__none__" } };
    default:
      return { case: { stationId: { in: actor.stationIds && actor.stationIds.length ? actor.stationIds : ["__none__"] } } };
  }
}

async function requireCaseInScope(actor: Actor, caseId: string) {
  const kase = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true, number: true, title: true, stationId: true, regionId: true } });
  if (!kase || !inScope(actor, { stationId: kase.stationId, regionId: kase.regionId })) throw new NotFoundError("Case");
  return kase;
}

async function requirePerson(personId: string) {
  const p = await prisma.person.findUnique({ where: { id: personId }, select: { id: true, number: true, firstName: true, lastName: true } });
  if (!p) throw new BusinessError("Selected person is invalid.");
  return p;
}

/* ------------------------------------------------------------------ enrollment (templates only — no raw file retained) */

/** Never selects templateSecretEnc — the encrypted template must never appear in an API/action response. */
const fingerprintSafeSelect = { id: true, number: true, personId: true, position: true, quality: true, device: true, capturedById: true, capturedAt: true, isActive: true } as const;
const faceSafeSelect = { id: true, number: true, personId: true, quality: true, device: true, capturedById: true, capturedAt: true, isActive: true } as const;
const voiceSafeSelect = { id: true, number: true, personId: true, durationSeconds: true, device: true, capturedById: true, capturedAt: true, isActive: true } as const;

export async function enrollFingerprint(actor: Actor, input: EnrollFingerprintInput, file: File, ctx: RequestContext) {
  const person = await requirePerson(input.personId);
  const provider = getFingerprintProvider();
  const { template, quality } = await provider.extractTemplate(Buffer.from(await file.arrayBuffer()));
  const number = await nextNumber("FINGERPRINT");
  const rec = await prisma.fingerprintRecord.create({ data: { number, personId: person.id, position: input.position, templateSecretEnc: encryptSecret(template), quality, capturedById: actor.id }, select: fingerprintSafeSelect });
  await logAudit({ actor, action: "FINGERPRINT_ENROLLED", module: "biometric", entityType: "FingerprintRecord", entityId: rec.id, entityLabel: rec.number, summary: `Fingerprint (${input.position}) enrolled for ${person.number} — ${person.firstName} ${person.lastName}`, context: ctx });
  return rec;
}

export async function enrollFace(actor: Actor, input: EnrollFaceInput, file: File, ctx: RequestContext) {
  const person = await requirePerson(input.personId);
  const provider = getFaceProvider();
  const { template, quality } = await provider.extractTemplate(Buffer.from(await file.arrayBuffer()));
  const number = await nextNumber("FACE");
  const rec = await prisma.faceRecord.create({ data: { number, personId: person.id, templateSecretEnc: encryptSecret(template), quality, capturedById: actor.id }, select: faceSafeSelect });
  await logAudit({ actor, action: "FACE_ENROLLED", module: "biometric", entityType: "FaceRecord", entityId: rec.id, entityLabel: rec.number, summary: `Face template enrolled for ${person.number} — ${person.firstName} ${person.lastName}`, context: ctx });
  return rec;
}

export async function enrollVoice(actor: Actor, input: EnrollVoiceInput, file: File, ctx: RequestContext) {
  const person = await requirePerson(input.personId);
  const provider = getVoiceProvider();
  const buf = Buffer.from(await file.arrayBuffer());
  const { template, quality } = await provider.extractTemplate(buf);
  const number = await nextNumber("VOICE");
  const rec = await prisma.voiceRecord.create({ data: { number, personId: person.id, templateSecretEnc: encryptSecret(template), device: null, capturedById: actor.id }, select: voiceSafeSelect });
  await logAudit({ actor, action: "VOICE_ENROLLED", module: "biometric", entityType: "VoiceRecord", entityId: rec.id, entityLabel: rec.number, summary: `Voice template enrolled for ${person.number} — ${person.firstName} ${person.lastName} (quality ${quality})`, context: ctx });
  return rec;
}

/* ------------------------------------------------------------------ searches (always case + reason gated, always audited) */

async function writeSearch(
  actor: Actor,
  ctx: RequestContext,
  args: { type: BiometricType; mode: "VERIFY_1_1" | "IDENTIFY_1_N"; caseId: string; caseNumber: string; reason: string; device?: string; location?: string; parameters: Prisma.InputJsonValue; matches: { personId: string | null; score: number; sourceLabel: string }[] },
) {
  const resultCount = args.matches.length;
  const best = args.matches[0];
  const result: BiometricSearchResult = best && best.score >= MATCH_THRESHOLD ? "POTENTIAL_MATCH" : "NO_MATCH";
  const search = await prisma.$transaction(async (tx) => {
    const number = await nextNumber("BIOMETRIC", tx);
    const s = await tx.biometricSearch.create({
      data: {
        number,
        type: args.type,
        mode: args.mode,
        caseId: args.caseId,
        reason: args.reason,
        officerId: actor.id,
        device: args.device || null,
        location: args.location || null,
        parameters: args.parameters,
        resultCount,
        result,
        topMatchScore: best ? best.score : null,
        topMatchPersonId: best?.personId ?? null,
        isDemo: true,
      },
    });
    if (resultCount) await tx.biometricMatch.createMany({ data: args.matches.map((m, i) => ({ searchId: s.id, personId: m.personId, score: m.score, sourceLabel: m.sourceLabel, rank: i + 1 })) });
    await logAudit({ actor, action: `BIOMETRIC_SEARCH_${args.type}`, module: "biometric", entityType: "BiometricSearch", entityId: s.id, entityLabel: s.number, summary: `${s.number}: ${args.type} ${args.mode === "VERIFY_1_1" ? "verification" : "identification"} on case ${args.caseNumber} — ${result === "POTENTIAL_MATCH" ? `potential match (${best!.score}%)` : "no match"} [DEMO]`, context: ctx }, tx);
    return s;
  });
  return search;
}

async function activeTemplates(model: "fingerprintRecord" | "faceRecord" | "voiceRecord", personId?: string): Promise<IdentifyCandidate[]> {
  const rows = await (prisma[model] as typeof prisma.fingerprintRecord).findMany({ where: { isActive: true, ...(personId ? { personId } : {}) }, select: { personId: true, templateSecretEnc: true } });
  return rows.map((r) => ({ personId: r.personId, template: decryptSecret(r.templateSecretEnc) }));
}

export async function runFingerprintSearch(actor: Actor, input: FingerprintSearchInput, file: File, ctx: RequestContext) {
  const kase = await requireCaseInScope(actor, input.caseId);
  const provider = getFingerprintProvider();
  const { template } = await provider.extractTemplate(Buffer.from(await file.arrayBuffer()));
  if (input.mode === "VERIFY_1_1") {
    if (!input.personId) throw new BusinessError("Select the person to verify against.");
    const person = await requirePerson(input.personId);
    const candidates = await activeTemplates("fingerprintRecord", person.id);
    if (!candidates.length) throw new BusinessError(`${person.firstName} ${person.lastName} has no registered fingerprint to verify against.`);
    const ranked = await provider.identify(template, candidates);
    const matches = ranked.slice(0, 1).map((r) => ({ personId: r.personId, score: r.score, sourceLabel: "Local enrollment (DEMO)" }));
    return writeSearch(actor, ctx, { type: "FINGERPRINT", mode: "VERIFY_1_1", caseId: kase.id, caseNumber: kase.number, reason: input.reason, device: input.device, location: input.location, parameters: { position: input.position, personId: person.id }, matches });
  }
  const candidates = await activeTemplates("fingerprintRecord");
  const ranked = await provider.identify(template, candidates);
  const personIds = [...new Set(ranked.map((r) => r.personId))];
  const persons = await prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true } });
  const known = new Set(persons.map((p) => p.id));
  const matches = ranked.filter((r) => known.has(r.personId)).map((r) => ({ personId: r.personId, score: r.score, sourceLabel: "National Police Database (DEMO)" }));
  return writeSearch(actor, ctx, { type: "FINGERPRINT", mode: "IDENTIFY_1_N", caseId: kase.id, caseNumber: kase.number, reason: input.reason, device: input.device, location: input.location, parameters: { position: input.position }, matches });
}

export async function runFaceSearch(actor: Actor, input: FaceSearchInput, file: File, ctx: RequestContext) {
  const kase = await requireCaseInScope(actor, input.caseId);
  const provider = getFaceProvider();
  const buf = Buffer.from(await file.arrayBuffer());
  const { template } = await provider.extractTemplate(buf);
  const faceCount = await provider.detectFaceCount(buf);
  if (input.mode === "VERIFY_1_1") {
    if (!input.personId) throw new BusinessError("Select the person to verify against.");
    const person = await requirePerson(input.personId);
    const candidates = await activeTemplates("faceRecord", person.id);
    if (!candidates.length) throw new BusinessError(`${person.firstName} ${person.lastName} has no registered face template to verify against.`);
    const ranked = await provider.identify(template, candidates);
    const matches = ranked.slice(0, 1).map((r) => ({ personId: r.personId, score: r.score, sourceLabel: "Local enrollment (DEMO)" }));
    return writeSearch(actor, ctx, { type: "FACE", mode: "VERIFY_1_1", caseId: kase.id, caseNumber: kase.number, reason: input.reason, device: input.device, location: input.location, parameters: { personId: person.id, facesDetected: faceCount }, matches });
  }
  const candidates = await activeTemplates("faceRecord");
  const ranked = await provider.identify(template, candidates);
  const matches = ranked.map((r) => ({ personId: r.personId, score: r.score, sourceLabel: "National Police Database (DEMO)" }));
  return writeSearch(actor, ctx, { type: "FACE", mode: "IDENTIFY_1_N", caseId: kase.id, caseNumber: kase.number, reason: input.reason, device: input.device, location: input.location, parameters: { facesDetected: faceCount }, matches });
}

export async function runVoiceSearch(actor: Actor, input: VoiceSearchInput, file: File, ctx: RequestContext) {
  const kase = await requireCaseInScope(actor, input.caseId);
  const provider = getVoiceProvider();
  const { template } = await provider.extractTemplate(Buffer.from(await file.arrayBuffer()));
  if (input.mode === "VERIFY_1_1") {
    if (!input.personId) throw new BusinessError("Select the person to verify against.");
    const person = await requirePerson(input.personId);
    const candidates = await activeTemplates("voiceRecord", person.id);
    if (!candidates.length) throw new BusinessError(`${person.firstName} ${person.lastName} has no registered voice template to verify against.`);
    const ranked = await provider.identify(template, candidates);
    const matches = ranked.slice(0, 1).map((r) => ({ personId: r.personId, score: r.score, sourceLabel: "Local enrollment (DEMO)" }));
    return writeSearch(actor, ctx, { type: "VOICE", mode: "VERIFY_1_1", caseId: kase.id, caseNumber: kase.number, reason: input.reason, device: input.device, location: input.location, parameters: { personId: person.id }, matches });
  }
  const candidates = await activeTemplates("voiceRecord");
  const ranked = await provider.identify(template, candidates);
  const matches = ranked.map((r) => ({ personId: r.personId, score: r.score, sourceLabel: "National Police Database (DEMO)" }));
  return writeSearch(actor, ctx, { type: "VOICE", mode: "IDENTIFY_1_N", caseId: kase.id, caseNumber: kase.number, reason: input.reason, device: input.device, location: input.location, parameters: {}, matches });
}

/* ------------------------------------------------------------------ ANPR */

export async function detectLicensePlate(actor: Actor, input: AnprDetectInput, file: File, retainAsEvidence: boolean, ctx: RequestContext) {
  const kase = await requireCaseInScope(actor, input.caseId);
  const provider = getAnprProvider();
  const buf = Buffer.from(await file.arrayBuffer());
  const { plateNumber, confidence } = await provider.readPlate(buf);
  const detection = await prisma.$transaction(async (tx) => {
    let sourceEvidenceId: string | null = null;
    if (retainAsEvidence) {
      const evNumber = await nextNumber("EVIDENCE", tx);
      const upload = await saveUpload("anpr", file);
      const ev = await tx.evidence.create({ data: { number: evNumber, caseId: kase.id, category: "AUDIO_VIDEO", description: `ANPR capture — plate read ${plateNumber} (DEMO)`, collectedAt: new Date(), collectedById: actor.id, status: "REGISTERED", currentCustodianId: actor.id } });
      const occurredAt = new Date();
      const hash = custodyHash({ evidenceId: ev.id, seq: 1, action: "REGISTERED", fromUserId: null, toUserId: actor.id, fromLocationId: null, toLocationId: null, occurredAt, reason: "ANPR capture registered as evidence", prevHash: null });
      await tx.custodyEvent.create({ data: { evidenceId: ev.id, seq: 1, action: "REGISTERED", toUserId: actor.id, occurredAt, reason: "ANPR capture registered as evidence", recordedById: actor.id, hash, prevHash: null } });
      const doc = await tx.document.create({ data: { title: `${ev.number} — ANPR capture`, entityType: "EVIDENCE", entityId: ev.id, category: "PHOTO", uploadedById: actor.id, caseId: kase.id, evidenceId: ev.id } });
      await tx.documentVersion.create({ data: { documentId: doc.id, version: 1, fileName: file.name, mimeType: upload.mimeType, sizeBytes: upload.size, storagePath: upload.relPath, sha256: upload.sha256, uploadedById: actor.id } });
      sourceEvidenceId = ev.id;
    }
    const number = await nextNumber("LPR", tx);
    const d = await tx.licensePlateDetection.create({ data: { number, plateNumber, detectedAt: new Date(), cameraId: input.device || null, locationText: input.location || null, caseId: kase.id, sourceEvidenceId, status: "NEW", recordedById: actor.id } });
    return d;
  });
  await writeSearch(actor, ctx, { type: "ANPR", mode: "IDENTIFY_1_N", caseId: kase.id, caseNumber: kase.number, reason: input.reason, device: input.device, location: input.location, parameters: { source: "image_upload", plateNumber, confidence }, matches: confidence >= MATCH_THRESHOLD ? [{ personId: null, score: confidence, sourceLabel: "DEMO ANPR Engine" }] : [] });
  return detection;
}

export async function searchLicensePlate(actor: Actor, input: AnprSearchInput, ctx: RequestContext) {
  const kase = await requireCaseInScope(actor, input.caseId);
  const plate = input.plateNumber.trim().toUpperCase();
  const detections = await prisma.licensePlateDetection.findMany({ where: { plateNumber: { equals: plate, mode: "insensitive" } }, orderBy: { detectedAt: "desc" }, take: 25 });
  await writeSearch(actor, ctx, { type: "ANPR", mode: "IDENTIFY_1_N", caseId: kase.id, caseNumber: kase.number, reason: input.reason, device: input.device, location: input.location, parameters: { source: "plate_text", plateNumber: plate }, matches: detections.length ? [{ personId: detections[0].personId, score: 100, sourceLabel: "Local ANPR detections" }] : [] });
  return detections;
}

/* ------------------------------------------------------------------ investigator action & history */

export async function recordBiometricAction(actor: Actor, input: RecordActionInput, ctx: RequestContext) {
  const s = await prisma.biometricSearch.findUnique({ where: { id: input.searchId }, select: { id: true, number: true, action: true, case: { select: { stationId: true, regionId: true } } } });
  if (!s || !inScope(actor, { stationId: s.case.stationId, regionId: s.case.regionId })) throw new NotFoundError("Biometric search");
  const after = await prisma.biometricSearch.update({ where: { id: s.id }, data: { action: input.action as BiometricAction, actionNotes: input.notes || null, actionById: actor.id, actionAt: new Date() } });
  await logAudit({ actor, action: "BIOMETRIC_ACTION_RECORDED", module: "biometric", entityType: "BiometricSearch", entityId: s.id, entityLabel: s.number, summary: `${s.number}: investigator action set to ${input.action}${input.notes ? ` — ${input.notes}` : ""}`, before: { action: s.action }, after: { action: after.action }, context: ctx });
  return after;
}

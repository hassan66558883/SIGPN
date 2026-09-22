"use server";

import { redirect } from "next/navigation";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, formFile, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as svc from "@/server/biometric/service";
import { anprDetectSchema, anprSearchSchema, enrollFaceSchema, enrollFingerprintSchema, enrollVoiceSchema, faceSearchSchema, fingerprintSearchSchema, recordActionSchema, voiceSearchSchema } from "@/server/biometric/schemas";
import { BusinessError } from "@/server/errors";
import type { FormState } from "@/components/forms";

function requireFile(fd: FormData, field: string, message: string): File {
  const f = formFile(fd, field);
  if (!f) throw new BusinessError(message);
  return f;
}

export async function enrollFingerprintAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("biometric:manage");
    const input = enrollFingerprintSchema.parse(formEntries(fd));
    const file = requireFile(fd, "file", "Upload a fingerprint scan.");
    const rec = await svc.enrollFingerprint(actor, input, file, await getRequestContext());
    revalidateAll();
    return { ok: true, message: `Fingerprint ${rec.number} enrolled.` };
  } catch (e) {
    return fail(e, "Could not enroll the fingerprint.", "biometric");
  }
}

export async function enrollFaceAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("biometric:manage");
    const input = enrollFaceSchema.parse(formEntries(fd));
    const file = requireFile(fd, "file", "Upload a face photograph.");
    const rec = await svc.enrollFace(actor, input, file, await getRequestContext());
    revalidateAll();
    return { ok: true, message: `Face template ${rec.number} enrolled.` };
  } catch (e) {
    return fail(e, "Could not enroll the face template.", "biometric");
  }
}

export async function enrollVoiceAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("biometric:manage");
    const input = enrollVoiceSchema.parse(formEntries(fd));
    const file = requireFile(fd, "file", "Upload a voice sample.");
    const rec = await svc.enrollVoice(actor, input, file, await getRequestContext());
    revalidateAll();
    return { ok: true, message: `Voice template ${rec.number} enrolled.` };
  } catch (e) {
    return fail(e, "Could not enroll the voice template.", "biometric");
  }
}

export async function searchFingerprintAction(_p: FormState, fd: FormData): Promise<FormState> {
  let searchId: string;
  try {
    const actor = await requirePermissionForAction("biometric:search_fingerprint");
    const input = fingerprintSearchSchema.parse(formEntries(fd));
    const file = requireFile(fd, "file", "Upload a fingerprint scan to search with.");
    const s = await svc.runFingerprintSearch(actor, input, file, await getRequestContext());
    searchId = s.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not run the fingerprint search.", "biometric");
  }
  redirect(`/biometric/history/${searchId}`);
}

export async function searchFaceAction(_p: FormState, fd: FormData): Promise<FormState> {
  let searchId: string;
  try {
    const actor = await requirePermissionForAction("biometric:search_face");
    const input = faceSearchSchema.parse(formEntries(fd));
    const file = requireFile(fd, "file", "Upload a photograph to search with.");
    const s = await svc.runFaceSearch(actor, input, file, await getRequestContext());
    searchId = s.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not run the face search.", "biometric");
  }
  redirect(`/biometric/history/${searchId}`);
}

export async function searchVoiceAction(_p: FormState, fd: FormData): Promise<FormState> {
  let searchId: string;
  try {
    const actor = await requirePermissionForAction("biometric:search_voice");
    const input = voiceSearchSchema.parse(formEntries(fd));
    const file = requireFile(fd, "file", "Upload an audio recording to search with.");
    const s = await svc.runVoiceSearch(actor, input, file, await getRequestContext());
    searchId = s.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not run the voice search.", "biometric");
  }
  redirect(`/biometric/history/${searchId}`);
}

export async function detectPlateAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("biometric:search_anpr");
    const input = anprDetectSchema.parse(formEntries(fd));
    const file = requireFile(fd, "file", "Upload a vehicle/plate image.");
    const retain = fd.get("retainAsEvidence") === "on";
    const d = await svc.detectLicensePlate(actor, input, file, retain, await getRequestContext());
    revalidateAll();
    return { ok: true, message: `Plate ${d.plateNumber} detected (${d.number}, DEMO reading).` };
  } catch (e) {
    return fail(e, "Could not read the plate.", "biometric");
  }
}

export async function searchPlateAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("biometric:search_anpr");
    const input = anprSearchSchema.parse(formEntries(fd));
    await svc.searchLicensePlate(actor, input, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Plate search recorded." };
  } catch (e) {
    return fail(e, "Could not search the plate.", "biometric");
  }
}

export async function recordBiometricActionAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("biometric:verify");
    await svc.recordBiometricAction(actor, recordActionSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Verification action recorded." };
  } catch (e) {
    return fail(e, "Could not record the action.", "biometric");
  }
}

"use server";

import { redirect } from "next/navigation";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, revalidateAll } from "@/server/action-utils";
import { requireActorForAction } from "@/server/auth/dal";
import { addDistinction, addStep, decideCase, decisionSchema, distinctionSchema, openCase, openCaseSchema, stepSchema } from "@/server/hr/discipline";
import { UPLOAD_KINDS, issueDocument, issueSchema, setOfficerPhoto, uploadDocument } from "@/server/hr/documents";
import type { FormState } from "@/components/forms";

export async function openCaseAction(_p: FormState, fd: FormData): Promise<FormState> {
  let id: string;
  try {
    const actor = await requireActorForAction();
    id = (await openCase(actor, openCaseSchema.parse(formEntries(fd)), await getRequestContext())).id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not open the disciplinary file.", "hr");
  }
  redirect(`/hr/discipline/${id}`);
}

export async function addStepAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await addStep(actor, stepSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Step recorded." };
  } catch (e) {
    return fail(e, "Could not record the step.", "hr");
  }
}

export async function decideCaseAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await decideCase(actor, decisionSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Decision recorded." };
  } catch (e) {
    return fail(e, "Could not record the decision.", "hr");
  }
}

export async function addDistinctionAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await addDistinction(actor, distinctionSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Distinction recorded." };
  } catch (e) {
    return fail(e, "Could not record the distinction.", "hr");
  }
}

export async function issueDocumentAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await issueDocument(actor, issueSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Document issued." };
  } catch (e) {
    return fail(e, "Could not issue the document.", "hr");
  }
}

export async function uploadDocumentAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
    const kind = String(fd.get("kind") ?? "");
    if (!(UPLOAD_KINDS as readonly string[]).includes(kind)) return { error: "Choose the kind of document." };
    await uploadDocument(actor, { kind: kind as (typeof UPLOAD_KINDS)[number], title: String(fd.get("title") ?? ""), officerId: String(fd.get("officerId") ?? "") || undefined, confidential: fd.get("confidential") === "on" }, file, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "File uploaded." };
  } catch (e) {
    return fail(e, "Could not upload the file.", "hr");
  }
}

export async function uploadPhotoAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
    await setOfficerPhoto(actor, String(fd.get("officerId") ?? ""), file, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Photo updated." };
  } catch (e) {
    return fail(e, "Could not update the photo.", "hr");
  }
}

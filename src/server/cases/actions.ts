"use server";

import { redirect } from "next/navigation";
import type { CaseDisposition, CaseStatus, PartyStatus, TaskStatus } from "@/generated/prisma/client";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as svc from "@/server/cases/service";
import { caseAssignSchema, caseSchema, caseStatusSchema, noteSchema, partySchema, partyStatusSchema, taskSchema, taskStatusSchema } from "@/server/cases/schemas";
import type { FormState } from "@/components/forms";

export async function createCaseAction(_p: FormState, fd: FormData): Promise<FormState> {
  let created: string;
  try {
    const actor = await requirePermissionForAction("cases:create");
    const k = await svc.createCase(actor, caseSchema.parse(formEntries(fd)), await getRequestContext());
    created = k.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not open the case.", "cases");
  }
  redirect(`/cases/${created}?created=1`);
}

export async function assignCaseAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("cases:assign");
    await svc.assignToCase(actor, caseAssignSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Assignment recorded. The user has been notified." };
  } catch (e) {
    return fail(e, "Could not assign the case.", "cases");
  }
}

export async function addPartyAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("cases:update");
    await svc.addParty(actor, partySchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Person added to the case." };
  } catch (e) {
    return fail(e, "Could not add the person.", "cases");
  }
}

export async function setPartyStatusAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("cases:update");
    const v = partyStatusSchema.parse(formEntries(fd));
    await svc.setPartyStatus(actor, v.id, v.status as PartyStatus, v.notes || undefined, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Involvement status updated." };
  } catch (e) {
    return fail(e, "Could not update the status.", "cases");
  }
}

export async function addNoteAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("cases:update");
    await svc.addNote(actor, noteSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Note added." };
  } catch (e) {
    return fail(e, "Could not add the note.", "cases");
  }
}

export async function createTaskAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("cases:update");
    await svc.createTask(actor, taskSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Task created." };
  } catch (e) {
    return fail(e, "Could not create the task.", "cases");
  }
}

export async function setTaskStatusAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("cases:update");
    const v = taskStatusSchema.parse(formEntries(fd));
    await svc.setTaskStatus(actor, v.id, v.status as TaskStatus, v.result || undefined, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Task updated." };
  } catch (e) {
    return fail(e, "Could not update the task.", "cases");
  }
}

export async function changeCaseStatusAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("cases:update");
    const v = caseStatusSchema.parse(formEntries(fd));
    await svc.changeCaseStatus(actor, v.caseId, v.status as CaseStatus, (v.disposition || null) as CaseDisposition | null, v.notes || undefined, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Case status updated." };
  } catch (e) {
    return fail(e, "Could not change the case status.", "cases");
  }
}

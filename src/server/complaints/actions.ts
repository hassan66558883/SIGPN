"use server";

import { redirect } from "next/navigation";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as svc from "@/server/complaints/service";
import { assignSchema, closeSchema, complaintSchema, convertSchema, reviewSchema } from "@/server/complaints/schemas";
import type { FormState } from "@/components/forms";

const id = (fd: FormData) => String(fd.get("id") ?? "");

export async function createComplaintAction(_p: FormState, fd: FormData): Promise<FormState> {
  let created: string;
  try {
    const actor = await requirePermissionForAction("complaints:create");
    const c = await svc.createComplaint(actor, complaintSchema.parse(formEntries(fd)), await getRequestContext());
    created = c.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not register the complaint.", "complaints");
  }
  redirect(`/complaints/${created}?created=1`);
}

export async function updateComplaintAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("complaints:update");
    await svc.updateComplaint(actor, id(fd), complaintSchema.omit({ submit: true, stationId: true }).parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Complaint updated." };
  } catch (e) {
    return fail(e, "Could not update the complaint.", "complaints");
  }
}

export async function registerComplaintAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("complaints:create");
    await svc.registerComplaint(actor, id(fd), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Complaint registered." };
  } catch (e) {
    return fail(e, "Could not register the complaint.", "complaints");
  }
}

export async function reviewComplaintAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("complaints:review");
    const v = reviewSchema.parse(formEntries(fd));
    await svc.reviewComplaint(actor, v.id, { reviewNotes: v.reviewNotes || undefined, priority: v.priority }, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Complaint is now under review." };
  } catch (e) {
    return fail(e, "Could not review the complaint.", "complaints");
  }
}

export async function assignComplaintAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("complaints:assign");
    const v = assignSchema.parse(formEntries(fd));
    await svc.assignComplaint(actor, v.id, v.assignedToId, v.reviewNotes || undefined, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Complaint assigned. The investigator has been notified." };
  } catch (e) {
    return fail(e, "Could not assign the complaint.", "complaints");
  }
}

export async function closeComplaintAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("complaints:close");
    const v = closeSchema.parse(formEntries(fd));
    await svc.closeComplaint(actor, v.id, v.outcome, v.closureReason, await getRequestContext());
    revalidateAll();
    return { ok: true, message: v.outcome === "CLOSED" ? "Complaint closed." : "Complaint rejected." };
  } catch (e) {
    return fail(e, "Could not close the complaint.", "complaints");
  }
}

export async function convertComplaintAction(_p: FormState, fd: FormData): Promise<FormState> {
  let caseId: string;
  try {
    const actor = await requirePermissionForAction("complaints:convert");
    const v = convertSchema.parse(formEntries(fd));
    const k = await svc.convertToCase(actor, v.id, { title: v.title || undefined, leadId: v.leadId || null, isSensitive: v.isSensitive }, await getRequestContext());
    caseId = k.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not convert the complaint.", "complaints");
  }
  redirect(`/cases/${caseId}?created=1`);
}

"use server";

import { redirect } from "next/navigation";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as svc from "@/server/detention/service";
import { detentionLogSchema, endDetentionSchema, extendDetentionSchema, startDetentionSchema } from "@/server/detention/schemas";
import type { FormState } from "@/components/forms";

export async function startDetentionAction(_p: FormState, fd: FormData): Promise<FormState> {
  let id: string;
  try {
    const actor = await requirePermissionForAction("detention:manage");
    const d = await svc.startDetention(actor, startDetentionSchema.parse(formEntries(fd)), await getRequestContext());
    id = d.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not start the custody.", "detention");
  }
  redirect(`/detention/${id}?created=1`);
}

export async function addLogAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("detention:manage");
    await svc.addDetentionLog(actor, detentionLogSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Entry recorded." };
  } catch (e) {
    return fail(e, "Could not record the entry.", "detention");
  }
}

export async function extendAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("detention:extend");
    await svc.extendDetention(actor, extendDetentionSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Custody extended." };
  } catch (e) {
    return fail(e, "Could not extend the custody.", "detention");
  }
}

export async function endAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("detention:manage");
    await svc.endDetention(actor, endDetentionSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Custody ended." };
  } catch (e) {
    return fail(e, "Could not end the custody.", "detention");
  }
}

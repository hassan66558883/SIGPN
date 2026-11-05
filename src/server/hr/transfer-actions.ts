"use server";

import { redirect } from "next/navigation";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, revalidateAll } from "@/server/action-utils";
import { requireActorForAction } from "@/server/auth/dal";
import * as svc from "@/server/hr/transfers";
import { cancelTransferSchema, proposeTransferSchema, transferDecisionSchema } from "@/server/hr/transfer-schemas";
import type { FormState } from "@/components/forms";

export async function proposeTransferAction(_p: FormState, fd: FormData): Promise<FormState> {
  let id: string;
  try {
    const actor = await requireActorForAction();
    const t = await svc.proposeTransfer(actor, proposeTransferSchema.parse(formEntries(fd)), await getRequestContext());
    id = t.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not propose the transfer.", "hr");
  }
  redirect(`/hr/transfers/${id}?created=1`);
}

export async function reviewTransferAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await svc.reviewTransfer(actor, transferDecisionSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "HR examination recorded." };
  } catch (e) {
    return fail(e, "Could not record the HR examination.", "hr");
  }
}

export async function validateTransferAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await svc.validateTransfer(actor, transferDecisionSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Validation recorded." };
  } catch (e) {
    return fail(e, "Could not record the validation.", "hr");
  }
}

export async function executeTransferAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await svc.executeTransfer(actor, String(fd.get("id") ?? ""), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Transfer executed." };
  } catch (e) {
    return fail(e, "Could not execute the transfer.", "hr");
  }
}

export async function cancelTransferAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    const i = cancelTransferSchema.parse(formEntries(fd));
    await svc.cancelTransfer(actor, i.id, i.reason, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Transfer cancelled." };
  } catch (e) {
    return fail(e, "Could not cancel the transfer.", "hr");
  }
}

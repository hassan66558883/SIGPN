"use server";

import { redirect } from "next/navigation";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, formFile, revalidateAll } from "@/server/action-utils";
import { requireActorForAction, requirePermissionForAction } from "@/server/auth/dal";
import type { FormState } from "@/components/forms";
import * as cash from "@/server/traffic/cash";
import { blockRegisterSchema, closeRegisterSchema, depositRespondSchema, depositReviewSchema, depositSchema, discrepancyActionSchema, openRegisterSchema, reconciliationActionSchema, verifyClosureSchema } from "@/server/traffic/cash-schemas";

export async function openRegisterAction(_p: FormState, fd: FormData): Promise<FormState> {
  let target: string;
  try {
    const actor = await requirePermissionForAction("cash:register");
    const reg = await cash.openRegister(actor, openRegisterSchema.parse(formEntries(fd)), await getRequestContext());
    target = `/traffic/cash/registers/${reg.id}?opened=1`;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not open the cash register.", "traffic-cash");
  }
  redirect(target);
}

export async function closeRegisterAction(_p: FormState, fd: FormData): Promise<FormState> {
  let target: string;
  try {
    const actor = await requirePermissionForAction("cash:register");
    const r = await cash.closeRegister(actor, closeRegisterSchema.parse(formEntries(fd)), await getRequestContext());
    target = `/traffic/cash/closures/${r.closure.id}?closed=1`;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not close the cash register.", "traffic-cash");
  }
  redirect(target);
}

export async function blockRegisterAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("cash:block");
    await cash.setRegisterBlocked(actor, blockRegisterSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Cash register updated." };
  } catch (e) {
    return fail(e, "Could not update the cash register.", "traffic-cash");
  }
}

export async function verifyClosureAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("cash:verify_closure");
    await cash.verifyClosure(actor, verifyClosureSchema.parse(formEntries(fd)).collectionId, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Closing verified." };
  } catch (e) {
    return fail(e, "Could not verify the closing.", "traffic-cash");
  }
}

export async function createDepositAction(_p: FormState, fd: FormData): Promise<FormState> {
  let target: string;
  try {
    const actor = await requirePermissionForAction("cash:deposit_create");
    const r = await cash.createDeposit(actor, depositSchema.parse(formEntries(fd)), formFile(fd, "attachment"), await getRequestContext());
    target = `/traffic/cash/deposits/${r.id}?created=1`;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not record the deposit.", "traffic-cash");
  }
  redirect(target);
}

export async function reviewDepositAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    const input = depositReviewSchema.parse(formEntries(fd));
    await requirePermissionForAction(input.op === "validate" ? "cash:deposit_validate" : "cash:deposit_review", actor);
    await cash.reviewDeposit(actor, input, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Deposit updated." };
  } catch (e) {
    return fail(e, "Could not update the deposit.", "traffic-cash");
  }
}

export async function respondDepositAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("cash:deposit_create");
    await cash.respondToJustification(actor, depositRespondSchema.parse(formEntries(fd)), formFile(fd, "attachment"), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Justification sent." };
  } catch (e) {
    return fail(e, "Could not send the justification.", "traffic-cash");
  }
}

export async function reconciliationAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("cash:reconcile");
    await cash.actOnReconciliation(actor, reconciliationActionSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Reconciliation updated." };
  } catch (e) {
    return fail(e, "Could not update the reconciliation.", "traffic-cash");
  }
}

export async function discrepancyAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await cash.actOnDiscrepancy(actor, discrepancyActionSchema.parse(formEntries(fd)), formFile(fd, "attachment"), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Discrepancy updated." };
  } catch (e) {
    return fail(e, "Could not update the discrepancy.", "traffic-cash");
  }
}

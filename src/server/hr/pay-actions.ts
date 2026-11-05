"use server";

import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, revalidateAll } from "@/server/action-utils";
import { requireActorForAction } from "@/server/auth/dal";
import { componentSchema, decideElement, decideScaleEntry, decisionSchema, elementSchema, endElement, endElementSchema, generateRun, createComponent, requestElement, requestScaleEntry, scaleSchema, updateComponent, validateRun } from "@/server/hr/pay";
import type { FormState } from "@/components/forms";

const int = (v: string | undefined) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);

export async function requestScaleAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const e = formEntries(fd);
    await requestScaleEntry(await requireActorForAction(), scaleSchema.parse({ ...e, amount: int(e.amount) }), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Pay scale change requested." };
  } catch (err) {
    return fail(err, "Could not request the pay scale change.", "pay");
  }
}

export async function decideScaleAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    await decideScaleEntry(await requireActorForAction(), decisionSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Decision recorded." };
  } catch (err) {
    return fail(err, "Could not record the decision.", "pay");
  }
}

export async function saveComponentAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const e = formEntries(fd);
    const input = componentSchema.parse({ ...e, defaultValue: int(e.defaultValue) ?? 0, isActive: e.isActive === "on" || e.id === undefined || e.id === "" });
    const actor = await requireActorForAction();
    if (e.id) await updateComponent(actor, e.id, { ...input, isActive: e.isActive === "on" }, await getRequestContext());
    else await createComponent(actor, input, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Pay element saved." };
  } catch (err) {
    return fail(err, "Could not save the pay element.", "pay");
  }
}

export async function requestElementAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const e = formEntries(fd);
    await requestElement(await requireActorForAction(), elementSchema.parse({ ...e, value: int(e.value) }), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Pay element requested." };
  } catch (err) {
    return fail(err, "Could not request the pay element.", "pay");
  }
}

export async function decideElementAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    await decideElement(await requireActorForAction(), decisionSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Decision recorded." };
  } catch (err) {
    return fail(err, "Could not record the decision.", "pay");
  }
}

export async function endElementAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    await endElement(await requireActorForAction(), endElementSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Pay element ended." };
  } catch (err) {
    return fail(err, "Could not end the pay element.", "pay");
  }
}

export async function generateRunAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const r = await generateRun(await requireActorForAction(), String(fd.get("period") ?? ""), await getRequestContext());
    revalidateAll();
    return { ok: true, message: `Pay statement generated: ${r.officers} officer(s).` };
  } catch (err) {
    return fail(err, "Could not generate the pay statement.", "pay");
  }
}

export async function validateRunAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    await validateRun(await requireActorForAction(), String(fd.get("id") ?? ""), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Pay statement validated." };
  } catch (err) {
    return fail(err, "Could not validate the pay statement.", "pay");
  }
}

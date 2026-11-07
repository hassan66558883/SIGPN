"use server";

import { redirect } from "next/navigation";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, formFile, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as svc from "@/server/wanted/service";
import { createWarrantSchema, sightingSchema, wantedPersonSchema, wantedStatusSchema, wantedVehicleSchema, wantedVerifySchema, warrantStatusSchema } from "@/server/wanted/schemas";
import { BusinessError } from "@/server/errors";
import type { FormState } from "@/components/forms";

export async function createWantedPersonAction(_p: FormState, fd: FormData): Promise<FormState> {
  let created: string;
  try {
    const actor = await requirePermissionForAction("wanted:create");
    const w = await svc.createWantedPerson(actor, wantedPersonSchema.parse(formEntries(fd)), await getRequestContext());
    created = w.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not create the wanted notice.", "wanted");
  }
  redirect(`/wanted/${created}?created=1`);
}

export async function updateWantedPersonAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("wanted:update");
    const entries = formEntries(fd);
    const id = String(fd.get("id") ?? "");
    await svc.updateWantedPerson(actor, id, wantedPersonSchema.omit({ personId: true, stationId: true }).parse(entries), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Wanted notice updated." };
  } catch (e) {
    return fail(e, "Could not update the wanted notice.", "wanted");
  }
}

export async function setWantedStatusAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("wanted:update");
    await svc.setWantedStatus(actor, wantedStatusSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Status updated." };
  } catch (e) {
    return fail(e, "Could not update the status.", "wanted");
  }
}

export async function verifyWantedAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("wanted:verify");
    await svc.verifyWanted(actor, wantedVerifySchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Verification recorded." };
  } catch (e) {
    return fail(e, "Could not record the verification.", "wanted");
  }
}

export async function addSightingAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("wanted:update");
    await svc.addSighting(actor, sightingSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Sighting recorded." };
  } catch (e) {
    return fail(e, "Could not record the sighting.", "wanted");
  }
}

export async function addVehicleAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("wanted:update");
    await svc.addVehicle(actor, wantedVehicleSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Vehicle associated." };
  } catch (e) {
    return fail(e, "Could not associate the vehicle.", "wanted");
  }
}

export async function attachPhotoAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("wanted:update");
    const wantedPersonId = String(fd.get("wantedPersonId") ?? "");
    const setAsMain = fd.get("setAsMain") === "on";
    const file = formFile(fd, "file");
    if (!wantedPersonId || !file) throw new BusinessError("A photo file is required.");
    await svc.attachPhoto(actor, wantedPersonId, file, setAsMain, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Photo saved." };
  } catch (e) {
    return fail(e, "Could not save the photo.", "wanted");
  }
}

export async function createWarrantAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("warrants:create");
    await svc.createWarrantForWantedPerson(actor, createWarrantSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Warrant requested." };
  } catch (e) {
    return fail(e, "Could not request the warrant.", "wanted");
  }
}

export async function setWarrantStatusAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("warrants:view");
    await svc.setWarrantStatus(actor, warrantStatusSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Warrant status updated." };
  } catch (e) {
    return fail(e, "Could not update the warrant status.", "wanted");
  }
}

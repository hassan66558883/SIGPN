"use server";

import { redirect } from "next/navigation";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, formFile, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as svc from "@/server/evidence/service";
import { custodyTransferSchema, evidenceSchema, storageLocationSchema } from "@/server/evidence/schemas";
import { BusinessError } from "@/server/errors";
import type { FormState } from "@/components/forms";

export async function createEvidenceAction(_p: FormState, fd: FormData): Promise<FormState> {
  let created: string;
  try {
    const actor = await requirePermissionForAction("evidence:create");
    const input = evidenceSchema.parse(formEntries(fd));
    const file = formFile(fd, "file");
    const e = await svc.createEvidence(actor, input, file, await getRequestContext());
    created = e.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not register the evidence.", "evidence");
  }
  redirect(`/evidence/${created}?created=1`);
}

export async function attachEvidenceFileAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("evidence:update");
    const evidenceId = String(fd.get("evidenceId") ?? "");
    const file = formFile(fd, "file");
    if (!evidenceId || !file) throw new BusinessError("A file is required.");
    await svc.attachEvidenceFile(actor, evidenceId, file, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "File attached to the evidence." };
  } catch (e) {
    return fail(e, "Could not attach the file.", "evidence");
  }
}

export async function transferCustodyAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("evidence:transfer");
    await svc.transferCustody(actor, custodyTransferSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Custody transfer recorded." };
  } catch (e) {
    return fail(e, "Could not record the transfer.", "evidence");
  }
}

export async function upsertStorageLocationAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("evidence:manage_locations");
    await svc.upsertStorageLocation(actor, storageLocationSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Storage location saved." };
  } catch (e) {
    return fail(e, "Could not save the storage location.", "evidence");
  }
}

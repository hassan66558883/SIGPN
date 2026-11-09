"use server";

import { redirect } from "next/navigation";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as svc from "@/server/arrests/service";
import { arrestSchema, arrestStatusSchema } from "@/server/arrests/schemas";
import type { FormState } from "@/components/forms";

export async function createArrestAction(_p: FormState, fd: FormData): Promise<FormState> {
  let id: string;
  try {
    const actor = await requirePermissionForAction("arrests:create");
    const a = await svc.createArrest(actor, arrestSchema.parse(formEntries(fd)), await getRequestContext());
    id = a.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not record the arrest.", "arrests");
  }
  redirect(`/arrests/${id}?created=1`);
}

export async function changeArrestStatusAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("arrests:update");
    await svc.changeArrestStatus(actor, arrestStatusSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Arrest updated." };
  } catch (e) {
    return fail(e, "Could not update the arrest.", "arrests");
  }
}

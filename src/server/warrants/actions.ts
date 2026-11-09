"use server";

import { redirect } from "next/navigation";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as svc from "@/server/warrants/service";
import { warrantDecisionSchema, warrantSchema } from "@/server/warrants/schemas";
import type { FormState } from "@/components/forms";

export async function createWarrantAction(_p: FormState, fd: FormData): Promise<FormState> {
  let id: string;
  try {
    const actor = await requirePermissionForAction("warrants:create");
    const w = await svc.createWarrant(actor, warrantSchema.parse(formEntries(fd)), await getRequestContext());
    id = w.id;
    revalidateAll();
  } catch (e) {
    return fail(e, "Could not create the warrant.", "warrants");
  }
  redirect(`/warrants/${id}?created=1`);
}

export async function decideWarrantAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("warrants:view");
    await svc.decideWarrant(actor, warrantDecisionSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Warrant updated." };
  } catch (e) {
    return fail(e, "Could not update the warrant.", "warrants");
  }
}

"use server";

import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, revalidateAll } from "@/server/action-utils";
import { requirePermissionForAction } from "@/server/auth/dal";
import * as svc from "@/server/hr/service";
import { careerEventSchema, dossierSchema } from "@/server/hr/schemas";
import type { FormState } from "@/components/forms";

export async function updateDossierAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("hr:manage");
    await svc.updateDossier(actor, String(fd.get("officerId") ?? ""), dossierSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "HR dossier updated." };
  } catch (e) {
    return fail(e, "Could not update the HR dossier.", "hr");
  }
}

export async function recordCareerEventAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requirePermissionForAction("hr:career");
    await svc.recordCareerEvent(actor, careerEventSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Career decision recorded." };
  } catch (e) {
    return fail(e, "Could not record the career decision.", "hr");
  }
}

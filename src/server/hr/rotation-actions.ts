"use server";

import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, formList, revalidateAll } from "@/server/action-utils";
import { requireActorForAction } from "@/server/auth/dal";
import { createException, endException, runRotation } from "@/server/hr/rotation";
import { AuthError } from "@/server/errors";
import { RANK_CATEGORIES, rotationSettingsSchema, updateRotationSettings } from "@/server/hr/rotation-settings";
import { exceptionSchema } from "@/server/hr/rotation-schemas";
import type { FormState } from "@/components/forms";

const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

export async function saveRotationSettingsAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    const e = formEntries(fd);
    const input = rotationSettingsSchema.parse({
      enabled: e.enabled === "on",
      durationMonths: num(e.durationMonths, 12),
      warningDays: num(e.warningDays, 30),
      categories: formList(fd, "categories").filter((c) => (RANK_CATEGORIES as readonly string[]).includes(c)),
      excludedPositionIds: formList(fd, "excludedPositionIds"),
      sameProvinceOnly: e.sameProvinceOnly === "on",
      effectiveDelayDays: num(e.effectiveDelayDays, 30),
      validatorRoleCodes: formList(fd, "validatorRoleCodes"),
      pilotStationIds: formList(fd, "pilotStationIds"),
      maxProposalsPerRun: num(e.maxProposalsPerRun, 200),
    });
    await updateRotationSettings(actor, input, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Automatic assignment settings saved." };
  } catch (err) {
    return fail(err, "Could not save the automatic assignment settings.", "hr");
  }
}

export async function runRotationAction(_p: FormState): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    if (!actor.permissions.has("hr:transfer_review")) throw new AuthError("forbidden");
    const r = await runRotation({ actor, trigger: "MANUAL", ctx: await getRequestContext() });
    revalidateAll();
    if (!r.enabled) return { error: "Automatic assignment is disabled." };
    return { ok: true, message: `Run completed: ${r.proposals} proposal(s), ${r.upcomingAlerts} alert(s), ${r.executedDue} executed.` };
  } catch (err) {
    return fail(err, "The automatic assignment run failed.", "hr");
  }
}

export async function createExceptionAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await createException(actor, exceptionSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Rotation exception recorded." };
  } catch (err) {
    return fail(err, "Could not record the exception.", "hr");
  }
}

export async function endExceptionAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await endException(actor, String(fd.get("id") ?? ""), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Rotation exception ended." };
  } catch (err) {
    return fail(err, "Could not end the exception.", "hr");
  }
}

"use server";

import { redirect } from "next/navigation";
import { getRequestContext } from "@/server/request-context";
import { fail, formEntries, formList, revalidateAll } from "@/server/action-utils";
import { requireActorForAction } from "@/server/auth/dal";
import { cancelLeave, decideLeave, recordRollCall, requestLeave } from "@/server/hr/attendance";
import { leaveCancelSchema, leaveDecisionSchema, leaveRequestSchema, rollCallSchema, ROLL_CALL_STATUSES } from "@/server/hr/attendance-schemas";
import { evaluateTraining, evaluationSchema, issueCertificate } from "@/server/hr/training";
import type { FormState } from "@/components/forms";

export async function recordRollCallAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    const e = formEntries(fd);
    const entries = formList(fd, "officerId").flatMap((officerId) => {
      const status = e[`status_${officerId}`];
      if (!status || !(ROLL_CALL_STATUSES as readonly string[]).includes(status)) return []; // untouched / locked rows are skipped
      const minutes = Number(e[`late_${officerId}`]);
      return [{ officerId, status, ...(status === "LATE" ? { lateMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : undefined } : {}), note: e[`note_${officerId}`] || undefined }];
    });
    const r = await recordRollCall(actor, rollCallSchema.parse({ stationId: e.stationId, date: e.date, entries }), await getRequestContext());
    revalidateAll();
    return { ok: true, message: `Roll-call saved: ${r.recorded} officer(s).` };
  } catch (err) {
    return fail(err, "Could not save the roll-call.", "hr");
  }
}

export async function requestLeaveAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await requestLeave(actor, leaveRequestSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
  } catch (err) {
    return fail(err, "Could not file the request.", "hr");
  }
  redirect("/hr/leaves?created=1");
}

export async function decideLeaveAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await decideLeave(actor, leaveDecisionSchema.parse(formEntries(fd)), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Decision recorded." };
  } catch (err) {
    return fail(err, "Could not record the decision.", "hr");
  }
}

export async function cancelLeaveAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    const i = leaveCancelSchema.parse(formEntries(fd));
    await cancelLeave(actor, i.id, i.reason, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Request cancelled." };
  } catch (err) {
    return fail(err, "Could not cancel the request.", "hr");
  }
}

export async function evaluateTrainingAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    const e = formEntries(fd);
    const level = Number(e.level) || 1;
    const validMonths = e.validMonths ? Number(e.validMonths) : undefined;
    const input = evaluationSchema.parse({
      trainingId: e.trainingId,
      passed: e.passed === "yes",
      score: e.score ? Number(e.score) : undefined,
      result: e.result || undefined,
      skills: e.passed === "yes" ? formList(fd, "skillIds").map((skillId) => ({ skillId, level, validMonths })) : [],
    });
    await evaluateTraining(actor, input, await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Evaluation recorded." };
  } catch (err) {
    return fail(err, "Could not record the evaluation.", "hr");
  }
}

export async function issueCertificateAction(_p: FormState, fd: FormData): Promise<FormState> {
  try {
    const actor = await requireActorForAction();
    await issueCertificate(actor, String(fd.get("trainingId") ?? ""), await getRequestContext());
    revalidateAll();
    return { ok: true, message: "Certificate issued." };
  } catch (err) {
    return fail(err, "Could not issue the certificate.", "hr");
  }
}

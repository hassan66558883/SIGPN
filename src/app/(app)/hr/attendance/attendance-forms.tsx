"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { ATTENDANCE_STATUS, LEAVE_TYPE, labelOf, optionsOf } from "@/lib/labels";
import { cancelLeaveAction, decideLeaveAction, evaluateTrainingAction, issueCertificateAction, recordRollCallAction, requestLeaveAction } from "@/server/hr/attendance-actions";

type Opt = { value: string; label: string };
type Row = { id: string; badgeNumber: string; name: string; rank: string; status: string | null; lateMinutes: number | null; note: string | null; locked: boolean };

function RollRow({ r }: { r: Row }) {
  const t = useT();
  const locale = useLocale();
  const [status, setStatus] = useState(r.status ?? "");
  const st = r.status ? labelOf(ATTENDANCE_STATUS, r.status, locale) : null;
  return (
    <tr>
      <td data-label={t("hr.col.agent")}>
        <input type="hidden" name="officerId" value={r.id} />
        <span className="font-semibold">{r.name}</span>
        <span className="block font-mono text-[11px] text-slate">
          {r.badgeNumber} · {r.rank}
        </span>
      </td>
      <td data-label={t("hr.col.status")}>
        {r.locked && st ? (
          <Badge tone={st.tone}>{st.label}</Badge>
        ) : (
          <Select name={`status_${r.id}`} value={status} onChange={(e) => setStatus(e.target.value)} placeholder={t("hr.att.notRecorded")} options={["PRESENT", "LATE", "ABSENT"].map((k) => ({ value: k, label: labelOf(ATTENDANCE_STATUS, k, locale).label }))} aria-label={r.name} />
        )}
      </td>
      <td data-label={t("hr.att.minutes")}>{!r.locked && status === "LATE" ? <input name={`late_${r.id}`} type="number" min={1} max={720} defaultValue={r.lateMinutes ?? ""} className="input w-24" aria-label={t("hr.att.minutes")} /> : null}</td>
      <td data-label={t("hr.dossier.notes")}>{r.locked ? <span className="text-xs text-slate">{t("hr.att.lockedByLeave")}</span> : <input name={`note_${r.id}`} defaultValue={r.note ?? ""} maxLength={300} className="input" aria-label={t("hr.dossier.notes")} />}</td>
    </tr>
  );
}

export function RollCallForm({ stationId, date, rows }: { stationId: string; date: string; rows: Row[] }) {
  const t = useT();
  return (
    <ActionForm action={recordRollCallAction}>
      {() => (
        <>
          <input type="hidden" name="stationId" value={stationId} />
          <input type="hidden" name="date" value={date} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate">
                  <th className="py-1">{t("hr.col.agent")}</th>
                  <th>{t("hr.col.status")}</th>
                  <th>{t("hr.att.minutes")}</th>
                  <th>{t("hr.dossier.notes")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <RollRow key={r.id} r={r} />
                ))}
              </tbody>
            </table>
          </div>
          <SubmitButton pendingText={t("hr.saving")}>{t("hr.att.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function LeaveRequestForm({ officerId, balance }: { officerId: string; balance: { entitlement: number; used: number; remaining: number; year: number } | null }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={requestLeaveAction}>
      {(s) => (
        <>
          <input type="hidden" name="officerId" value={officerId} />
          {balance ? <p className="text-sm text-slate">{t("hr.leave.balance", { y: balance.year, r: balance.remaining, e: balance.entitlement })}</p> : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("hr.leave.type")} htmlFor="l-type" required>
              <Select id="l-type" name="type" defaultValue="ANNUAL" options={optionsOf(LEAVE_TYPE, locale)} />
            </Field>
            <Field label={t("hr.leave.start")} htmlFor="l-start" required error={s.fieldErrors?.startDate}>
              <input id="l-start" name="startDate" type="date" className="input" required />
            </Field>
            <Field label={t("hr.leave.end")} htmlFor="l-end" required error={s.fieldErrors?.endDate}>
              <input id="l-end" name="endDate" type="date" className="input" required />
            </Field>
          </div>
          <Field label={t("hr.leave.reason")} htmlFor="l-reason" hint={t("hr.leave.reasonHint")} error={s.fieldErrors?.reason}>
            <textarea id="l-reason" name="reason" rows={2} className="input" maxLength={500} />
          </Field>
          <SubmitButton pendingText={t("hr.transfers.sending")}>{t("hr.leave.send")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function LeaveDecisionForm({ id }: { id: string }) {
  const t = useT();
  return (
    <ActionForm action={decideLeaveAction} className="flex flex-wrap items-start gap-2">
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <input name="note" className="input min-w-[160px] flex-1" placeholder={t("hr.transfers.noteHint")} maxLength={500} aria-label={t("hr.transfers.note")} />
          <SubmitButton size="xs" name="decision" value="APPROVE" pendingText="…">
            {t("hr.transfers.approve")}
          </SubmitButton>
          <SubmitButton size="xs" variant="danger" name="decision" value="REJECT" pendingText="…">
            {t("hr.transfers.reject")}
          </SubmitButton>
          {s.fieldErrors?.note ? <span className="w-full text-xs text-danger">{s.fieldErrors.note}</span> : null}
        </>
      )}
    </ActionForm>
  );
}

export function LeaveCancelForm({ id }: { id: string }) {
  const t = useT();
  return (
    <ActionForm action={cancelLeaveAction} className="flex flex-wrap items-center gap-2">
      {() => (
        <>
          <input type="hidden" name="id" value={id} />
          <input name="reason" className="input min-w-[160px] flex-1" placeholder={t("hr.transfers.cancelReason")} required minLength={3} maxLength={500} aria-label={t("hr.transfers.cancelReason")} />
          <SubmitButton size="xs" variant="secondary" pendingText="…">
            {t("hr.transfers.cancel")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function EvaluateTrainingForm({ trainingId, skills }: { trainingId: string; skills: Opt[] }) {
  const t = useT();
  const [passed, setPassed] = useState("yes");
  return (
    <ActionForm action={evaluateTrainingAction}>
      {(s) => (
        <>
          <input type="hidden" name="trainingId" value={trainingId} />
          <div className="grid gap-2 sm:grid-cols-4">
            <Field label={t("hr.tr.outcome")} htmlFor={`e-p-${trainingId}`}>
              <Select id={`e-p-${trainingId}`} name="passed" value={passed} onChange={(e) => setPassed(e.target.value)} options={[{ value: "yes", label: t("hr.tr.passed") }, { value: "no", label: t("hr.tr.failed") }]} />
            </Field>
            <Field label={t("hr.tr.score")} htmlFor={`e-s-${trainingId}`} error={s.fieldErrors?.score}>
              <input id={`e-s-${trainingId}`} name="score" type="number" step="0.25" min={0} max={20} className="input" />
            </Field>
            <Field label={t("training.result")} htmlFor={`e-r-${trainingId}`} className="sm:col-span-2">
              <input id={`e-r-${trainingId}`} name="result" maxLength={200} className="input" />
            </Field>
          </div>
          {passed === "yes" ? (
            <fieldset className="mt-2">
              <legend className="mb-1 text-xs font-semibold">{t("hr.tr.skills")}</legend>
              <div className="flex flex-wrap gap-3">
                {skills.map((k) => (
                  <label key={k.value} className="flex items-center gap-1 text-xs">
                    <input type="checkbox" name="skillIds" value={k.value} /> {k.label}
                  </label>
                ))}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Field label={t("hr.tr.level")} htmlFor={`e-l-${trainingId}`}>
                  <Select id={`e-l-${trainingId}`} name="level" defaultValue="2" options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))} />
                </Field>
                <Field label={t("hr.tr.validMonths")} htmlFor={`e-v-${trainingId}`}>
                  <input id={`e-v-${trainingId}`} name="validMonths" type="number" min={1} max={240} className="input" />
                </Field>
              </div>
            </fieldset>
          ) : null}
          <p className="text-xs text-slate">{t("hr.tr.final")}</p>
          <SubmitButton size="sm" pendingText={t("hr.saving")}>
            {t("hr.tr.evaluate")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function IssueCertificateForm({ trainingId }: { trainingId: string }) {
  const t = useT();
  return (
    <ActionForm action={issueCertificateAction} className="inline">
      {() => (
        <>
          <input type="hidden" name="trainingId" value={trainingId} />
          <SubmitButton size="xs" pendingText="…">
            {t("hr.tr.issue")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

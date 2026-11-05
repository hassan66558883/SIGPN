"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { DISCIPLINE_STEP, DISTINCTION_KIND, SANCTION_KIND, optionsOf } from "@/lib/labels";
import { addDistinctionAction, addStepAction, decideCaseAction, openCaseAction } from "@/server/hr/discipline-actions";

export function OpenCaseForm({ officerId }: { officerId: string }) {
  const t = useT();
  return (
    <ActionForm action={openCaseAction}>
      {(s) => (
        <>
          <input type="hidden" name="officerId" value={officerId} />
          <Field label={t("hr.dis.facts")} htmlFor="o-facts" required error={s.fieldErrors?.facts}>
            <textarea id="o-facts" name="facts" rows={4} className="input" required minLength={10} maxLength={4000} />
          </Field>
          <Field label={t("hr.dis.factsDate")} htmlFor="o-date" required error={s.fieldErrors?.factsDate}>
            <input id="o-date" name="factsDate" type="date" className="input" required />
          </Field>
          <SubmitButton pendingText={t("hr.saving")}>{t("hr.dis.open")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function StepForm({ caseId }: { caseId: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={addStepAction}>
      {(s) => (
        <>
          <input type="hidden" name="caseId" value={caseId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("hr.dis.stepKind")} htmlFor="s-kind">
              <Select id="s-kind" name="kind" defaultValue="HEARING" options={optionsOf(DISCIPLINE_STEP, locale)} />
            </Field>
            <Field label={t("hr.leave.start")} htmlFor="s-date" required error={s.fieldErrors?.date}>
              <input id="s-date" name="date" type="date" className="input" required />
            </Field>
          </div>
          <Field label={t("hr.dossier.notes")} htmlFor="s-note" required error={s.fieldErrors?.note}>
            <textarea id="s-note" name="note" rows={3} className="input" required minLength={3} maxLength={2000} />
          </Field>
          <SubmitButton size="sm" pendingText={t("hr.saving")}>
            {t("hr.dis.addStep")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function DecisionForm({ caseId, hasHearing }: { caseId: string; hasHearing: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [sanction, setSanction] = useState("WARNING");
  return (
    <ActionForm action={decideCaseAction}>
      {(s) => (
        <>
          <input type="hidden" name="caseId" value={caseId} />
          {!hasHearing ? <p className="text-xs text-warning">{t("hr.dis.needHearing")}</p> : null}
          <Field label={t("hr.dis.sanction")} htmlFor="d-san">
            <Select id="d-san" name="sanction" value={sanction} onChange={(e) => setSanction(e.target.value)} options={optionsOf(SANCTION_KIND, locale)} />
          </Field>
          {sanction === "SUSPENSION" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("hr.leave.start")} htmlFor="d-start" required error={s.fieldErrors?.startDate}>
                <input id="d-start" name="startDate" type="date" className="input" required />
              </Field>
              <Field label={t("hr.leave.end")} htmlFor="d-end" required error={s.fieldErrors?.endDate}>
                <input id="d-end" name="endDate" type="date" className="input" required />
              </Field>
            </div>
          ) : null}
          <Field label={t("hr.dis.reason")} htmlFor="d-reason" required error={s.fieldErrors?.reason}>
            <textarea id="d-reason" name="reason" rows={3} className="input" required minLength={10} maxLength={2000} />
          </Field>
          <SubmitButton size="sm" variant="danger" pendingText={t("hr.saving")}>
            {t("hr.dis.decide")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function DistinctionForm({ officerId }: { officerId: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={addDistinctionAction}>
      {(s) => (
        <>
          <input type="hidden" name="officerId" value={officerId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("hr.leave.type")} htmlFor="x-kind">
              <Select id="x-kind" name="kind" defaultValue="COMMENDATION" options={optionsOf(DISTINCTION_KIND, locale)} />
            </Field>
            <Field label={t("training.name")} htmlFor="x-title" required error={s.fieldErrors?.title} className="sm:col-span-2">
              <input id="x-title" name="title" className="input" required minLength={3} maxLength={200} />
            </Field>
            <Field label={t("hr.dis.awardedAt")} htmlFor="x-date" required error={s.fieldErrors?.awardedAt}>
              <input id="x-date" name="awardedAt" type="date" className="input" required />
            </Field>
            <Field label={t("hr.career.reference")} htmlFor="x-ref">
              <input id="x-ref" name="reference" className="input" maxLength={60} />
            </Field>
            <Field label={t("hr.leave.reason")} htmlFor="x-reason">
              <input id="x-reason" name="reason" className="input" maxLength={500} />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("hr.saving")}>
            {t("hr.dis.addDistinction")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

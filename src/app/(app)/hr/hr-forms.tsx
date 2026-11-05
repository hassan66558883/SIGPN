"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { CAREER_EVENT_TYPE, GENDER, MARITAL_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { recordCareerEventAction, updateDossierAction } from "@/server/hr/actions";

type Opt = { value: string; label: string };

export type DossierValues = {
  officerId: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  birthPlace: string;
  maritalStatus: string;
  phone: string;
  email: string;
  corpsId: string;
  hiredAt: string;
  serviceStartDate: string;
  specialties: string;
  notes: string;
};

export function DossierForm({ values, corps }: { values: DossierValues; corps: Opt[] }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={updateDossierAction}>
      {(s) => (
        <>
          <input type="hidden" name="officerId" value={values.officerId} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("hr.dossier.firstName")} htmlFor="d-fn" required error={s.fieldErrors?.firstName}>
              <input id="d-fn" name="firstName" className="input" required maxLength={60} defaultValue={values.firstName} />
            </Field>
            <Field label={t("hr.dossier.lastName")} htmlFor="d-ln" required error={s.fieldErrors?.lastName}>
              <input id="d-ln" name="lastName" className="input" required maxLength={60} defaultValue={values.lastName} />
            </Field>
            <Field label={t("hr.dossier.gender")} htmlFor="d-g">
              <Select id="d-g" name="gender" defaultValue={values.gender} options={optionsOf(GENDER, locale)} />
            </Field>
            <Field label={t("hr.dossier.dateOfBirth")} htmlFor="d-dob" error={s.fieldErrors?.dateOfBirth}>
              <input id="d-dob" name="dateOfBirth" type="date" className="input" defaultValue={values.dateOfBirth} />
            </Field>
            <Field label={t("hr.dossier.birthPlace")} htmlFor="d-bp">
              <input id="d-bp" name="birthPlace" className="input" maxLength={100} defaultValue={values.birthPlace} />
            </Field>
            <Field label={t("hr.dossier.maritalStatus")} htmlFor="d-ms">
              <Select id="d-ms" name="maritalStatus" defaultValue={values.maritalStatus} placeholder={t("hr.dossier.noCorps")} options={optionsOf(MARITAL_STATUS, locale)} />
            </Field>
            <Field label={t("hr.dossier.phone")} htmlFor="d-ph">
              <input id="d-ph" name="phone" className="input" maxLength={30} defaultValue={values.phone} />
            </Field>
            <Field label={t("hr.dossier.email")} htmlFor="d-em">
              <input id="d-em" name="email" type="email" className="input" maxLength={120} defaultValue={values.email} />
            </Field>
            <Field label={t("hr.dossier.corps")} htmlFor="d-co">
              <Select id="d-co" name="corpsId" defaultValue={values.corpsId} placeholder={t("hr.dossier.noCorps")} options={corps} />
            </Field>
            <Field label={t("hr.dossier.hiredAt")} htmlFor="d-hi">
              <input id="d-hi" name="hiredAt" type="date" className="input" defaultValue={values.hiredAt} />
            </Field>
            <Field label={t("hr.dossier.serviceStart")} htmlFor="d-ss">
              <input id="d-ss" name="serviceStartDate" type="date" className="input" defaultValue={values.serviceStartDate} />
            </Field>
            <Field label={t("hr.dossier.specialties")} htmlFor="d-sp">
              <input id="d-sp" name="specialties" className="input" maxLength={300} defaultValue={values.specialties} />
            </Field>
          </div>
          <Field label={t("hr.dossier.notes")} htmlFor="d-no">
            <textarea id="d-no" name="notes" rows={2} className="input" maxLength={1000} defaultValue={values.notes} />
          </Field>
          <SubmitButton size="sm" pendingText={t("hr.saving")}>
            {t("hr.save")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

const NEEDS_RANK = ["PROMOTION", "ADVANCEMENT"];
const NEEDS_POSITION = ["APPOINTMENT", "FUNCTION_CHANGE"];

export function CareerEventForm({ officerId, ranks, positions, types }: { officerId: string; ranks: Opt[]; positions: Opt[]; types: string[] }) {
  const t = useT();
  const locale = useLocale();
  const [type, setType] = useState(types[0] ?? "PROMOTION");
  return (
    <ActionForm action={recordCareerEventAction}>
      {(s) => (
        <>
          <input type="hidden" name="officerId" value={officerId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("hr.career.type")} htmlFor="c-type" required>
              <Select id="c-type" name="type" value={type} onChange={(e) => setType(e.target.value)} options={types.map((k) => ({ value: k, label: labelOf(CAREER_EVENT_TYPE, k, locale).label }))} />
            </Field>
            <Field label={t("hr.career.effectiveDate")} htmlFor="c-date" required error={s.fieldErrors?.effectiveDate}>
              <input id="c-date" name="effectiveDate" type="date" className="input" required />
            </Field>
            <Field label={t("hr.career.reference")} htmlFor="c-ref" hint={t("hr.career.referenceHint")} required error={s.fieldErrors?.reference}>
              <input id="c-ref" name="reference" className="input" required maxLength={60} />
            </Field>
            {NEEDS_RANK.includes(type) ? (
              <Field label={t("hr.career.newRank")} htmlFor="c-rank" required error={s.fieldErrors?.toRankId}>
                <Select id="c-rank" name="toRankId" placeholder={t("hr.career.choose")} options={ranks} />
              </Field>
            ) : null}
            {NEEDS_POSITION.includes(type) ? (
              <Field label={t("hr.career.newFunction")} htmlFor="c-pos" required error={s.fieldErrors?.toPositionId}>
                <Select id="c-pos" name="toPositionId" placeholder={t("hr.career.choose")} options={positions} />
              </Field>
            ) : null}
          </div>
          <Field label={t("hr.career.reason")} htmlFor="c-reason">
            <textarea id="c-reason" name="reason" rows={2} className="input" maxLength={500} />
          </Field>
          <p className="text-xs text-slate">{t("hr.career.appendOnly")}</p>
          <SubmitButton size="sm" pendingText={t("hr.career.saving")}>
            {t("hr.career.submit")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

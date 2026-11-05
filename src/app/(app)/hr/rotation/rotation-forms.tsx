"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n";
import { createExceptionAction, endExceptionAction, runRotationAction, saveRotationSettingsAction } from "@/server/hr/rotation-actions";

type Opt = { value: string; label: string };
export type SettingsValues = {
  enabled: boolean;
  durationMonths: number;
  warningDays: number;
  effectiveDelayDays: number;
  maxProposalsPerRun: number;
  categories: string[];
  excludedPositionIds: string[];
  sameProvinceOnly: boolean;
  validatorRoleCodes: string[];
  pilotStationIds: string[];
};

const CATEGORIES = ["COMMISSIONER", "OFFICER", "INSPECTOR", "NON_COMMISSIONED", "CONSTABLE", "CIVILIAN"];

function Checks({ name, options, selected }: { name: string; options: Opt[]; selected: string[] }) {
  return (
    <div className="grid gap-1 sm:grid-cols-2">
      {options.map((o) => (
        <label key={o.value} className="flex items-center gap-2 text-sm">
          <input type="checkbox" name={name} value={o.value} defaultChecked={selected.includes(o.value)} /> {o.label}
        </label>
      ))}
    </div>
  );
}

export function RotationSettingsForm({ values, positions, validators, stations }: { values: SettingsValues; positions: Opt[]; validators: Opt[]; stations: Opt[] }) {
  const t = useT();
  return (
    <ActionForm action={saveRotationSettingsAction}>
      {(s) => (
        <>
          <label className="flex items-center gap-2 rounded-md border border-line bg-mist p-3 text-sm font-semibold">
            <input type="checkbox" name="enabled" defaultChecked={values.enabled} /> {t("hr.rot.cfg.enabled")}
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("hr.rot.cfg.duration")} htmlFor="r-dur" error={s.fieldErrors?.durationMonths}>
              <input id="r-dur" name="durationMonths" type="number" min={1} max={120} className="input" defaultValue={values.durationMonths} />
            </Field>
            <Field label={t("hr.rot.cfg.warning")} htmlFor="r-warn" error={s.fieldErrors?.warningDays}>
              <input id="r-warn" name="warningDays" type="number" min={0} max={365} className="input" defaultValue={values.warningDays} />
            </Field>
            <Field label={t("hr.rot.cfg.delay")} htmlFor="r-delay" error={s.fieldErrors?.effectiveDelayDays}>
              <input id="r-delay" name="effectiveDelayDays" type="number" min={0} max={180} className="input" defaultValue={values.effectiveDelayDays} />
            </Field>
            <Field label={t("hr.rot.cfg.max")} htmlFor="r-max" error={s.fieldErrors?.maxProposalsPerRun}>
              <input id="r-max" name="maxProposalsPerRun" type="number" min={1} max={2000} className="input" defaultValue={values.maxProposalsPerRun} />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-semibold">{t("hr.rot.cfg.categories")}</legend>
            <Checks name="categories" selected={values.categories} options={CATEGORIES.map((c) => ({ value: c, label: t(`hr.rot.category.${c}` as MessageKey) }))} />
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-sm font-semibold">{t("hr.rot.cfg.excluded")}</legend>
            <Checks name="excludedPositionIds" selected={values.excludedPositionIds} options={positions} />
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-sm font-semibold">{t("hr.rot.cfg.validators")}</legend>
            <Checks name="validatorRoleCodes" selected={values.validatorRoleCodes} options={validators} />
          </fieldset>
          <Field label={t("hr.rot.cfg.pilot")} htmlFor="r-pilot" hint={t("hr.rot.cfg.pilotHint")}>
            <select id="r-pilot" name="pilotStationIds" multiple size={6} className="input" defaultValue={values.pilotStationIds}>
              {stations.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="sameProvinceOnly" defaultChecked={values.sameProvinceOnly} /> {t("hr.rot.cfg.sameProvince")}
          </label>
          <p className="text-xs text-slate">{t("hr.rot.cfg.rules")}</p>
          <SubmitButton size="sm" pendingText={t("hr.saving")}>
            {t("hr.rot.cfg.save")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function RunRotationForm() {
  const t = useT();
  return (
    <ActionForm action={runRotationAction}>
      {() => (
        <SubmitButton size="sm" variant="secondary" pendingText={t("hr.rot.running")}>
          {t("hr.rot.runNow")}
        </SubmitButton>
      )}
    </ActionForm>
  );
}

export function ExceptionForm({ officerId }: { officerId: string }) {
  const t = useT();
  return (
    <ActionForm action={createExceptionAction}>
      {(s) => (
        <>
          <input type="hidden" name="officerId" value={officerId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("hr.rot.exc.reason")} htmlFor="x-reason" required error={s.fieldErrors?.reason} className="sm:col-span-2">
              <input id="x-reason" name="reason" className="input" required minLength={5} maxLength={500} />
            </Field>
            <Field label={t("hr.rot.exc.until")} htmlFor="x-end" error={s.fieldErrors?.endsAt}>
              <input id="x-end" name="endsAt" type="date" className="input" />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("hr.saving")}>
            {t("hr.rot.exc.add")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function EndExceptionForm({ id }: { id: string }) {
  const t = useT();
  return (
    <ActionForm action={endExceptionAction} className="inline">
      {() => (
        <>
          <input type="hidden" name="id" value={id} />
          <SubmitButton size="xs" variant="secondary" pendingText={t("hr.saving")}>
            {t("hr.rot.exc.end")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { PAY_CALCULATION, PAY_KIND, optionsOf } from "@/lib/labels";
import { decideElementAction, decideScaleAction, endElementAction, generateRunAction, requestElementAction, requestScaleAction, saveComponentAction, validateRunAction } from "@/server/hr/pay-actions";

type Opt = { value: string; label: string };

export function GenerateRunForm({ defaultPeriod }: { defaultPeriod: string }) {
  const t = useT();
  return (
    <ActionForm action={generateRunAction} className="flex flex-wrap items-end gap-2">
      {(s) => (
        <>
          <Field label={t("hr.pay.period")} htmlFor="g-period" error={s.fieldErrors?.period}>
            <input id="g-period" name="period" className="input w-32" defaultValue={defaultPeriod} pattern="\d{4}-\d{2}" placeholder="AAAA-MM" required />
          </Field>
          <SubmitButton size="sm" pendingText={t("hr.pay.generating")}>
            {t("hr.pay.generate")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ValidateRunForm({ id }: { id: string }) {
  const t = useT();
  return (
    <ActionForm action={validateRunAction} className="inline">
      {() => (
        <>
          <input type="hidden" name="id" value={id} />
          <SubmitButton size="sm" variant="success" pendingText="…">
            {t("hr.pay.validateRun")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ScaleRequestForm({ ranks }: { ranks: Opt[] }) {
  const t = useT();
  return (
    <ActionForm action={requestScaleAction}>
      {(s) => (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label={t("hr.col.rank")} htmlFor="s-rank" required error={s.fieldErrors?.rankId}>
              <Select id="s-rank" name="rankId" placeholder={t("hr.career.choose")} options={ranks} />
            </Field>
            <Field label={t("hr.pay.monthlyBase")} htmlFor="s-amount" required error={s.fieldErrors?.amount}>
              <input id="s-amount" name="amount" type="number" min={1} className="input" required />
            </Field>
            <Field label={t("hr.pay.effectiveFrom")} htmlFor="s-from" required error={s.fieldErrors?.effectiveFrom}>
              <input id="s-from" name="effectiveFrom" type="date" className="input" required />
            </Field>
            <Field label={t("hr.dossier.notes")} htmlFor="s-note">
              <input id="s-note" name="note" className="input" maxLength={300} />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("hr.saving")}>
            {t("hr.pay.requestChange")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function DecideForm({ id, kind }: { id: string; kind: "scale" | "element" }) {
  const t = useT();
  return (
    <ActionForm action={kind === "scale" ? decideScaleAction : decideElementAction} className="flex flex-wrap items-start gap-2">
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

export function ComponentForm({ component }: { component?: { id: string; code: string; name: string; kind: string; calculation: string; defaultValue: number; description: string | null; isActive: boolean } }) {
  const t = useT();
  const locale = useLocale();
  const p = component ? `c-${component.id}-` : "c-new-";
  return (
    <ActionForm action={saveComponentAction}>
      {(s) => (
        <>
          {component ? <input type="hidden" name="id" value={component.id} /> : null}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Field label={t("org.code")} htmlFor={`${p}code`} required error={s.fieldErrors?.code}>
              <input id={`${p}code`} name="code" className="input font-mono uppercase" defaultValue={component?.code ?? ""} readOnly={!!component} required maxLength={24} />
            </Field>
            <Field label={t("org.name")} htmlFor={`${p}name`} required error={s.fieldErrors?.name} className="lg:col-span-2">
              <input id={`${p}name`} name="name" className="input" defaultValue={component?.name ?? ""} required maxLength={100} />
            </Field>
            <Field label={t("hr.leave.type")} htmlFor={`${p}kind`}>
              <Select id={`${p}kind`} name="kind" defaultValue={component?.kind ?? "BONUS"} options={optionsOf(PAY_KIND, locale)} />
            </Field>
            <Field label={t("hr.pay.calculation")} htmlFor={`${p}calc`}>
              <Select id={`${p}calc`} name="calculation" defaultValue={component?.calculation ?? "FIXED"} options={optionsOf(PAY_CALCULATION, locale)} />
            </Field>
            <Field label={t("hr.pay.defaultValue")} htmlFor={`${p}val`} error={s.fieldErrors?.defaultValue}>
              <input id={`${p}val`} name="defaultValue" type="number" min={0} className="input" defaultValue={component?.defaultValue ?? 0} />
            </Field>
          </div>
          {component ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={component.isActive} /> {t("org.isActive")}
            </label>
          ) : null}
          <SubmitButton size="sm" pendingText={t("hr.saving")}>
            {component ? t("hr.save") : t("hr.pay.addComponent")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ElementRequestForm({ officerId, components }: { officerId: string; components: (Opt & { calc: string; def: number })[] }) {
  const t = useT();
  return (
    <ActionForm action={requestElementAction}>
      {(s) => (
        <>
          <input type="hidden" name="officerId" value={officerId} />
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label={t("hr.pay.element")} htmlFor="e-comp" required error={s.fieldErrors?.componentId}>
              <Select id="e-comp" name="componentId" placeholder={t("hr.career.choose")} options={components.map((c) => ({ value: c.value, label: c.label }))} />
            </Field>
            <Field label={t("hr.pay.overrideValue")} htmlFor="e-val" hint={t("hr.pay.overrideHint")} error={s.fieldErrors?.value}>
              <input id="e-val" name="value" type="number" min={0} className="input" />
            </Field>
            <Field label={t("hr.pay.effectiveFrom")} htmlFor="e-from" required error={s.fieldErrors?.startDate}>
              <input id="e-from" name="startDate" type="date" className="input" required />
            </Field>
            <Field label={t("hr.pay.until")} htmlFor="e-to" error={s.fieldErrors?.endDate}>
              <input id="e-to" name="endDate" type="date" className="input" />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("hr.leave.reason")} htmlFor="e-reason" required error={s.fieldErrors?.reason}>
              <input id="e-reason" name="reason" className="input" required minLength={5} maxLength={500} />
            </Field>
            <Field label={t("hr.career.reference")} htmlFor="e-ref">
              <input id="e-ref" name="decisionRef" className="input" maxLength={60} />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("hr.saving")}>
            {t("hr.pay.requestElement")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function EndElementForm({ id }: { id: string }) {
  const t = useT();
  return (
    <ActionForm action={endElementAction} className="flex flex-wrap items-center gap-2">
      {() => (
        <>
          <input type="hidden" name="id" value={id} />
          <input name="reason" className="input min-w-[140px] flex-1" placeholder={t("hr.pay.endReason")} required minLength={5} maxLength={500} aria-label={t("hr.pay.endReason")} />
          <SubmitButton size="xs" variant="secondary" pendingText="…">
            {t("hr.pay.end")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

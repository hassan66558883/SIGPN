"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { DETENTION_END_REASON, DETENTION_LOG_TYPE, optionsOf } from "@/lib/labels";
import { addLogAction, endAction, extendAction, startDetentionAction } from "@/server/detention/actions";

export function StartDetentionForm({ arrests, defaultArrestId }: { arrests: { id: string; label: string }[]; defaultArrestId?: string }) {
  const t = useT();
  return (
    <ActionForm action={startDetentionAction} className="space-y-4">
      {(s) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("detention.arrest")} htmlFor="d-arrest" required error={s.fieldErrors?.arrestId} className="sm:col-span-2">
              <Select id="d-arrest" name="arrestId" required defaultValue={defaultArrestId ?? ""} placeholder={arrests.length ? "—" : t("detention.noArrest")} options={arrests.map((a) => ({ value: a.id, label: a.label }))} />
            </Field>
            <Field label={t("detention.cell")} htmlFor="d-cell">
              <input id="d-cell" name="cellNumber" className="input" maxLength={20} />
            </Field>
            <Field label={t("detention.startedAt")} htmlFor="d-start" required error={s.fieldErrors?.startedAt}>
              <input id="d-start" name="startedAt" type="datetime-local" className="input" required />
            </Field>
            <Field label={t("detention.medical")} htmlFor="d-med" className="sm:col-span-2">
              <textarea id="d-med" name="medicalNotes" className="input" rows={3} maxLength={1000} />
            </Field>
          </div>
          <SubmitButton pendingText={t("common.saving")}>{t("detention.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function LogForm({ detentionId }: { detentionId: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={addLogAction} className="space-y-3">
      {() => (
        <>
          <input type="hidden" name="detentionId" value={detentionId} />
          <Field label={t("detention.logType")} htmlFor="l-type" required>
            <Select id="l-type" name="type" defaultValue="WELFARE_CHECK" options={optionsOf(DETENTION_LOG_TYPE, locale)} />
          </Field>
          <Field label={t("detention.logNotes")} htmlFor="l-notes" required>
            <textarea id="l-notes" name="notes" className="input" rows={3} required minLength={3} maxLength={2000} />
          </Field>
          <SubmitButton pendingText={t("common.saving")}>{t("detention.logAdd")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ExtendForm({ detentionId }: { detentionId: string }) {
  const t = useT();
  return (
    <ActionForm action={extendAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="detentionId" value={detentionId} />
          <Field label={t("detention.extendUntil")} htmlFor="x-until" required error={s.fieldErrors?.extendedUntil} hint={t("detention.extendNote", { h: 48 })}>
            <input id="x-until" name="extendedUntil" type="datetime-local" className="input" required />
          </Field>
          <Field label={t("detention.extendAuth")} htmlFor="x-auth" required error={s.fieldErrors?.extensionAuthority}>
            <input id="x-auth" name="extensionAuthority" className="input" required minLength={3} maxLength={200} />
          </Field>
          <Field label={t("detention.extendReason")} htmlFor="x-reason" required error={s.fieldErrors?.extensionReason}>
            <textarea id="x-reason" name="extensionReason" className="input" rows={3} required minLength={10} maxLength={2000} />
          </Field>
          <SubmitButton pendingText={t("common.saving")}>{t("detention.extend")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function EndForm({ detentionId }: { detentionId: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={endAction} className="space-y-3">
      {() => (
        <>
          <input type="hidden" name="detentionId" value={detentionId} />
          <Field label={t("detention.endReason")} htmlFor="e-reason" required>
            <Select id="e-reason" name="endReason" required placeholder="—" options={optionsOf(DETENTION_END_REASON, locale)} />
          </Field>
          <Field label={t("detention.endNotes")} htmlFor="e-notes" required>
            <textarea id="e-notes" name="endNotes" className="input" rows={3} required minLength={3} maxLength={2000} />
          </Field>
          <SubmitButton pendingText={t("common.saving")}>{t("detention.end")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { WARRANT_TYPE, optionsOf } from "@/lib/labels";
import { PersonPicker } from "@/components/person-picker";
import { createWarrantAction, decideWarrantAction } from "@/server/warrants/actions";

export function NewWarrantForm({ cases }: { cases: { id: string; label: string }[] }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={createWarrantAction} className="space-y-4">
      {(s) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("warrants.type")} htmlFor="w-type" required>
              <Select id="w-type" name="type" defaultValue="ARREST" options={optionsOf(WARRANT_TYPE, locale)} />
            </Field>
            <PersonPicker name="personId" label={t("warrants.person")} id="w-person" required error={s.fieldErrors?.personId} />
            <Field label={t("warrants.case")} htmlFor="w-case">
              <Select id="w-case" name="caseId" placeholder={t("warrants.noCase")} options={cases.map((c) => ({ value: c.id, label: c.label }))} />
            </Field>
            <Field label={t("warrants.expiresAt")} htmlFor="w-exp" error={s.fieldErrors?.expiresAt}>
              <input id="w-exp" name="expiresAt" type="datetime-local" className="input" />
            </Field>
            <Field label={t("warrants.authority")} htmlFor="w-auth" required error={s.fieldErrors?.issuingAuthority}>
              <input id="w-auth" name="issuingAuthority" className="input" required minLength={3} maxLength={200} />
            </Field>
            <Field label={t("warrants.authorityRef")} htmlFor="w-ref">
              <input id="w-ref" name="issuingAuthorityRef" className="input" maxLength={120} />
            </Field>
            <Field label={t("warrants.grounds")} htmlFor="w-grounds" required error={s.fieldErrors?.grounds} className="sm:col-span-2">
              <textarea id="w-grounds" name="grounds" className="input" rows={5} required minLength={10} maxLength={3000} />
            </Field>
            <Field label={t("warrants.address")} htmlFor="w-addr" className="sm:col-span-2">
              <input id="w-addr" name="targetAddress" className="input" maxLength={300} />
            </Field>
          </div>
          <SubmitButton pendingText={t("common.saving")}>{t("warrants.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function DecisionForm({ warrantId, allowed }: { warrantId: string; allowed: ("ACTIVE" | "REJECTED" | "EXECUTED" | "CANCELLED")[] }) {
  const t = useT();
  const label = { ACTIVE: t("warrants.approve"), REJECTED: t("warrants.reject"), EXECUTED: t("warrants.execute"), CANCELLED: t("warrants.cancel") } as const;
  return (
    <ActionForm action={decideWarrantAction} className="space-y-3">
      {() => (
        <>
          <input type="hidden" name="warrantId" value={warrantId} />
          <Field label={t("warrants.notes")} htmlFor="w-notes">
            <textarea id="w-notes" name="notes" className="input" rows={3} maxLength={2000} />
          </Field>
          <Field label={t("warrants.decision")} htmlFor="w-status" required>
            <Select id="w-status" name="status" required placeholder="—" options={allowed.map((a) => ({ value: a, label: label[a] }))} />
          </Field>
          <SubmitButton pendingText={t("common.saving")}>{t("common.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

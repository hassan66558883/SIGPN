"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { ARREST_AUTHORITY, optionsOf } from "@/lib/labels";
import { PersonPicker } from "@/components/person-picker";
import { changeArrestStatusAction, createArrestAction } from "@/server/arrests/actions";

type Opt = { id: string; label: string };

export function NewArrestForm({ cases, warrants, officers, hasOwnOfficer }: { cases: Opt[]; warrants: Opt[]; officers: Opt[]; hasOwnOfficer: boolean }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={createArrestAction} className="space-y-4">
      {(s) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <PersonPicker name="personId" label={t("arrests.person")} id="a-person" required error={s.fieldErrors?.personId} />
            <Field label={t("arrests.arrestedAt")} htmlFor="a-at" required error={s.fieldErrors?.arrestedAt}>
              <input id="a-at" name="arrestedAt" type="datetime-local" className="input" required />
            </Field>
            <Field label={t("arrests.authority")} htmlFor="a-auth" required>
              <Select id="a-auth" name="authority" defaultValue="FLAGRANTE_DELICTO" options={optionsOf(ARREST_AUTHORITY, locale)} />
            </Field>
            <Field label={t("arrests.warrant")} htmlFor="a-warrant" error={s.fieldErrors?.warrantId}>
              <Select id="a-warrant" name="warrantId" placeholder={t("arrests.noWarrant")} options={warrants.map((w) => ({ value: w.id, label: w.label }))} />
            </Field>
            <Field label={t("arrests.location")} htmlFor="a-loc" required error={s.fieldErrors?.locationText} className="sm:col-span-2">
              <input id="a-loc" name="locationText" className="input" required minLength={3} maxLength={300} />
            </Field>
            <Field label={t("arrests.charges")} htmlFor="a-charges" required error={s.fieldErrors?.charges} className="sm:col-span-2">
              <textarea id="a-charges" name="charges" className="input" rows={3} required minLength={3} maxLength={2000} />
            </Field>
            <Field label={t("arrests.circumstances")} htmlFor="a-circ" className="sm:col-span-2">
              <textarea id="a-circ" name="circumstances" className="input" rows={4} maxLength={3000} />
            </Field>
            <Field label={t("arrests.officer")} htmlFor="a-officer" required={!hasOwnOfficer} error={s.fieldErrors?.arrestingOfficerId}>
              <Select id="a-officer" name="arrestingOfficerId" required={!hasOwnOfficer} placeholder={hasOwnOfficer ? t("arrests.officerSelf") : "—"} options={officers.map((o) => ({ value: o.id, label: o.label }))} />
            </Field>
            <Field label={t("arrests.case")} htmlFor="a-case">
              <Select id="a-case" name="caseId" placeholder={t("arrests.noCase")} options={cases.map((c) => ({ value: c.id, label: c.label }))} />
            </Field>
            <Field label={t("arrests.rightsReadAt")} htmlFor="a-rights">
              <input id="a-rights" name="rightsReadAt" type="datetime-local" className="input" />
            </Field>
            <Field label={t("arrests.notes")} htmlFor="a-notes" className="sm:col-span-2">
              <textarea id="a-notes" name="notes" className="input" rows={2} maxLength={2000} />
            </Field>
          </div>
          <SubmitButton pendingText={t("common.saving")}>{t("arrests.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ArrestStatusForm({ arrestId, allowed }: { arrestId: string; allowed: ("IN_CUSTODY" | "RELEASED" | "TRANSFERRED" | "CHARGED")[] }) {
  const t = useT();
  const label = { IN_CUSTODY: t("arrests.toCustody"), RELEASED: t("arrests.toReleased"), TRANSFERRED: t("arrests.toTransferred"), CHARGED: t("arrests.toCharged") } as const;
  return (
    <ActionForm action={changeArrestStatusAction} className="space-y-3">
      {() => (
        <>
          <input type="hidden" name="arrestId" value={arrestId} />
          <Field label={t("arrests.next")} htmlFor="a-next" required>
            <Select id="a-next" name="status" required placeholder="—" options={allowed.map((a) => ({ value: a, label: label[a] }))} />
          </Field>
          <Field label={t("arrests.reason")} htmlFor="a-reason">
            <textarea id="a-reason" name="notes" className="input" rows={3} maxLength={2000} />
          </Field>
          <SubmitButton pendingText={t("common.saving")}>{t("arrests.update")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

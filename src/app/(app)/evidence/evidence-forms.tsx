"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { CUSTODY_ACTION, EVIDENCE_CATEGORY, optionsOf } from "@/lib/labels";
import { PersonPicker } from "@/components/person-picker";
import { attachEvidenceFileAction, createEvidenceAction, transferCustodyAction } from "@/server/evidence/actions";

export type Opt = { id: string; label: string };

export function NewEvidenceForm({ caseId, cases, locations }: { caseId?: string; cases: Opt[]; locations: Opt[] }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={createEvidenceAction} className="space-y-4">
      {(s) => (
        <>
          {caseId ? (
            <input type="hidden" name="caseId" value={caseId} />
          ) : (
            <Field label={t("evidence.case")} htmlFor="ev-case" required error={s.fieldErrors?.caseId}>
              <Select id="ev-case" name="caseId" required placeholder="—" options={cases.map((c) => ({ value: c.id, label: c.label }))} />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("evidence.category")} htmlFor="ev-cat" required>
              <Select id="ev-cat" name="category" defaultValue="PHYSICAL" options={optionsOf(EVIDENCE_CATEGORY, locale)} />
            </Field>
            <Field label={t("evidence.sealNumber")} htmlFor="ev-seal">
              <input id="ev-seal" name="sealNumber" className="input" maxLength={60} />
            </Field>
            <Field label={t("evidence.description")} htmlFor="ev-desc" required error={s.fieldErrors?.description} className="sm:col-span-2">
              <textarea id="ev-desc" name="description" className="input" rows={4} required minLength={5} maxLength={2000} />
            </Field>
            <Field label={t("evidence.collectedAt")} htmlFor="ev-collected" required error={s.fieldErrors?.collectedAt}>
              <input id="ev-collected" name="collectedAt" type="datetime-local" className="input" required />
            </Field>
            <Field label={t("evidence.collectedFrom")} htmlFor="ev-from">
              <input id="ev-from" name="collectedFrom" className="input" maxLength={200} placeholder={t("evidence.collectedFromHint")} />
            </Field>
            <PersonPicker name="collectedFromPersonId" label={t("evidence.collectedFromPerson")} id="ev-from-person" />
            <Field label={t("evidence.condition")} htmlFor="ev-condition">
              <input id="ev-condition" name="condition" className="input" maxLength={300} />
            </Field>
            <Field label={t("evidence.quantity")} htmlFor="ev-qty">
              <input id="ev-qty" name="quantity" type="number" step="any" min={0} className="input" />
            </Field>
            <Field label={t("evidence.unit")} htmlFor="ev-unit">
              <input id="ev-unit" name="unit" className="input" maxLength={20} />
            </Field>
            {locations.length ? (
              <Field label={t("evidence.location")} htmlFor="ev-loc">
                <Select id="ev-loc" name="currentLocationId" placeholder="—" options={locations.map((l) => ({ value: l.id, label: l.label }))} />
              </Field>
            ) : null}
            <Field label={t("evidence.file")} htmlFor="ev-file" hint={t("evidence.fileHint")} className="sm:col-span-2">
              <input id="ev-file" name="file" type="file" className="input" accept="image/*,audio/*,video/*,application/pdf" />
            </Field>
            <Field label={t("evidence.notes")} htmlFor="ev-notes" className="sm:col-span-2">
              <textarea id="ev-notes" name="notes" className="input" rows={3} maxLength={2000} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isSensitive" /> {t("case.sensitive")}
          </label>
          <SubmitButton pendingText={t("common.saving")}>{t("evidence.register")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function AttachFileForm({ evidenceId }: { evidenceId: string }) {
  const t = useT();
  return (
    <ActionForm action={attachEvidenceFileAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="evidenceId" value={evidenceId} />
          <Field label={t("evidence.file")} htmlFor="ev-attach-file" required error={s.fieldErrors?.file}>
            <input id="ev-attach-file" name="file" type="file" className="input" required accept="image/*,audio/*,video/*,application/pdf" />
          </Field>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("evidence.attachFile")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function CustodyTransferForm({ evidenceId, locations }: { evidenceId: string; locations: Opt[] }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={transferCustodyAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="evidenceId" value={evidenceId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("evidence.custodyAction")} htmlFor="ev-cust-action" required>
              <Select id="ev-cust-action" name="action" options={optionsOf(CUSTODY_ACTION, locale).filter((o) => o.value !== "COLLECTED" && o.value !== "REGISTERED")} />
            </Field>
            {locations.length ? (
              <Field label={t("evidence.toLocation")} htmlFor="ev-cust-loc">
                <Select id="ev-cust-loc" name="toLocationId" placeholder="—" options={locations.map((l) => ({ value: l.id, label: l.label }))} />
              </Field>
            ) : null}
            <Field label={t("evidence.custodyReason")} htmlFor="ev-cust-reason" required error={s.fieldErrors?.reason} className="sm:col-span-2">
              <input id="ev-cust-reason" name="reason" className="input" required minLength={3} maxLength={500} />
            </Field>
            <Field label={t("evidence.condition")} htmlFor="ev-cust-condition">
              <input id="ev-cust-condition" name="condition" className="input" maxLength={300} />
            </Field>
            <Field label={t("evidence.notes")} htmlFor="ev-cust-notes">
              <input id="ev-cust-notes" name="notes" className="input" maxLength={1000} />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("evidence.recordTransfer")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

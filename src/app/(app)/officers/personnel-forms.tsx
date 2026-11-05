"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { TRAINING_KIND, TRAINING_STATUS, optionsOf } from "@/lib/labels";
import { createPositionAction, createTrainingAction, setOfficerPositionAction, updatePositionAction, updateTrainingStatusAction } from "@/server/org/actions";

type Opt = { id: string; label: string };

export function PositionForm({ position }: { position?: { id: string; code: string; name: string; description: string | null; isActive: boolean } }) {
  const t = useT();
  const p = position ? `pos-${position.id}-` : "pos-new-";
  return (
    <ActionForm action={position ? updatePositionAction : createPositionAction} className="space-y-3">
      {(s) => (
        <>
          {position ? <input type="hidden" name="id" value={position.id} /> : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("org.code")} htmlFor={`${p}code`} required error={s.fieldErrors?.code}>
              <input id={`${p}code`} name="code" className="input font-mono uppercase" required maxLength={16} defaultValue={position?.code ?? ""} />
            </Field>
            <Field label={t("org.name")} htmlFor={`${p}name`} required error={s.fieldErrors?.name}>
              <input id={`${p}name`} name="name" className="input" required maxLength={100} defaultValue={position?.name ?? ""} />
            </Field>
            <Field label={t("pos.description")} htmlFor={`${p}desc`}>
              <input id={`${p}desc`} name="description" className="input" maxLength={300} defaultValue={position?.description ?? ""} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={position?.isActive ?? true} /> {t("org.isActive")}
          </label>
          <SubmitButton size="sm" pendingText={position ? t("common.saving") : t("common.creating")}>
            {position ? t("common.save") : t("common.create")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function OfficerPositionForm({ officerId, positions, current }: { officerId: string; positions: Opt[]; current: string | null }) {
  const t = useT();
  return (
    <ActionForm action={setOfficerPositionAction} className="flex flex-wrap items-end gap-2">
      {() => (
        <>
          <input type="hidden" name="officerId" value={officerId} />
          <Field label={t("officer.position")} htmlFor="of-pos" className="min-w-[220px] flex-1">
            <Select id="of-pos" name="positionId" defaultValue={current ?? ""} placeholder={t("officer.noPosition")} options={positions.map((x) => ({ value: x.id, label: x.label }))} />
          </Field>
          <SubmitButton size="sm" variant="secondary" pendingText={t("common.saving")}>
            {t("officer.setPosition")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function TrainingForm({ officerId }: { officerId: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={createTrainingAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="officerId" value={officerId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("training.name")} htmlFor="tr-title" required error={s.fieldErrors?.title} className="sm:col-span-2">
              <input id="tr-title" name="title" className="input" required minLength={2} maxLength={200} />
            </Field>
            <Field label={t("hr.tr.kind")} htmlFor="tr-kind">
              <Select id="tr-kind" name="kind" defaultValue="CONTINUING" options={optionsOf(TRAINING_KIND, locale)} />
            </Field>
            <Field label={t("training.provider")} htmlFor="tr-prov">
              <input id="tr-prov" name="provider" className="input" maxLength={120} />
            </Field>
            <Field label={t("training.category")} htmlFor="tr-cat">
              <input id="tr-cat" name="category" className="input" maxLength={60} />
            </Field>
            <Field label={t("training.start")} htmlFor="tr-start" required error={s.fieldErrors?.startDate}>
              <input id="tr-start" name="startDate" type="date" className="input" required />
            </Field>
            <Field label={t("training.end")} htmlFor="tr-end">
              <input id="tr-end" name="endDate" type="date" className="input" />
            </Field>
            <Field label={t("training.status")} htmlFor="tr-status">
              <Select id="tr-status" name="status" defaultValue="PLANNED" options={optionsOf(TRAINING_STATUS, locale)} />
            </Field>
            <Field label={t("training.certificate")} htmlFor="tr-cert">
              <input id="tr-cert" name="certificateNo" className="input font-mono" maxLength={60} />
            </Field>
            <Field label={t("training.expires")} htmlFor="tr-exp">
              <input id="tr-exp" name="expiresAt" type="date" className="input" />
            </Field>
            <Field label={t("training.result")} htmlFor="tr-res">
              <input id="tr-res" name="result" className="input" maxLength={200} />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("common.saving")}>
            {t("training.record")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function TrainingStatusForm({ trainingId, current }: { trainingId: string; current: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={updateTrainingStatusAction} className="flex flex-wrap items-end gap-2">
      {() => (
        <>
          <input type="hidden" name="id" value={trainingId} />
          <Select name="status" defaultValue={current} options={optionsOf(TRAINING_STATUS, locale)} aria-label={t("training.status")} className="w-auto" />
          <input name="result" className="input w-auto" maxLength={200} placeholder={t("training.result")} />
          <SubmitButton size="xs" variant="secondary" pendingText={t("common.working")}>
            {t("training.setStatus")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

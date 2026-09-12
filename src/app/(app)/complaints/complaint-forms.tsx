"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { OFFENSE_CATEGORY, PRIORITY, optionsOf } from "@/lib/labels";
import { PersonPicker, type PersonOption } from "@/components/person-picker";
import { assignComplaintAction, closeComplaintAction, convertComplaintAction, createComplaintAction, reviewComplaintAction, updateComplaintAction } from "@/server/complaints/actions";

type Station = { id: string; code: string; name: string };
type UserOpt = { id: string; label: string };

export type ComplaintValues = { id?: string; title?: string; description?: string; category?: string; priority?: string; incidentAt?: string; locationText?: string | null; isAnonymous?: boolean; complainant?: PersonOption | null };

export function ComplaintForm({ mode, values = {}, stations }: { mode: "create" | "edit"; values?: ComplaintValues; stations: Station[] }) {
  const t = useT();
  const locale = useLocale();
  const [anonymous, setAnonymous] = useState(values.isAnonymous ?? false);
  return (
    <ActionForm action={mode === "create" ? createComplaintAction : updateComplaintAction}>
      {(s) => (
        <>
          {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isAnonymous" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> {t("complaint.anonymous")}
              </label>
            </div>
            {!anonymous ? (
              <div className="sm:col-span-2">
                <PersonPicker name="complainantId" label={t("complaint.complainant")} required defaultValue={values.complainant ?? null} error={s.fieldErrors?.complainantId} id="cmp-complainant" />
              </div>
            ) : null}
            <Field label={t("complaint.category")} htmlFor="cmp-cat" required>
              <Select id="cmp-cat" name="category" defaultValue={values.category ?? "OTHER"} options={optionsOf(OFFENSE_CATEGORY, locale)} />
            </Field>
            <Field label={t("complaint.priority")} htmlFor="cmp-prio" required>
              <Select id="cmp-prio" name="priority" defaultValue={values.priority ?? "NORMAL"} options={optionsOf(PRIORITY, locale)} />
            </Field>
            <Field label={t("complaint.title")} htmlFor="cmp-title" required error={s.fieldErrors?.title} className="sm:col-span-2">
              <input id="cmp-title" name="title" className="input" required minLength={5} maxLength={200} defaultValue={values.title ?? ""} />
            </Field>
            <Field label={t("complaint.description")} htmlFor="cmp-desc" required error={s.fieldErrors?.description} className="sm:col-span-2">
              <textarea id="cmp-desc" name="description" className="input" rows={6} required minLength={20} maxLength={5000} defaultValue={values.description ?? ""} />
            </Field>
            <Field label={t("complaint.incidentAt")} htmlFor="cmp-when" error={s.fieldErrors?.incidentAt}>
              <input id="cmp-when" name="incidentAt" type="datetime-local" className="input" defaultValue={values.incidentAt ?? ""} />
            </Field>
            <Field label={t("complaint.location")} htmlFor="cmp-where">
              <input id="cmp-where" name="locationText" className="input" maxLength={300} defaultValue={values.locationText ?? ""} />
            </Field>
            {mode === "create" && stations.length > 1 ? (
              <Field label={t("complaint.station")} htmlFor="cmp-station" required error={s.fieldErrors?.stationId}>
                <Select id="cmp-station" name="stationId" required placeholder="—" options={stations.map((x) => ({ value: x.id, label: `${x.code} · ${x.name}` }))} />
              </Field>
            ) : mode === "create" && stations.length === 1 ? (
              <input type="hidden" name="stationId" value={stations[0].id} />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {mode === "create" ? (
              <>
                <SubmitButton name="submit" value="register" pendingText={t("common.saving")}>
                  {t("complaint.register")}
                </SubmitButton>
                <SubmitButton name="submit" value="draft" variant="secondary" pendingText={t("common.saving")}>
                  {t("complaint.saveDraft")}
                </SubmitButton>
              </>
            ) : (
              <SubmitButton pendingText={t("common.saving")}>{t("common.save")}</SubmitButton>
            )}
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function ReviewForm({ id, priority }: { id: string; priority: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={reviewComplaintAction} className="space-y-3">
      {() => (
        <>
          <input type="hidden" name="id" value={id} />
          <Field label={t("complaint.priority")} htmlFor="rv-prio">
            <Select id="rv-prio" name="priority" defaultValue={priority} options={optionsOf(PRIORITY, locale)} />
          </Field>
          <Field label={t("complaint.reviewNotes")} htmlFor="rv-notes">
            <textarea id="rv-notes" name="reviewNotes" className="input" rows={2} maxLength={2000} />
          </Field>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("complaint.review")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function AssignForm({ id, users }: { id: string; users: UserOpt[] }) {
  const t = useT();
  return (
    <ActionForm action={assignComplaintAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <Field label={t("complaint.investigator")} htmlFor="as-user" required error={s.fieldErrors?.assignedToId}>
            <Select id="as-user" name="assignedToId" required placeholder="—" options={users.map((u) => ({ value: u.id, label: u.label }))} />
          </Field>
          <Field label={t("complaint.reviewNotes")} htmlFor="as-notes">
            <input id="as-notes" name="reviewNotes" className="input" maxLength={2000} />
          </Field>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("complaint.assign")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function CloseForm({ id }: { id: string }) {
  const t = useT();
  return (
    <ActionForm action={closeComplaintAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <Field label={t("complaint.closeReason")} htmlFor="cl-reason" required error={s.fieldErrors?.closureReason}>
            <textarea id="cl-reason" name="closureReason" className="input" rows={2} required minLength={5} maxLength={1000} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <SubmitButton size="sm" variant="secondary" name="outcome" value="CLOSED" pendingText={t("common.working")}>
              {t("complaint.close")}
            </SubmitButton>
            <SubmitButton size="sm" variant="danger" name="outcome" value="REJECTED" pendingText={t("common.working")}>
              {t("complaint.reject")}
            </SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function ConvertForm({ id, users, defaultLeadId, canSensitive }: { id: string; users: UserOpt[]; defaultLeadId?: string | null; canSensitive: boolean }) {
  const t = useT();
  return (
    <ActionForm action={convertComplaintAction} className="space-y-3">
      {() => (
        <>
          <input type="hidden" name="id" value={id} />
          <Field label={t("complaint.convertTitle")} htmlFor="cv-title">
            <input id="cv-title" name="title" className="input" maxLength={200} />
          </Field>
          <Field label={t("complaint.convertLead")} htmlFor="cv-lead">
            <Select id="cv-lead" name="leadId" placeholder="—" defaultValue={defaultLeadId ?? ""} options={users.map((u) => ({ value: u.id, label: u.label }))} />
          </Field>
          {canSensitive ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isSensitive" /> {t("complaint.sensitive")}
            </label>
          ) : null}
          <SubmitButton size="sm" variant="success" pendingText={t("common.working")}>
            {t("complaint.convert")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

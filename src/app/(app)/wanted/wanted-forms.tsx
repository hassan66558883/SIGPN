"use client";

import { useState, type ReactNode } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { DANGER_LEVEL, WANTED_KIND, WANTED_STATUS, optionsOf } from "@/lib/labels";
import { PersonPicker } from "@/components/person-picker";
import { addSightingAction, addVehicleAction, attachPhotoAction, createWantedPersonAction, createWarrantAction, setWantedStatusAction, setWarrantStatusAction, updateWantedPersonAction, verifyWantedAction } from "@/server/wanted/actions";

export type Opt = { id: string; label: string };
export type WantedValues = { id?: string; kind?: string; legalBasis?: string; issuingAuthority?: string; offense?: string; reason?: string; dangerLevel?: string; lastSeenLocation?: string; expiresAt?: string };

export function WantedPersonForm({ mode, values = {}, cases, stations }: { mode: "create" | "edit"; values?: WantedValues; cases: Opt[]; stations: Opt[] }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={mode === "create" ? createWantedPersonAction : updateWantedPersonAction} className="space-y-4">
      {(s) => (
        <>
          {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {mode === "create" ? <PersonPicker name="personId" label={t("wanted.person")} required id="wt-person" error={s.fieldErrors?.personId} /> : null}
            {mode === "create" && cases.length ? (
              <Field label={t("wanted.case")} htmlFor="wt-case">
                <Select id="wt-case" name="caseId" placeholder="—" options={cases.map((c) => ({ value: c.id, label: c.label }))} />
              </Field>
            ) : null}
            {mode === "create" && stations.length > 1 ? (
              <Field label={t("wanted.station")} htmlFor="wt-station" required>
                <Select id="wt-station" name="stationId" required placeholder="—" options={stations.map((c) => ({ value: c.id, label: c.label }))} />
              </Field>
            ) : mode === "create" && stations.length === 1 ? (
              <input type="hidden" name="stationId" value={stations[0].id} />
            ) : null}
            <Field label={t("wanted.offense")} htmlFor="wt-offense" required error={s.fieldErrors?.offense}>
              <input id="wt-offense" name="offense" className="input" required minLength={3} maxLength={300} defaultValue={values.offense ?? ""} />
            </Field>
            <Field label={t("wanted.kind")} htmlFor="wt-kind" required>
              <Select id="wt-kind" name="kind" defaultValue={values.kind ?? "SEARCH_WARRANT"} options={optionsOf(WANTED_KIND, locale)} />
            </Field>
            <Field label={t("wanted.issuingAuthority")} htmlFor="wt-authority" hint={t("wanted.issuingAuthorityHint")}>
              <input id="wt-authority" name="issuingAuthority" className="input" maxLength={200} defaultValue={values.issuingAuthority ?? ""} />
            </Field>
            <Field label={t("wanted.legalBasis")} htmlFor="wt-legal" hint={t("wanted.legalBasisHint")} className="sm:col-span-2">
              <textarea id="wt-legal" name="legalBasis" className="input" rows={2} maxLength={2000} defaultValue={values.legalBasis ?? ""} />
            </Field>
            <Field label={t("wanted.dangerLevel")} htmlFor="wt-danger" required>
              <Select id="wt-danger" name="dangerLevel" defaultValue={values.dangerLevel ?? "MEDIUM"} options={optionsOf(DANGER_LEVEL, locale)} />
            </Field>
            <Field label={t("wanted.reason")} htmlFor="wt-reason" required hint={t("wanted.reasonHint")} error={s.fieldErrors?.reason} className="sm:col-span-2">
              <textarea id="wt-reason" name="reason" className="input" rows={4} required minLength={10} maxLength={3000} defaultValue={values.reason ?? ""} />
            </Field>
            <Field label={t("wanted.lastSeenLocation")} htmlFor="wt-lastseen">
              <input id="wt-lastseen" name="lastSeenLocation" className="input" maxLength={300} defaultValue={values.lastSeenLocation ?? ""} />
            </Field>
            <Field label={t("wanted.expiresAt")} htmlFor="wt-expires" hint={t("wanted.expiresHint")}>
              <input id="wt-expires" name="expiresAt" type="date" className="input" defaultValue={values.expiresAt ?? ""} />
            </Field>
          </div>
          <SubmitButton pendingText={t("common.saving")}>{mode === "create" ? t("wanted.register") : t("common.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function WantedStatusForm({ id, next }: { id: string; next: string[] }) {
  const t = useT();
  const locale = useLocale();
  const [status, setStatus] = useState(next[0] ?? "");
  if (!next.length) return null;
  const closing = status === "CANCELLED" || status === "ARRESTED" || status === "EXPIRED" || status === "SUSPENDED";
  const reasonRequired = status === "CANCELLED" || status === "SUSPENDED";
  return (
    <ActionForm action={setWantedStatusAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <Field label={t("wanted.nextStatus")} htmlFor="wt-next-status" required>
            <Select id="wt-next-status" name="status" value={status} onChange={(e) => setStatus(e.target.value)} options={next.map((n) => ({ value: n, label: WANTED_STATUS[n]?.[locale] ?? n }))} />
          </Field>
          {closing ? (
            <Field label={reasonRequired ? t("wanted.reasonRequired") : t("wanted.closureNotes")} htmlFor="wt-closure" required={reasonRequired} error={s.fieldErrors?.closureNotes}>
              <textarea id="wt-closure" name="closureNotes" className="input" rows={3} maxLength={2000} required={reasonRequired} />
            </Field>
          ) : null}
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("wanted.applyStatus")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function WantedVerifyForm({ id }: { id: string }) {
  const t = useT();
  return (
    <ActionForm action={verifyWantedAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <Field label={t("wanted.verificationNotes")} htmlFor="wt-verify-notes" hint={t("wanted.verifyHint")} error={s.fieldErrors?.notes}>
            <textarea id="wt-verify-notes" name="notes" className="input" rows={2} maxLength={2000} />
          </Field>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("wanted.verifyAction")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function SightingForm({ wantedPersonId }: { wantedPersonId: string }) {
  const t = useT();
  return (
    <ActionForm action={addSightingAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="wantedPersonId" value={wantedPersonId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("wanted.sightingLocation")} htmlFor="wt-sight-loc" required error={s.fieldErrors?.location}>
              <input id="wt-sight-loc" name="location" className="input" required minLength={2} maxLength={300} />
            </Field>
            <Field label={t("wanted.sightingWhen")} htmlFor="wt-sight-when" required error={s.fieldErrors?.occurredAt}>
              <input id="wt-sight-when" name="occurredAt" type="datetime-local" className="input" required />
            </Field>
            <Field label={t("wanted.sightingSource")} htmlFor="wt-sight-source">
              <input id="wt-sight-source" name="source" className="input" maxLength={120} />
            </Field>
            <Field label={t("wanted.sightingNotes")} htmlFor="wt-sight-notes">
              <input id="wt-sight-notes" name="notes" className="input" maxLength={1000} />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("wanted.addSighting")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function VehicleForm({ wantedPersonId }: { wantedPersonId: string }) {
  const t = useT();
  return (
    <ActionForm action={addVehicleAction} className="space-y-3">
      {() => (
        <>
          <input type="hidden" name="wantedPersonId" value={wantedPersonId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("wanted.plateNumber")} htmlFor="wt-veh-plate">
              <input id="wt-veh-plate" name="plateNumber" className="input" maxLength={20} placeholder="TD-1234-AB" />
            </Field>
            <Field label={t("wanted.vehicleMake")} htmlFor="wt-veh-make">
              <input id="wt-veh-make" name="make" className="input" maxLength={60} />
            </Field>
            <Field label={t("wanted.vehicleModel")} htmlFor="wt-veh-model">
              <input id="wt-veh-model" name="model" className="input" maxLength={60} />
            </Field>
            <Field label={t("wanted.vehicleColor")} htmlFor="wt-veh-color">
              <input id="wt-veh-color" name="color" className="input" maxLength={40} />
            </Field>
            <Field label={t("wanted.vehicleYear")} htmlFor="wt-veh-year">
              <input id="wt-veh-year" name="year" type="number" min={1950} max={2100} className="input" />
            </Field>
            <Field label={t("evidence.notes")} htmlFor="wt-veh-notes">
              <input id="wt-veh-notes" name="notes" className="input" maxLength={300} />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("wanted.addVehicle")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function PhotoForm({ wantedPersonId, isFirst }: { wantedPersonId: string; isFirst: boolean }) {
  const t = useT();
  return (
    <ActionForm action={attachPhotoAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="wantedPersonId" value={wantedPersonId} />
          <Field label={t("wanted.photoFile")} htmlFor="wt-photo-file" required error={s.fieldErrors?.file}>
            <input id="wt-photo-file" name="file" type="file" className="input" required accept="image/*" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="setAsMain" defaultChecked={isFirst} /> {t("wanted.setAsMain")}
          </label>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("wanted.uploadPhoto")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function WarrantForm({ wantedPersonId }: { wantedPersonId: string }) {
  const t = useT();
  return (
    <ActionForm action={createWarrantAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="wantedPersonId" value={wantedPersonId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("wanted.warrantAuthority")} htmlFor="wt-wr-auth" required error={s.fieldErrors?.issuingAuthority}>
              <input id="wt-wr-auth" name="issuingAuthority" className="input" required minLength={3} maxLength={200} />
            </Field>
            <Field label={t("wanted.warrantRef")} htmlFor="wt-wr-ref">
              <input id="wt-wr-ref" name="issuingAuthorityRef" className="input" maxLength={120} />
            </Field>
            <Field label={t("wanted.warrantGrounds")} htmlFor="wt-wr-grounds" required error={s.fieldErrors?.grounds} className="sm:col-span-2">
              <textarea id="wt-wr-grounds" name="grounds" className="input" rows={3} required minLength={10} maxLength={3000} />
            </Field>
            <Field label={t("wanted.warrantAddress")} htmlFor="wt-wr-address">
              <input id="wt-wr-address" name="targetAddress" className="input" maxLength={300} />
            </Field>
            <Field label={t("wanted.expiresAt")} htmlFor="wt-wr-expires">
              <input id="wt-wr-expires" name="expiresAt" type="date" className="input" />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("wanted.requestWarrant")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function PrintButton({ children }: { children: ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white">
      {children}
    </button>
  );
}

export function WarrantStatusForm({ warrantId, next }: { warrantId: string; next: string[] }) {
  const t = useT();
  if (!next.length) return null;
  return (
    <ActionForm action={setWarrantStatusAction} className="space-y-2">
      {() => (
        <>
          <input type="hidden" name="warrantId" value={warrantId} />
          <div className="flex items-center gap-2">
            <Select name="status" defaultValue={next[0]} options={next.map((n) => ({ value: n, label: n }))} />
            <SubmitButton size="sm" pendingText={t("common.working")}>
              {t("wanted.applyStatus")}
            </SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

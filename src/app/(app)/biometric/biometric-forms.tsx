"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { BIOMETRIC_ACTION, BIOMETRIC_SEARCH_MODE, FINGER_POSITION, optionsOf } from "@/lib/labels";
import { PersonPicker } from "@/components/person-picker";
import {
  detectPlateAction,
  enrollFaceAction,
  enrollFingerprintAction,
  enrollVoiceAction,
  recordBiometricActionAction,
  searchFaceAction,
  searchFingerprintAction,
  searchPlateAction,
  searchVoiceAction,
} from "@/server/biometric/actions";

export type Opt = { id: string; label: string };

function SearchGateFields({ cases, idPrefix, s, defaultCaseId }: { cases: Opt[]; idPrefix: string; s: { fieldErrors?: Record<string, string> }; defaultCaseId?: string }) {
  const t = useT();
  return (
    <>
      <Field label={t("biometric.case")} htmlFor={`${idPrefix}-case`} required error={s.fieldErrors?.caseId}>
        <Select id={`${idPrefix}-case`} name="caseId" required defaultValue={defaultCaseId ?? ""} placeholder="—" options={cases.map((c) => ({ value: c.id, label: c.label }))} />
      </Field>
      <Field label={t("biometric.reason")} htmlFor={`${idPrefix}-reason`} required hint={t("biometric.reasonHint")} error={s.fieldErrors?.reason} className="sm:col-span-2">
        <textarea id={`${idPrefix}-reason`} name="reason" className="input" rows={2} required minLength={10} maxLength={500} />
      </Field>
      <Field label={t("biometric.device")} htmlFor={`${idPrefix}-device`}>
        <input id={`${idPrefix}-device`} name="device" className="input" maxLength={120} />
      </Field>
      <Field label={t("biometric.location")} htmlFor={`${idPrefix}-location`}>
        <input id={`${idPrefix}-location`} name="location" className="input" maxLength={200} />
      </Field>
    </>
  );
}

export function FingerprintSearchForm({ cases, defaultCaseId }: { cases: Opt[]; defaultCaseId?: string }) {
  const t = useT();
  const locale = useLocale();
  const [mode, setMode] = useState("IDENTIFY_1_N");
  return (
    <ActionForm action={searchFingerprintAction} className="space-y-4">
      {(s) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchGateFields cases={cases} idPrefix="fp-search" s={s} defaultCaseId={defaultCaseId} />
            <Field label={t("biometric.mode")} htmlFor="fp-search-mode" required>
              <Select id="fp-search-mode" name="mode" value={mode} onChange={(e) => setMode(e.target.value)} options={optionsOf(BIOMETRIC_SEARCH_MODE, locale)} />
            </Field>
            <Field label={t("biometric.fingerPosition")} htmlFor="fp-search-pos">
              <Select id="fp-search-pos" name="position" defaultValue="UNKNOWN" options={optionsOf(FINGER_POSITION, locale)} />
            </Field>
            {mode === "VERIFY_1_1" ? (
              <div className="sm:col-span-2">
                <PersonPicker name="personId" label={t("biometric.verifyAgainst")} required id="fp-search-person" />
              </div>
            ) : null}
            <Field label={t("biometric.uploadFingerprint")} htmlFor="fp-search-file" required className="sm:col-span-2">
              <input id="fp-search-file" name="file" type="file" className="input" required accept="image/*" />
            </Field>
          </div>
          <SubmitButton pendingText={t("common.working")}>{t("biometric.runSearch")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function EnrollFingerprintForm() {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={enrollFingerprintAction} className="space-y-4">
      {(s) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <PersonPicker name="personId" label={t("biometric.person")} required id="fp-enroll-person" />
            <Field label={t("biometric.fingerPosition")} htmlFor="fp-enroll-pos" required>
              <Select id="fp-enroll-pos" name="position" defaultValue="UNKNOWN" options={optionsOf(FINGER_POSITION, locale)} />
            </Field>
            <Field label={t("biometric.uploadFingerprint")} htmlFor="fp-enroll-file" required error={s.fieldErrors?.file} className="sm:col-span-2">
              <input id="fp-enroll-file" name="file" type="file" className="input" required accept="image/*" />
            </Field>
          </div>
          <p className="text-xs text-slate">{t("biometric.templateOnlyHint")}</p>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("biometric.enroll")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function FaceSearchForm({ cases, defaultCaseId }: { cases: Opt[]; defaultCaseId?: string }) {
  const t = useT();
  const locale = useLocale();
  const [mode, setMode] = useState("IDENTIFY_1_N");
  return (
    <ActionForm action={searchFaceAction} className="space-y-4">
      {(s) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchGateFields cases={cases} idPrefix="face-search" s={s} defaultCaseId={defaultCaseId} />
            <Field label={t("biometric.mode")} htmlFor="face-search-mode" required>
              <Select id="face-search-mode" name="mode" value={mode} onChange={(e) => setMode(e.target.value)} options={optionsOf(BIOMETRIC_SEARCH_MODE, locale)} />
            </Field>
            {mode === "VERIFY_1_1" ? (
              <div>
                <PersonPicker name="personId" label={t("biometric.verifyAgainst")} required id="face-search-person" />
              </div>
            ) : null}
            <Field label={t("biometric.uploadPhoto")} htmlFor="face-search-file" required className="sm:col-span-2" hint={t("biometric.multiFaceHint")}>
              <input id="face-search-file" name="file" type="file" className="input" required accept="image/*" />
            </Field>
          </div>
          <SubmitButton pendingText={t("common.working")}>{t("biometric.runSearch")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function EnrollFaceForm() {
  const t = useT();
  return (
    <ActionForm action={enrollFaceAction} className="space-y-4">
      {(s) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <PersonPicker name="personId" label={t("biometric.person")} required id="face-enroll-person" />
            <Field label={t("biometric.uploadPhoto")} htmlFor="face-enroll-file" required error={s.fieldErrors?.file}>
              <input id="face-enroll-file" name="file" type="file" className="input" required accept="image/*" />
            </Field>
          </div>
          <p className="text-xs text-slate">{t("biometric.templateOnlyHint")}</p>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("biometric.enroll")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function VoiceSearchForm({ cases, defaultCaseId }: { cases: Opt[]; defaultCaseId?: string }) {
  const t = useT();
  const locale = useLocale();
  const [mode, setMode] = useState("IDENTIFY_1_N");
  return (
    <ActionForm action={searchVoiceAction} className="space-y-4">
      {(s) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchGateFields cases={cases} idPrefix="voice-search" s={s} defaultCaseId={defaultCaseId} />
            <Field label={t("biometric.mode")} htmlFor="voice-search-mode" required>
              <Select id="voice-search-mode" name="mode" value={mode} onChange={(e) => setMode(e.target.value)} options={optionsOf(BIOMETRIC_SEARCH_MODE, locale)} />
            </Field>
            {mode === "VERIFY_1_1" ? (
              <div>
                <PersonPicker name="personId" label={t("biometric.verifyAgainst")} required id="voice-search-person" />
              </div>
            ) : null}
            <Field label={t("biometric.uploadAudio")} htmlFor="voice-search-file" required className="sm:col-span-2" hint={t("biometric.sttHint")}>
              <input id="voice-search-file" name="file" type="file" className="input" required accept="audio/*" />
            </Field>
          </div>
          <SubmitButton pendingText={t("common.working")}>{t("biometric.runSearch")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function EnrollVoiceForm() {
  const t = useT();
  return (
    <ActionForm action={enrollVoiceAction} className="space-y-4">
      {(s) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <PersonPicker name="personId" label={t("biometric.person")} required id="voice-enroll-person" />
            <Field label={t("biometric.uploadAudio")} htmlFor="voice-enroll-file" required error={s.fieldErrors?.file}>
              <input id="voice-enroll-file" name="file" type="file" className="input" required accept="audio/*" />
            </Field>
          </div>
          <p className="text-xs text-slate">{t("biometric.templateOnlyHint")}</p>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("biometric.enroll")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function AnprDetectForm({ cases, defaultCaseId }: { cases: Opt[]; defaultCaseId?: string }) {
  const t = useT();
  return (
    <ActionForm action={detectPlateAction} className="space-y-4">
      {(s) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchGateFields cases={cases} idPrefix="anpr-detect" s={s} defaultCaseId={defaultCaseId} />
            <Field label={t("biometric.uploadVehicleImage")} htmlFor="anpr-detect-file" required className="sm:col-span-2">
              <input id="anpr-detect-file" name="file" type="file" className="input" required accept="image/*" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="retainAsEvidence" /> {t("biometric.retainAsEvidence")}
          </label>
          <SubmitButton pendingText={t("common.working")}>{t("biometric.detectPlate")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function AnprSearchForm({ cases, defaultCaseId }: { cases: Opt[]; defaultCaseId?: string }) {
  const t = useT();
  return (
    <ActionForm action={searchPlateAction} className="space-y-4">
      {(s) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchGateFields cases={cases} idPrefix="anpr-search" s={s} defaultCaseId={defaultCaseId} />
            <Field label={t("biometric.plateNumber")} htmlFor="anpr-search-plate" required error={s.fieldErrors?.plateNumber} className="sm:col-span-2">
              <input id="anpr-search-plate" name="plateNumber" className="input" required minLength={2} maxLength={20} placeholder="TD-1234-AB" />
            </Field>
          </div>
          <SubmitButton pendingText={t("common.working")}>{t("biometric.searchPlate")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function RecordActionForm({ searchId }: { searchId: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={recordBiometricActionAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="searchId" value={searchId} />
          <Field label={t("biometric.investigatorAction")} htmlFor="bio-action" required>
            <Select id="bio-action" name="action" options={optionsOf(BIOMETRIC_ACTION, locale).filter((o) => o.value !== "NONE")} />
          </Field>
          <Field label={t("biometric.actionNotes")} htmlFor="bio-action-notes" error={s.fieldErrors?.notes}>
            <textarea id="bio-action-notes" name="notes" className="input" rows={2} maxLength={1000} />
          </Field>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("biometric.recordAction")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

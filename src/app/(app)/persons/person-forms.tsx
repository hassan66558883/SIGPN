"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import type { FormState } from "@/components/forms";
import { Alert, Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { useMessageTranslator } from "@/components/i18n-provider";
import { GENDER, IDENTIFIER_TYPE, MARITAL_STATUS, RELATIONSHIP_TYPE, optionsOf } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { addAliasAction, addIdentifierAction, addRelationshipAction, createPersonAction, mergePersonsAction, updatePersonAction, type PersonFormState } from "@/server/persons/actions";
import { PersonPicker } from "@/components/person-picker";

type Region = { id: string; name: string };

export type PersonValues = {
  id?: string;
  firstName?: string;
  lastName?: string;
  otherNames?: string | null;
  gender?: string;
  dateOfBirth?: string;
  placeOfBirth?: string | null;
  nationality?: string | null;
  maritalStatus?: string;
  occupation?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  regionId?: string | null;
  physicalDescription?: string | null;
  distinguishingMarks?: string | null;
  notes?: string | null;
  isDeceased?: boolean;
};

function Fields({ v, regions, s, mode }: { v: PersonValues; regions: Region[]; s: FormState; mode: "create" | "edit" }) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("person.lastName")} htmlFor="p-last" required error={s.fieldErrors?.lastName}>
        <input id="p-last" name="lastName" className="input" required maxLength={80} defaultValue={v.lastName ?? ""} />
      </Field>
      <Field label={t("person.firstName")} htmlFor="p-first" required error={s.fieldErrors?.firstName}>
        <input id="p-first" name="firstName" className="input" required maxLength={80} defaultValue={v.firstName ?? ""} />
      </Field>
      <Field label={t("person.otherNames")} htmlFor="p-other">
        <input id="p-other" name="otherNames" className="input" maxLength={120} defaultValue={v.otherNames ?? ""} />
      </Field>
      <Field label={t("person.gender")} htmlFor="p-gender">
        <Select id="p-gender" name="gender" defaultValue={v.gender ?? "UNKNOWN"} options={optionsOf(GENDER, locale)} />
      </Field>
      <Field label={t("person.dateOfBirth")} htmlFor="p-dob" error={s.fieldErrors?.dateOfBirth}>
        <input id="p-dob" name="dateOfBirth" type="date" className="input" defaultValue={v.dateOfBirth ?? ""} />
      </Field>
      <Field label={t("person.placeOfBirth")} htmlFor="p-pob">
        <input id="p-pob" name="placeOfBirth" className="input" maxLength={120} defaultValue={v.placeOfBirth ?? ""} />
      </Field>
      <Field label={t("person.nationality")} htmlFor="p-nat">
        <input id="p-nat" name="nationality" className="input" maxLength={60} defaultValue={v.nationality ?? (mode === "create" ? "Tchadienne" : "")} />
      </Field>
      <Field label={t("person.maritalStatus")} htmlFor="p-marital">
        <Select id="p-marital" name="maritalStatus" defaultValue={v.maritalStatus ?? "UNKNOWN"} options={optionsOf(MARITAL_STATUS, locale)} />
      </Field>
      <Field label={t("person.occupation")} htmlFor="p-occ">
        <input id="p-occ" name="occupation" className="input" maxLength={100} defaultValue={v.occupation ?? ""} />
      </Field>
      <Field label={t("person.phone")} htmlFor="p-phone">
        <input id="p-phone" name="phone" className="input" maxLength={30} defaultValue={v.phone ?? ""} />
      </Field>
      <Field label={t("person.email")} htmlFor="p-email" error={s.fieldErrors?.email}>
        <input id="p-email" name="email" type="email" className="input" maxLength={120} defaultValue={v.email ?? ""} />
      </Field>
      <Field label={t("person.province")} htmlFor="p-region">
        <Select id="p-region" name="regionId" placeholder="—" defaultValue={v.regionId ?? ""} options={regions.map((r) => ({ value: r.id, label: r.name }))} />
      </Field>
      <Field label={t("person.address")} htmlFor="p-addr">
        <input id="p-addr" name="address" className="input" maxLength={200} defaultValue={v.address ?? ""} />
      </Field>
      <Field label={t("person.city")} htmlFor="p-city">
        <input id="p-city" name="city" className="input" maxLength={100} defaultValue={v.city ?? ""} />
      </Field>
      <Field label={t("person.physical")} htmlFor="p-phys" className="sm:col-span-2">
        <textarea id="p-phys" name="physicalDescription" className="input" rows={2} maxLength={1000} defaultValue={v.physicalDescription ?? ""} />
      </Field>
      <Field label={t("person.marks")} htmlFor="p-marks">
        <input id="p-marks" name="distinguishingMarks" className="input" maxLength={500} defaultValue={v.distinguishingMarks ?? ""} />
      </Field>
      <Field label={t("person.notes")} htmlFor="p-notes">
        <input id="p-notes" name="notes" className="input" maxLength={2000} defaultValue={v.notes ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isDeceased" defaultChecked={v.isDeceased ?? false} /> {t("person.isDeceased")}
      </label>
    </div>
  );
}

export function PersonCreateForm({ regions }: { regions: Region[] }) {
  const [state, action] = useActionState<PersonFormState, FormData>(createPersonAction, {});
  const t = useT();
  const locale = useLocale();
  const tm = useMessageTranslator();
  const dupKey = (r: string): "person.duplicateReason.identifier" | "person.duplicateReason.phone" | "person.duplicateReason.name+birthdate" | "person.duplicateReason.name" => (r === "identifier" ? "person.duplicateReason.identifier" : r === "phone" ? "person.duplicateReason.phone" : r === "name+birthdate" ? "person.duplicateReason.name+birthdate" : "person.duplicateReason.name");
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? <Alert tone={state.duplicates?.length ? "warning" : "danger"}>{tm(state.error)}</Alert> : null}
      {state.duplicates?.length ? (
        <div className="rounded-md border border-warning/40 bg-warning-soft p-4 text-sm">
          <p className="font-bold text-warning">{t("person.duplicatesTitle")}</p>
          <p className="mt-1 text-ink">{t("person.duplicatesText")}</p>
          <ul className="mt-2 divide-y divide-warning/20">
            {state.duplicates.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span>
                  <Link href={`/persons/${d.id}`} className="font-semibold text-blue hover:underline">
                    {d.lastName}, {d.firstName}
                  </Link>{" "}
                  <span className="font-mono text-xs text-slate">{d.number}</span>
                  {d.dateOfBirth ? <span className="text-xs text-slate"> · {fmtDate(d.dateOfBirth, locale)}</span> : null}
                  {d.phone ? <span className="text-xs text-slate"> · {d.phone}</span> : null}
                  {d.stationName ? <span className="text-xs text-slate"> · {d.stationName}</span> : null}
                </span>
                <span className="text-xs font-semibold uppercase text-warning">{t(dupKey(d.reason))}</span>
              </li>
            ))}
          </ul>
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" name="forceCreate" value="1" /> {t("person.forceCreate")}
          </label>
        </div>
      ) : null}
      <Fields v={{}} regions={regions} s={state} mode="create" />
      <div className="grid gap-4 rounded-md border border-dashed border-line p-3 sm:grid-cols-2">
        <Field label={t("person.idType")} htmlFor="p-idtype">
          <Select id="p-idtype" name="idType" placeholder="—" options={optionsOf(IDENTIFIER_TYPE, locale)} />
        </Field>
        <Field label={t("person.idValue")} htmlFor="p-idvalue" error={state.fieldErrors?.idValue}>
          <input id="p-idvalue" name="idValue" className="input font-mono" maxLength={60} />
        </Field>
      </div>
      <SubmitButton pendingText={t("common.saving")}>{t("person.register")}</SubmitButton>
    </form>
  );
}

export function PersonEditForm({ values, regions }: { values: PersonValues; regions: Region[] }) {
  const t = useT();
  return (
    <ActionForm action={updatePersonAction}>
      {(s) => (
        <>
          <input type="hidden" name="id" value={values.id} />
          <Fields v={values} regions={regions} s={s} mode="edit" />
          <SubmitButton pendingText={t("common.saving")}>{t("person.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function IdentifierForm({ personId }: { personId: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={addIdentifierAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="personId" value={personId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("person.idType")} htmlFor="idf-type" required>
              <Select id="idf-type" name="type" defaultValue="NATIONAL_ID" options={optionsOf(IDENTIFIER_TYPE, locale)} />
            </Field>
            <Field label={t("person.idValue")} htmlFor="idf-value" required error={s.fieldErrors?.value}>
              <input id="idf-value" name="value" className="input font-mono" required maxLength={60} />
            </Field>
            <Field label={t("person.idIssuedBy")} htmlFor="idf-by">
              <input id="idf-by" name="issuedBy" className="input" maxLength={120} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("person.idIssuedAt")} htmlFor="idf-at">
                <input id="idf-at" name="issuedAt" type="date" className="input" />
              </Field>
              <Field label={t("person.idExpires")} htmlFor="idf-exp">
                <input id="idf-exp" name="expiresAt" type="date" className="input" />
              </Field>
            </div>
          </div>
          <SubmitButton size="sm" variant="secondary" pendingText={t("common.saving")}>
            {t("person.addIdentifier")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function AliasForm({ personId }: { personId: string }) {
  const t = useT();
  return (
    <ActionForm action={addAliasAction} className="flex flex-wrap items-end gap-3">
      {(s) => (
        <>
          <input type="hidden" name="personId" value={personId} />
          <Field label={t("person.alias")} htmlFor="alias" required error={s.fieldErrors?.alias} className="min-w-[200px] flex-1">
            <input id="alias" name="alias" className="input" required maxLength={120} />
          </Field>
          <SubmitButton size="sm" variant="secondary" pendingText={t("common.saving")}>
            {t("person.addAlias")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function RelationshipForm({ personId }: { personId: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={addRelationshipAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="fromPersonId" value={personId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <PersonPicker name="toPersonId" label={t("person.relatedPerson")} required id="rel-person" error={s.fieldErrors?.toPersonId} />
            <Field label={t("person.relationType")} htmlFor="rel-type" required>
              <Select id="rel-type" name="type" defaultValue="RELATIVE" options={optionsOf(RELATIONSHIP_TYPE, locale)} />
            </Field>
            <Field label={t("person.notes")} htmlFor="rel-notes" className="sm:col-span-2">
              <input id="rel-notes" name="notes" className="input" maxLength={300} />
            </Field>
          </div>
          <SubmitButton size="sm" variant="secondary" pendingText={t("common.saving")}>
            {t("person.addRelationship")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function MergeForm({ keepId }: { keepId: string }) {
  const t = useT();
  return (
    <ActionForm action={mergePersonsAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="keepId" value={keepId} />
          <PersonPicker name="mergeId" label={t("person.mergeInto")} required id="merge-person" error={s.fieldErrors?.mergeId} />
          <Field label={t("person.mergeReason")} htmlFor="merge-reason" required error={s.fieldErrors?.reason}>
            <input id="merge-reason" name="reason" className="input" required minLength={5} maxLength={300} />
          </Field>
          <SubmitButton size="sm" variant="warning" pendingText={t("common.working")}>
            {t("person.mergeConfirm")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

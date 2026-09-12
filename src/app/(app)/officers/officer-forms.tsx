"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { DUTY_STATUS, GENDER, optionsOf } from "@/lib/labels";
import { assignOfficerAction, createOfficerAction, setDutyStatusAction, updateOfficerAction } from "@/server/org/actions";

export type OrgRefs = {
  stations: { id: string; code: string; name: string; regionId: string }[];
  departments: { id: string; code: string; name: string; stationId: string }[];
  ranks: { id: string; code: string; name: string; level: number }[];
};

export type OfficerValues = {
  id?: string;
  badgeNumber?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string | null;
  email?: string | null;
  rankId?: string;
  stationId?: string;
  departmentId?: string | null;
  hiredAt?: string;
  specialties?: string | null;
  notes?: string | null;
};

export function OfficerForm({ refs, values = {}, mode }: { refs: OrgRefs; values?: OfficerValues; mode: "create" | "edit" }) {
  const t = useT();
  const locale = useLocale();
  const [stationId, setStationId] = useState(values.stationId ?? (refs.stations.length === 1 ? refs.stations[0].id : ""));
  const departments = refs.departments.filter((d) => d.stationId === stationId);
  return (
    <ActionForm action={mode === "create" ? createOfficerAction : updateOfficerAction}>
      {(s) => (
        <>
          {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("officer.badge")} htmlFor="of-badge" required error={s.fieldErrors?.badgeNumber}>
              <input id="of-badge" name="badgeNumber" className="input font-mono uppercase" required maxLength={20} defaultValue={values.badgeNumber ?? ""} />
            </Field>
            <Field label={t("officer.gender")} htmlFor="of-gender">
              <Select id="of-gender" name="gender" defaultValue={values.gender ?? "UNKNOWN"} options={optionsOf(GENDER, locale)} />
            </Field>
            <Field label={t("officer.firstName")} htmlFor="of-first" required error={s.fieldErrors?.firstName}>
              <input id="of-first" name="firstName" className="input" required maxLength={60} defaultValue={values.firstName ?? ""} />
            </Field>
            <Field label={t("officer.lastName")} htmlFor="of-last" required error={s.fieldErrors?.lastName}>
              <input id="of-last" name="lastName" className="input" required maxLength={60} defaultValue={values.lastName ?? ""} />
            </Field>
            <Field label={t("officer.dateOfBirth")} htmlFor="of-dob" error={s.fieldErrors?.dateOfBirth}>
              <input id="of-dob" name="dateOfBirth" type="date" className="input" defaultValue={values.dateOfBirth ?? ""} />
            </Field>
            <Field label={t("officer.hiredAt")} htmlFor="of-hired" error={s.fieldErrors?.hiredAt}>
              <input id="of-hired" name="hiredAt" type="date" className="input" defaultValue={values.hiredAt ?? ""} />
            </Field>
            <Field label={t("officer.phone")} htmlFor="of-phone">
              <input id="of-phone" name="phone" className="input" maxLength={30} defaultValue={values.phone ?? ""} />
            </Field>
            <Field label={t("officer.email")} htmlFor="of-email" error={s.fieldErrors?.email}>
              <input id="of-email" name="email" type="email" className="input" maxLength={120} defaultValue={values.email ?? ""} />
            </Field>
            {mode === "create" ? (
              <>
                <Field label={t("officer.rank")} htmlFor="of-rank" required error={s.fieldErrors?.rankId}>
                  <Select id="of-rank" name="rankId" required placeholder="—" defaultValue={values.rankId ?? ""} options={refs.ranks.map((r) => ({ value: r.id, label: `${r.name} (${r.code})` }))} />
                </Field>
                <Field label={t("officer.station")} htmlFor="of-station" required error={s.fieldErrors?.stationId}>
                  <Select id="of-station" name="stationId" required placeholder={refs.stations.length > 1 ? "—" : undefined} value={stationId} onChange={(e) => setStationId(e.target.value)} options={refs.stations.map((st) => ({ value: st.id, label: `${st.code} · ${st.name}` }))} />
                </Field>
                <Field label={t("officer.department")} htmlFor="of-dept" error={s.fieldErrors?.departmentId}>
                  <Select id="of-dept" name="departmentId" placeholder="—" defaultValue={values.departmentId ?? ""} options={departments.map((d) => ({ value: d.id, label: `${d.code} · ${d.name}` }))} />
                </Field>
              </>
            ) : null}
            <Field label={t("officer.specialties")} htmlFor="of-spec" className="sm:col-span-2">
              <input id="of-spec" name="specialties" className="input" maxLength={300} defaultValue={values.specialties ?? ""} />
            </Field>
            <Field label={t("officer.notes")} htmlFor="of-notes" className="sm:col-span-2">
              <textarea id="of-notes" name="notes" className="input" rows={2} maxLength={1000} defaultValue={values.notes ?? ""} />
            </Field>
          </div>
          <SubmitButton pendingText={t("common.saving")}>{mode === "create" ? t("officer.create") : t("officer.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function AssignmentForm({ officerId, refs, current }: { officerId: string; refs: OrgRefs; current: { stationId: string; departmentId: string | null; rankId: string } }) {
  const t = useT();
  const [stationId, setStationId] = useState(current.stationId);
  const departments = refs.departments.filter((d) => d.stationId === stationId);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ActionForm action={assignOfficerAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="officerId" value={officerId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("officer.station")} htmlFor="as-station" required error={s.fieldErrors?.stationId}>
              <Select id="as-station" name="stationId" required value={stationId} onChange={(e) => setStationId(e.target.value)} options={refs.stations.map((st) => ({ value: st.id, label: `${st.code} · ${st.name}` }))} />
            </Field>
            <Field label={t("officer.department")} htmlFor="as-dept">
              <Select id="as-dept" name="departmentId" placeholder="—" defaultValue={stationId === current.stationId ? current.departmentId ?? "" : ""} options={departments.map((d) => ({ value: d.id, label: `${d.code} · ${d.name}` }))} />
            </Field>
            <Field label={t("officer.rank")} htmlFor="as-rank">
              <Select id="as-rank" name="rankId" defaultValue={current.rankId} options={refs.ranks.map((r) => ({ value: r.id, label: `${r.name} (${r.code})` }))} />
            </Field>
            <Field label={t("officer.position")} htmlFor="as-pos">
              <input id="as-pos" name="position" className="input" maxLength={100} />
            </Field>
            <Field label={t("officer.startDate")} htmlFor="as-start" required error={s.fieldErrors?.startDate}>
              <input id="as-start" name="startDate" type="date" className="input" required defaultValue={today} />
            </Field>
            <Field label={t("officer.reason")} htmlFor="as-reason">
              <input id="as-reason" name="reason" className="input" maxLength={300} />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("common.saving")}>
            {t("officer.assign")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function DutyStatusForm({ officerId, current }: { officerId: string; current: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={setDutyStatusAction} className="space-y-3">
      {() => (
        <>
          <input type="hidden" name="officerId" value={officerId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("officer.newStatus")} htmlFor="ds-status" required>
              <Select id="ds-status" name="dutyStatus" defaultValue={current} options={optionsOf(DUTY_STATUS, locale)} />
            </Field>
            <Field label={t("officer.reason")} htmlFor="ds-reason">
              <input id="ds-reason" name="reason" className="input" maxLength={300} />
            </Field>
          </div>
          <SubmitButton size="sm" variant="secondary" pendingText={t("common.saving")}>
            {t("officer.changeStatus")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

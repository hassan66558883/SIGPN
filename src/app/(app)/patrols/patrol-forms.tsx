"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { SHIFT, optionsOf } from "@/lib/labels";
import { addPatrolOfficerAction, cancelPatrolAction, completePatrolAction, createPatrolAction, startPatrolAction, updatePatrolAction, upsertZoneAction } from "@/server/ops/actions";

export type Opt = { id: string; label: string; stationId?: string };
export type PatrolValues = { id?: string; stationId?: string | null; zoneId?: string | null; shift?: string; mission?: string; plannedStart?: string; plannedEnd?: string; supervisorId?: string; vehicleId?: string | null; notes?: string | null; memberIds?: string[] };

export function PatrolForm({ mode, values = {}, stations, zones, officers, vehicles }: { mode: "create" | "edit"; values?: PatrolValues; stations: Opt[]; zones: Opt[]; officers: Opt[]; vehicles: Opt[] }) {
  const t = useT();
  const locale = useLocale();
  const [stationId, setStationId] = useState(values.stationId ?? (stations.length === 1 ? stations[0].id : ""));
  const byStation = <T extends Opt>(list: T[]) => list.filter((x) => !stationId || !x.stationId || x.stationId === stationId);
  const zoneOpts = byStation(zones);
  const officerOpts = byStation(officers);
  const vehicleOpts = byStation(vehicles);
  return (
    <ActionForm action={mode === "create" ? createPatrolAction : updatePatrolAction}>
      {(s) => (
        <>
          {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {mode === "create" ? (
              stations.length > 1 ? (
                <Field label={t("patrol.station")} htmlFor="pt-station" required error={s.fieldErrors?.stationId}>
                  <Select id="pt-station" name="stationId" required placeholder="—" value={stationId} onChange={(e) => setStationId(e.target.value)} options={stations.map((x) => ({ value: x.id, label: x.label }))} />
                </Field>
              ) : stations.length === 1 ? (
                <input type="hidden" name="stationId" value={stations[0].id} />
              ) : null
            ) : null}
            <Field label={t("patrol.zone")} htmlFor="pt-zone" error={s.fieldErrors?.zoneId}>
              <Select id="pt-zone" name="zoneId" defaultValue={values.zoneId ?? ""} placeholder={t("patrol.noZone")} options={zoneOpts.map((z) => ({ value: z.id, label: z.label }))} />
            </Field>
            <Field label={t("patrol.shift")} htmlFor="pt-shift" required>
              <Select id="pt-shift" name="shift" defaultValue={values.shift ?? "MORNING"} options={optionsOf(SHIFT, locale)} />
            </Field>
            <Field label={t("patrol.mission")} htmlFor="pt-mission" required error={s.fieldErrors?.mission} className="sm:col-span-2">
              <textarea id="pt-mission" name="mission" className="input" rows={3} required minLength={5} maxLength={500} defaultValue={values.mission ?? ""} />
            </Field>
            <Field label={t("patrol.plannedStart")} htmlFor="pt-start" required error={s.fieldErrors?.plannedStart}>
              <input id="pt-start" name="plannedStart" type="datetime-local" className="input" required defaultValue={values.plannedStart ?? ""} />
            </Field>
            <Field label={t("patrol.plannedEnd")} htmlFor="pt-end" required error={s.fieldErrors?.plannedEnd}>
              <input id="pt-end" name="plannedEnd" type="datetime-local" className="input" required defaultValue={values.plannedEnd ?? ""} />
            </Field>
            <Field label={t("patrol.supervisor")} htmlFor="pt-sup" required error={s.fieldErrors?.supervisorId}>
              <Select id="pt-sup" name="supervisorId" required placeholder="—" defaultValue={values.supervisorId ?? ""} options={officerOpts.map((o) => ({ value: o.id, label: o.label }))} />
            </Field>
            <Field label={t("patrol.vehicle")} htmlFor="pt-veh" error={s.fieldErrors?.vehicleId} hint={t("patrol.vehicleReleased")}>
              <Select id="pt-veh" name="vehicleId" defaultValue={values.vehicleId ?? ""} placeholder={t("patrol.noVehicle")} options={vehicleOpts.map((v) => ({ value: v.id, label: v.label }))} />
            </Field>
            {mode === "create" ? (
              <Field label={t("patrol.members")} htmlFor="pt-members" hint={t("patrol.membersHint")} className="sm:col-span-2">
                <select id="pt-members" name="officerIds" multiple size={Math.min(8, Math.max(3, officerOpts.length))} className="input h-auto" defaultValue={values.memberIds ?? []}>
                  {officerOpts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label={t("patrol.notes")} htmlFor="pt-notes" className="sm:col-span-2">
              <textarea id="pt-notes" name="notes" className="input" rows={2} maxLength={2000} defaultValue={values.notes ?? ""} />
            </Field>
          </div>
          <SubmitButton pendingText={t("common.saving")}>{mode === "create" ? t("patrol.plan") : t("common.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function StartPatrolForm({ id, hasVehicle }: { id: string; hasVehicle: boolean }) {
  const t = useT();
  return (
    <ActionForm action={startPatrolAction} className="flex flex-wrap items-end gap-2">
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          {hasVehicle ? (
            <Field label={t("patrol.startKm")} htmlFor="pt-startkm" error={s.fieldErrors?.startKm}>
              <input id="pt-startkm" name="startKm" type="number" min={0} step={1} className="input w-32" />
            </Field>
          ) : null}
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("patrol.start")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function CompletePatrolForm({ id, hasVehicle }: { id: string; hasVehicle: boolean }) {
  const t = useT();
  return (
    <ActionForm action={completePatrolAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          {hasVehicle ? (
            <Field label={t("patrol.endKm")} htmlFor="pt-endkm" error={s.fieldErrors?.endKm}>
              <input id="pt-endkm" name="endKm" type="number" min={0} step={1} className="input w-32" />
            </Field>
          ) : null}
          <Field label={t("patrol.report")} htmlFor="pt-report" required error={s.fieldErrors?.report}>
            <textarea id="pt-report" name="report" className="input" rows={4} required minLength={10} maxLength={8000} />
          </Field>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("patrol.complete")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function CancelPatrolForm({ id }: { id: string }) {
  const t = useT();
  return (
    <ActionForm action={cancelPatrolAction} className="space-y-2">
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <Field label={t("patrol.cancelReason")} htmlFor="pt-cancel" required error={s.fieldErrors?.reason}>
            <input id="pt-cancel" name="reason" className="input" required minLength={5} maxLength={500} />
          </Field>
          <SubmitButton size="xs" variant="danger" pendingText={t("common.working")}>
            {t("patrol.cancel")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function AddMemberForm({ patrolId, officers }: { patrolId: string; officers: Opt[] }) {
  const t = useT();
  return (
    <ActionForm action={addPatrolOfficerAction} className="space-y-2">
      {(s) => (
        <>
          <input type="hidden" name="patrolId" value={patrolId} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={t("incident.officer")} htmlFor="pt-add-off" required error={s.fieldErrors?.officerId}>
              <Select id="pt-add-off" name="officerId" required placeholder="—" options={officers.map((o) => ({ value: o.id, label: o.label }))} />
            </Field>
            <Field label={t("patrol.role")} htmlFor="pt-add-role">
              <input id="pt-add-role" name="role" className="input" maxLength={60} placeholder="MEMBER" />
            </Field>
          </div>
          <SubmitButton size="xs" variant="secondary" pendingText={t("common.working")}>
            {t("patrol.addMember")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ZoneForm({ stations, zone }: { stations: Opt[]; zone?: { id: string; stationId: string; code: string; name: string; description: string | null; isActive: boolean } }) {
  const t = useT();
  return (
    <ActionForm action={upsertZoneAction} className="space-y-2">
      {(s) => (
        <>
          {zone ? <input type="hidden" name="id" value={zone.id} /> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {zone ? (
              <input type="hidden" name="stationId" value={zone.stationId} />
            ) : stations.length > 1 ? (
              <Field label={t("zone.station")} htmlFor="zn-station" required error={s.fieldErrors?.stationId}>
                <Select id="zn-station" name="stationId" required placeholder="—" options={stations.map((x) => ({ value: x.id, label: x.label }))} />
              </Field>
            ) : stations.length === 1 ? (
              <input type="hidden" name="stationId" value={stations[0].id} />
            ) : null}
            <Field label={t("zone.code")} htmlFor={`zn-code-${zone?.id ?? "new"}`} required error={s.fieldErrors?.code}>
              <input id={`zn-code-${zone?.id ?? "new"}`} name="code" className="input uppercase" required maxLength={20} pattern="[A-Za-z0-9_-]+" defaultValue={zone?.code ?? ""} />
            </Field>
            <Field label={t("zone.name")} htmlFor={`zn-name-${zone?.id ?? "new"}`} required error={s.fieldErrors?.name} className={zone || stations.length <= 1 ? "" : "sm:col-span-2"}>
              <input id={`zn-name-${zone?.id ?? "new"}`} name="name" className="input" required minLength={2} maxLength={120} defaultValue={zone?.name ?? ""} />
            </Field>
            <Field label={t("zone.description")} htmlFor={`zn-desc-${zone?.id ?? "new"}`} className="sm:col-span-2">
              <input id={`zn-desc-${zone?.id ?? "new"}`} name="description" className="input" maxLength={500} defaultValue={zone?.description ?? ""} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="hidden" name="isActive" value="0" />
            <input type="checkbox" name="isActive" defaultChecked={zone?.isActive ?? true} /> {t("zone.active")}
          </label>
          <SubmitButton size="xs" variant="secondary" pendingText={t("common.saving")}>
            {t("zone.save")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

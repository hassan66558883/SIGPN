"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { INCIDENT_STATUS, INCIDENT_TYPE, PARTY_ROLE, SEVERITY, labelOf, optionsOf } from "@/lib/labels";
import { PersonPicker } from "@/components/person-picker";
import { addIncidentOfficerAction, addIncidentPersonAction, createIncidentAction, escalateIncidentAction, incidentStatusAction, updateIncidentAction } from "@/server/ops/actions";

export type Opt = { id: string; label: string; stationId?: string };
export type IncidentValues = { id?: string; type?: string; severity?: string; title?: string; description?: string; occurredAt?: string; locationText?: string; latitude?: number | null; longitude?: number | null; stationId?: string | null; patrolId?: string | null };

export function IncidentForm({ mode, values = {}, stations, patrols }: { mode: "create" | "edit"; values?: IncidentValues; stations: Opt[]; patrols: Opt[] }) {
  const t = useT();
  const locale = useLocale();
  const [stationId, setStationId] = useState(values.stationId ?? (stations.length === 1 ? stations[0].id : ""));
  const patrolOpts = patrols.filter((p) => !stationId || !p.stationId || p.stationId === stationId);
  return (
    <ActionForm action={mode === "create" ? createIncidentAction : updateIncidentAction}>
      {(s) => (
        <>
          {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("incident.type")} htmlFor="inc-type" required>
              <Select id="inc-type" name="type" defaultValue={values.type ?? "OTHER"} options={optionsOf(INCIDENT_TYPE, locale)} />
            </Field>
            <Field label={t("incident.severity")} htmlFor="inc-sev" required hint={t("incident.severityHint")}>
              <Select id="inc-sev" name="severity" defaultValue={values.severity ?? "MEDIUM"} options={optionsOf(SEVERITY, locale)} />
            </Field>
            <Field label={t("incident.title")} htmlFor="inc-title" required error={s.fieldErrors?.title} className="sm:col-span-2">
              <input id="inc-title" name="title" className="input" required minLength={5} maxLength={200} defaultValue={values.title ?? ""} />
            </Field>
            <Field label={t("incident.description")} htmlFor="inc-desc" required error={s.fieldErrors?.description} className="sm:col-span-2">
              <textarea id="inc-desc" name="description" className="input" rows={5} required minLength={10} maxLength={8000} defaultValue={values.description ?? ""} />
            </Field>
            <Field label={t("incident.occurredAt")} htmlFor="inc-when" required error={s.fieldErrors?.occurredAt}>
              <input id="inc-when" name="occurredAt" type="datetime-local" className="input" required defaultValue={values.occurredAt ?? ""} />
            </Field>
            <Field label={t("incident.location")} htmlFor="inc-where" required error={s.fieldErrors?.locationText}>
              <input id="inc-where" name="locationText" className="input" required minLength={3} maxLength={300} defaultValue={values.locationText ?? ""} />
            </Field>
            <Field label={t("incident.latitude")} htmlFor="inc-lat" error={s.fieldErrors?.latitude}>
              <input id="inc-lat" name="latitude" type="number" step="any" min={-90} max={90} className="input" defaultValue={values.latitude ?? ""} />
            </Field>
            <Field label={t("incident.longitude")} htmlFor="inc-lng" error={s.fieldErrors?.longitude}>
              <input id="inc-lng" name="longitude" type="number" step="any" min={-180} max={180} className="input" defaultValue={values.longitude ?? ""} />
            </Field>
            {mode === "create" ? (
              <>
                {stations.length > 1 ? (
                  <Field label={t("incident.station")} htmlFor="inc-station" required error={s.fieldErrors?.stationId}>
                    <Select id="inc-station" name="stationId" required placeholder="—" value={stationId} onChange={(e) => setStationId(e.target.value)} options={stations.map((x) => ({ value: x.id, label: x.label }))} />
                  </Field>
                ) : stations.length === 1 ? (
                  <input type="hidden" name="stationId" value={stations[0].id} />
                ) : null}
                {patrolOpts.length ? (
                  <Field label={t("incident.patrol")} htmlFor="inc-patrol">
                    <Select id="inc-patrol" name="patrolId" defaultValue={values.patrolId ?? ""} placeholder={t("incident.noPatrol")} options={patrolOpts.map((p) => ({ value: p.id, label: p.label }))} />
                  </Field>
                ) : null}
              </>
            ) : null}
          </div>
          <SubmitButton pendingText={t("common.saving")}>{mode === "create" ? t("incident.report") : t("common.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function IncidentStatusForm({ id, next }: { id: string; next: ("RESPONDING" | "ON_SCENE" | "RESOLVED" | "CLOSED")[] }) {
  const t = useT();
  const locale = useLocale();
  const [status, setStatus] = useState<string>(next[0] ?? "");
  if (!next.length) return null;
  return (
    <ActionForm action={incidentStatusAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <Field label={t("incident.nextStatus")} htmlFor="inc-next" required>
            <Select id="inc-next" name="status" value={status} onChange={(e) => setStatus(e.target.value)} options={next.map((n) => ({ value: n, label: labelOf(INCIDENT_STATUS, n, locale).label }))} />
          </Field>
          {status === "RESOLVED" || status === "CLOSED" ? (
            <Field label={t("incident.interventionReport")} htmlFor="inc-report" required={status === "RESOLVED"} hint={status === "RESOLVED" ? t("incident.reportHint") : undefined} error={s.fieldErrors?.report}>
              <textarea id="inc-report" name="report" className="input" rows={4} minLength={status === "RESOLVED" ? 10 : undefined} maxLength={8000} required={status === "RESOLVED"} />
            </Field>
          ) : null}
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("incident.apply")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function EscalateForm({ id, users }: { id: string; users: Opt[] }) {
  const t = useT();
  return (
    <ActionForm action={escalateIncidentAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <p className="text-xs text-slate">{t("incident.escalateHint")}</p>
          <Field label={t("incident.escalateTitle")} htmlFor="esc-title" error={s.fieldErrors?.title}>
            <input id="esc-title" name="title" className="input" maxLength={200} />
          </Field>
          {users.length ? (
            <Field label={t("incident.escalateLead")} htmlFor="esc-lead">
              <Select id="esc-lead" name="leadId" placeholder="—" options={users.map((u) => ({ value: u.id, label: u.label }))} />
            </Field>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isSensitive" /> {t("complaint.sensitive")}
          </label>
          <SubmitButton size="sm" variant="danger" pendingText={t("common.working")}>
            {t("incident.escalate")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function AddOfficerForm({ incidentId, officers }: { incidentId: string; officers: Opt[] }) {
  const t = useT();
  return (
    <ActionForm action={addIncidentOfficerAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="incidentId" value={incidentId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("incident.officer")} htmlFor="inc-off" required error={s.fieldErrors?.officerId}>
              <Select id="inc-off" name="officerId" required placeholder="—" options={officers.map((o) => ({ value: o.id, label: o.label }))} />
            </Field>
            <Field label={t("incident.officerRole")} htmlFor="inc-off-role">
              <input id="inc-off-role" name="role" className="input" maxLength={60} />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("incident.addOfficer")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function AddIncidentPersonForm({ incidentId }: { incidentId: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={addIncidentPersonAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="incidentId" value={incidentId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <PersonPicker name="personId" label={t("persons.col.person")} required id="inc-person" error={s.fieldErrors?.personId} />
            <Field label={t("incident.personRole")} htmlFor="inc-person-role" required>
              <Select id="inc-person-role" name="role" defaultValue="WITNESS" options={optionsOf(PARTY_ROLE, locale)} />
            </Field>
            <Field label={t("case.partyNotes")} htmlFor="inc-person-notes" className="sm:col-span-2">
              <input id="inc-person-notes" name="notes" className="input" maxLength={1000} />
            </Field>
          </div>
          <p className="text-xs text-slate">{t("person.presumption")}</p>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("incident.addPerson")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

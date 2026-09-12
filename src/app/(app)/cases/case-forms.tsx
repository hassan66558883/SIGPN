"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { CASE_DISPOSITION, CASE_ROLE, CASE_STATUS, OFFENSE_CATEGORY, PARTY_ROLE, PARTY_STATUS, PRIORITY, TASK_STATUS, optionsOf } from "@/lib/labels";
import { PersonPicker } from "@/components/person-picker";
import { addNoteAction, addPartyAction, assignCaseAction, changeCaseStatusAction, createCaseAction, createTaskAction, setPartyStatusAction, setTaskStatusAction } from "@/server/cases/actions";

type Station = { id: string; code: string; name: string };
type Dept = { id: string; code: string; name: string; stationId: string };
type UserOpt = { id: string; label: string };

export function CaseCreateForm({ stations, departments, users, canSensitive, defaultStationId }: { stations: Station[]; departments: Dept[]; users: UserOpt[]; canSensitive: boolean; defaultStationId?: string | null }) {
  const t = useT();
  const locale = useLocale();
  const [stationId, setStationId] = useState(defaultStationId ?? (stations.length === 1 ? stations[0].id : ""));
  const depts = departments.filter((d) => d.stationId === stationId);
  return (
    <ActionForm action={createCaseAction}>
      {(s) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("case.title")} htmlFor="cs-title" required error={s.fieldErrors?.title} className="sm:col-span-2">
              <input id="cs-title" name="title" className="input" required minLength={5} maxLength={200} />
            </Field>
            <Field label={t("case.category")} htmlFor="cs-cat" required>
              <Select id="cs-cat" name="category" defaultValue="OTHER" options={optionsOf(OFFENSE_CATEGORY, locale)} />
            </Field>
            <Field label={t("case.priority")} htmlFor="cs-prio" required>
              <Select id="cs-prio" name="priority" defaultValue="NORMAL" options={optionsOf(PRIORITY, locale)} />
            </Field>
            <Field label={t("case.description")} htmlFor="cs-desc" required error={s.fieldErrors?.description} className="sm:col-span-2">
              <textarea id="cs-desc" name="description" className="input" rows={6} required minLength={20} maxLength={8000} />
            </Field>
            <Field label={t("case.occurredAt")} htmlFor="cs-when" error={s.fieldErrors?.occurredAt}>
              <input id="cs-when" name="occurredAt" type="datetime-local" className="input" />
            </Field>
            <Field label={t("case.location")} htmlFor="cs-where">
              <input id="cs-where" name="locationText" className="input" maxLength={300} />
            </Field>
            <Field label={t("case.station")} htmlFor="cs-station" required error={s.fieldErrors?.stationId}>
              <Select id="cs-station" name="stationId" required placeholder={stations.length > 1 ? "—" : undefined} value={stationId} onChange={(e) => setStationId(e.target.value)} options={stations.map((x) => ({ value: x.id, label: `${x.code} · ${x.name}` }))} />
            </Field>
            <Field label={t("case.department")} htmlFor="cs-dept">
              <Select id="cs-dept" name="departmentId" placeholder="—" options={depts.map((d) => ({ value: d.id, label: d.name }))} />
            </Field>
            <Field label={t("case.lead")} htmlFor="cs-lead">
              <Select id="cs-lead" name="leadId" placeholder="—" options={users.map((u) => ({ value: u.id, label: u.label }))} />
            </Field>
            {canSensitive ? (
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" name="isSensitive" /> {t("case.isSensitive")}
              </label>
            ) : null}
          </div>
          <SubmitButton pendingText={t("common.saving")}>{t("case.open")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function AssignCaseForm({ caseId, users }: { caseId: string; users: UserOpt[] }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={assignCaseAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="caseId" value={caseId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("case.assignUser")} htmlFor="ca-user" required error={s.fieldErrors?.userId}>
              <Select id="ca-user" name="userId" required placeholder="—" options={users.map((u) => ({ value: u.id, label: u.label }))} />
            </Field>
            <Field label={t("case.assignRole")} htmlFor="ca-role" required>
              <Select id="ca-role" name="role" defaultValue="INVESTIGATOR" options={optionsOf(CASE_ROLE, locale)} />
            </Field>
            <Field label={t("person.notes")} htmlFor="ca-notes" className="sm:col-span-2">
              <input id="ca-notes" name="notes" className="input" maxLength={300} />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("case.assign")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function AddPartyForm({ caseId }: { caseId: string }) {
  const t = useT();
  const locale = useLocale();
  const [role, setRole] = useState("WITNESS");
  return (
    <ActionForm action={addPartyAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="caseId" value={caseId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <PersonPicker name="personId" label={t("persons.col.person")} required id="party-person" error={s.fieldErrors?.personId} />
            <Field label={t("case.partyRole")} htmlFor="party-role" required>
              <Select id="party-role" name="role" value={role} onChange={(e) => setRole(e.target.value)} options={optionsOf(PARTY_ROLE, locale)} />
            </Field>
            {role === "VICTIM" ? (
              <Field label={t("case.injuries")} htmlFor="party-inj">
                <input id="party-inj" name="injuries" className="input" maxLength={500} />
              </Field>
            ) : null}
            <Field label={t("case.partyNotes")} htmlFor="party-notes" className="sm:col-span-2">
              <input id="party-notes" name="notes" className="input" maxLength={1000} />
            </Field>
          </div>
          <p className="text-xs text-slate">{t("person.presumption")}</p>
          <SubmitButton size="sm" pendingText={t("common.working")}>
            {t("case.addParty")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function PartyStatusForm({ partyId, current }: { partyId: string; current: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={setPartyStatusAction} className="flex flex-wrap items-end gap-2">
      {() => (
        <>
          <input type="hidden" name="id" value={partyId} />
          <Select name="status" defaultValue={current} options={optionsOf(PARTY_STATUS, locale)} aria-label={t("case.partyStatus")} className="w-auto" />
          <input name="notes" className="input w-auto" maxLength={500} placeholder={t("case.partyNotes")} />
          <SubmitButton size="xs" variant="secondary" pendingText={t("common.working")}>
            {t("common.save")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function NoteForm({ caseId }: { caseId: string }) {
  const t = useT();
  return (
    <ActionForm action={addNoteAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="caseId" value={caseId} />
          <Field label={t("case.addNote")} htmlFor="note-content" required error={s.fieldErrors?.content}>
            <textarea id="note-content" name="content" className="input" rows={3} required minLength={3} maxLength={5000} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isConfidential" /> {t("case.noteConfidential")}
          </label>
          <SubmitButton size="sm" pendingText={t("common.saving")}>
            {t("case.addNote")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function TaskForm({ caseId, users }: { caseId: string; users: UserOpt[] }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={createTaskAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="caseId" value={caseId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("case.taskTitle")} htmlFor="task-title" required error={s.fieldErrors?.title} className="sm:col-span-2">
              <input id="task-title" name="title" className="input" required minLength={3} maxLength={200} />
            </Field>
            <Field label={t("case.description")} htmlFor="task-desc" className="sm:col-span-2">
              <textarea id="task-desc" name="description" className="input" rows={2} maxLength={2000} />
            </Field>
            <Field label={t("case.taskAssignee")} htmlFor="task-user">
              <Select id="task-user" name="assignedToId" placeholder="—" options={users.map((u) => ({ value: u.id, label: u.label }))} />
            </Field>
            <Field label={t("case.priority")} htmlFor="task-prio">
              <Select id="task-prio" name="priority" defaultValue="NORMAL" options={optionsOf(PRIORITY, locale)} />
            </Field>
            <Field label={t("case.taskDue")} htmlFor="task-due">
              <input id="task-due" name="dueAt" type="datetime-local" className="input" />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText={t("common.saving")}>
            {t("case.addTask")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function TaskStatusForm({ taskId, current }: { taskId: string; current: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={setTaskStatusAction} className="flex flex-wrap items-end gap-2">
      {() => (
        <>
          <input type="hidden" name="id" value={taskId} />
          <Select name="status" defaultValue={current} options={optionsOf(TASK_STATUS, locale)} aria-label={t("case.status")} className="w-auto" />
          <input name="result" className="input w-auto" maxLength={2000} placeholder={t("case.taskResult")} />
          <SubmitButton size="xs" variant="secondary" pendingText={t("common.working")}>
            {t("common.save")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function CaseStatusForm({ caseId, current, canClose, canArchive }: { caseId: string; current: string; canClose: boolean; canArchive: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [status, setStatus] = useState("");
  const options = optionsOf(CASE_STATUS, locale).filter((o) => {
    if (o.value === "OPEN" || o.value === "ASSIGNED") return false;
    if ((o.value === "CLOSED" || o.value === "REFERRED") && !canClose) return false;
    if (o.value === "ARCHIVED" && (!canArchive || current !== "CLOSED")) return false;
    if (current === "CLOSED" && o.value !== "ARCHIVED") return false;
    return o.value !== current;
  });
  if (options.length === 0) return null;
  return (
    <ActionForm action={changeCaseStatusAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="caseId" value={caseId} />
          <Field label={t("case.newStatus")} htmlFor="cst-status" required>
            <Select id="cst-status" name="status" required placeholder="—" value={status} onChange={(e) => setStatus(e.target.value)} options={options} />
          </Field>
          {status === "CLOSED" ? (
            <Field label={t("case.disposition")} htmlFor="cst-disp" required error={s.fieldErrors?.disposition}>
              <Select id="cst-disp" name="disposition" required placeholder="—" options={optionsOf(CASE_DISPOSITION, locale)} />
            </Field>
          ) : null}
          <Field label={t("case.dispositionNotes")} htmlFor="cst-notes">
            <textarea id="cst-notes" name="notes" className="input" rows={2} maxLength={2000} />
          </Field>
          <SubmitButton size="sm" variant={status === "CLOSED" ? "success" : "primary"} pendingText={t("common.working")}>
            {t("case.changeStatus")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

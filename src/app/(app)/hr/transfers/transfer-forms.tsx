"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import { cancelTransferAction, executeTransferAction, proposeTransferAction, reviewTransferAction, validateTransferAction } from "@/server/hr/transfer-actions";

type Opt = { value: string; label: string };

export function ProposeTransferForm({ officerId, stations, departments, positions }: { officerId: string; stations: Opt[]; departments: (Opt & { stationId: string })[]; positions: Opt[] }) {
  const t = useT();
  const [station, setStation] = useState("");
  return (
    <ActionForm action={proposeTransferAction}>
      {(s) => (
        <>
          <input type="hidden" name="officerId" value={officerId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("hr.transfers.to")} htmlFor="t-st" required error={s.fieldErrors?.toStationId}>
              <Select id="t-st" name="toStationId" value={station} onChange={(e) => setStation(e.target.value)} placeholder={t("hr.transfers.chooseStation")} options={stations} />
            </Field>
            <Field label={t("hr.transfers.toDepartment")} htmlFor="t-dep" error={s.fieldErrors?.toDepartmentId}>
              <Select id="t-dep" name="toDepartmentId" placeholder={t("hr.transfers.chooseDept")} options={departments.filter((d) => d.stationId === station)} />
            </Field>
            <Field label={t("hr.transfers.toPosition")} htmlFor="t-pos" error={s.fieldErrors?.toPositionId}>
              <Select id="t-pos" name="toPositionId" placeholder={t("hr.transfers.chooseDept")} options={positions} />
            </Field>
            <Field label={t("hr.transfers.effectiveDate")} htmlFor="t-date" required error={s.fieldErrors?.effectiveDate}>
              <input id="t-date" name="effectiveDate" type="date" className="input" required />
            </Field>
          </div>
          <Field label={t("hr.transfers.reason")} htmlFor="t-reason" required error={s.fieldErrors?.reason}>
            <textarea id="t-reason" name="reason" rows={3} className="input" required maxLength={1000} />
          </Field>
          <SubmitButton pendingText={t("hr.transfers.sending")}>{t("hr.transfers.send")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

/** Approve/reject form used for both the HR examination and the authority validation. */
export function DecisionForm({ id, kind }: { id: string; kind: "review" | "validate" }) {
  const t = useT();
  return (
    <ActionForm action={kind === "review" ? reviewTransferAction : validateTransferAction}>
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <Field label={t("hr.transfers.note")} htmlFor={`n-${kind}`} hint={t("hr.transfers.noteHint")} error={s.fieldErrors?.note}>
            <textarea id={`n-${kind}`} name="note" rows={2} className="input" maxLength={1000} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <SubmitButton size="sm" name="decision" value="APPROVE" pendingText={t("hr.transfers.sending")}>
              {t("hr.transfers.approve")}
            </SubmitButton>
            <SubmitButton size="sm" variant="danger" name="decision" value="REJECT" pendingText={t("hr.transfers.sending")}>
              {t("hr.transfers.reject")}
            </SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function ExecuteForm({ id }: { id: string }) {
  const t = useT();
  return (
    <ActionForm action={executeTransferAction}>
      {() => (
        <>
          <input type="hidden" name="id" value={id} />
          <SubmitButton size="sm" pendingText={t("hr.transfers.sending")}>
            {t("hr.transfers.execute")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function CancelForm({ id }: { id: string }) {
  const t = useT();
  return (
    <ActionForm action={cancelTransferAction}>
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <Field label={t("hr.transfers.cancelReason")} htmlFor="c-reason" required error={s.fieldErrors?.reason}>
            <input id="c-reason" name="reason" className="input" required minLength={5} maxLength={500} />
          </Field>
          <SubmitButton size="sm" variant="secondary" pendingText={t("hr.transfers.sending")}>
            {t("hr.transfers.cancel")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

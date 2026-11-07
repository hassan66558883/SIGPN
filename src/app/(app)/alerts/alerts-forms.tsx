"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import { acknowledgeAlertAction, markAlertReadAction, publishSimulationAction, remindAlertAction, setUnitOfflineAction } from "@/server/alerts/actions";

export function ReceiptButtons({ id, status, canAck }: { id: string; status: string; canAck: boolean }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-start gap-2">
      {status !== "READ" && status !== "ACKNOWLEDGED" ? (
        <ActionForm action={markAlertReadAction}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton size="sm" variant="secondary">{t("alerts.read")}</SubmitButton>
        </ActionForm>
      ) : null}
      {canAck && status !== "ACKNOWLEDGED" ? (
        <ActionForm action={acknowledgeAlertAction}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton size="sm">{t("alerts.ack")}</SubmitButton>
        </ActionForm>
      ) : null}
    </div>
  );
}

export function RemindButton({ id }: { id: string }) {
  const t = useT();
  return (
    <ActionForm action={remindAlertAction}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="secondary">{t("sup.remind")}</SubmitButton>
    </ActionForm>
  );
}

export function UnitOfflineButton({ id, offline }: { id: string; offline: boolean }) {
  const t = useT();
  return (
    <ActionForm action={setUnitOfflineAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="offline" value={offline ? "false" : "true"} />
      <SubmitButton size="xs" variant={offline ? "success" : "warning"}>{offline ? t("sup.simGoOnline") : t("sup.simGoOffline")}</SubmitButton>
    </ActionForm>
  );
}

export function SimulationForm({ units }: { units: { id: string; label: string }[] }) {
  const t = useT();
  return (
    <ActionForm action={publishSimulationAction} className="flex flex-wrap items-end gap-3">
      <Field label={t("sup.simTitleField")} htmlFor="sim-title">
        <input id="sim-title" name="title" className="input" required minLength={3} maxLength={120} defaultValue="Exercice de diffusion" />
      </Field>
      <Field label={t("alerts.unit")} htmlFor="sim-unit">
        <Select id="sim-unit" name="stationId" required options={units.map((u) => ({ value: u.id, label: u.label }))} />
      </Field>
      <SubmitButton size="sm">{t("sup.simPublish")}</SubmitButton>
    </ActionForm>
  );
}

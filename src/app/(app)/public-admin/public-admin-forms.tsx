"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n";
import { convertSubmissionAction, saveNewsAction, saveStationPublicAction, setNewsPublishedAction, updateSubmissionAction } from "@/server/public/actions";

const STATUSES = ["RECEIVED", "IN_REVIEW", "FORWARDED", "CLOSED", "REJECTED"] as const;

export function SubmissionForm({ id, status, reply }: { id: string; status: string; reply: string | null }) {
  const t = useT();
  return (
    <ActionForm action={updateSubmissionAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <Field label={t("pa.status")} htmlFor="pa-status">
            <Select id="pa-status" name="status" defaultValue={status} options={STATUSES.map((v) => ({ value: v, label: t(`pub.status.${v}` as MessageKey) }))} />
          </Field>
          <Field label={t("pa.reply")} htmlFor="pa-reply" error={s.fieldErrors?.publicReply}>
            <textarea id="pa-reply" name="publicReply" className="input" rows={4} maxLength={1500} defaultValue={reply ?? ""} />
          </Field>
          <SubmitButton size="sm">{t("pa.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ConvertForm({ id, stations, defaultStation }: { id: string; stations: { id: string; label: string }[]; defaultStation: string | null }) {
  const t = useT();
  return (
    <ActionForm action={convertSubmissionAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={id} />
      <Field label={t("pa.convertUnit")} htmlFor="pa-unit">
        <Select id="pa-unit" name="stationId" defaultValue={defaultStation ?? ""} placeholder="—" options={stations.map((s) => ({ value: s.id, label: s.label }))} />
      </Field>
      <SubmitButton size="sm" variant="secondary">{t("pa.convert")}</SubmitButton>
    </ActionForm>
  );
}

export function NewsForm({ item }: { item?: { id: string; title: string; summary: string; body: string } }) {
  const t = useT();
  return (
    <ActionForm action={saveNewsAction} className="space-y-3">
      {(s) => (
        <>
          {item ? <input type="hidden" name="id" value={item.id} /> : null}
          <Field label={t("pa.news.title")} htmlFor={`nw-t-${item?.id ?? "new"}`} error={s.fieldErrors?.title}>
            <input id={`nw-t-${item?.id ?? "new"}`} name="title" className="input" required minLength={5} maxLength={160} defaultValue={item?.title} />
          </Field>
          <Field label={t("pa.news.summary")} htmlFor={`nw-s-${item?.id ?? "new"}`} error={s.fieldErrors?.summary}>
            <input id={`nw-s-${item?.id ?? "new"}`} name="summary" className="input" required minLength={10} maxLength={300} defaultValue={item?.summary} />
          </Field>
          <Field label={t("pa.news.body")} htmlFor={`nw-b-${item?.id ?? "new"}`} error={s.fieldErrors?.body}>
            <textarea id={`nw-b-${item?.id ?? "new"}`} name="body" className="input" rows={5} required minLength={20} maxLength={8000} defaultValue={item?.body} />
          </Field>
          <SubmitButton size="sm">{t("pa.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function NewsToggle({ id, published }: { id: string; published: boolean }) {
  const t = useT();
  return (
    <ActionForm action={setNewsPublishedAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="published" value={published ? "false" : "true"} />
      <SubmitButton size="xs" variant={published ? "secondary" : "success"}>{published ? t("pa.news.unpublish") : t("pa.news.publish")}</SubmitButton>
    </ActionForm>
  );
}

export function StationPublicForm({ s }: { s: { id: string; publicVisible: boolean; publicAddress: string | null; publicPhone: string | null; publicHours: string | null; verifiedAt: string | null } }) {
  const t = useT();
  return (
    <ActionForm action={saveStationPublicAction} className="grid gap-3 sm:grid-cols-3">
      {(st) => (
        <>
          <input type="hidden" name="id" value={s.id} />
          <Field label={t("pa.dir.address")} htmlFor={`sd-a-${s.id}`}>
            <input id={`sd-a-${s.id}`} name="publicAddress" className="input" maxLength={200} defaultValue={s.publicAddress ?? ""} />
          </Field>
          <Field label={t("pa.dir.phone")} htmlFor={`sd-p-${s.id}`}>
            <input id={`sd-p-${s.id}`} name="publicPhone" className="input" maxLength={40} defaultValue={s.publicPhone ?? ""} />
          </Field>
          <Field label={t("pa.dir.hours")} htmlFor={`sd-h-${s.id}`}>
            <input id={`sd-h-${s.id}`} name="publicHours" className="input" maxLength={120} defaultValue={s.publicHours ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="publicVisible" defaultChecked={s.publicVisible} />{t("pa.dir.visible")}</label>
          <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2"><input type="checkbox" name="verified" />{t("pa.dir.verified")}</label>
          {st.message && !st.ok ? <p role="alert" className="text-xs font-semibold text-danger sm:col-span-3">{st.message}</p> : null}
          <div className="sm:col-span-3"><SubmitButton size="xs">{t("pa.save")}</SubmitButton></div>
        </>
      )}
    </ActionForm>
  );
}

"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useLocale, useT } from "@/components/i18n-provider";
import { HR_DOCUMENT_KIND, labelOf } from "@/lib/labels";
import { issueDocumentAction, uploadDocumentAction, uploadPhotoAction } from "@/server/hr/discipline-actions";

/** One-click issue of a document tied to an officer (work certificate, assignment decision). */
export function IssueForOfficerForm({ officerId, kind }: { officerId: string; kind: "WORK_CERTIFICATE" | "ASSIGNMENT_DECISION" }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={issueDocumentAction} className="inline">
      {() => (
        <>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="officerId" value={officerId} />
          <SubmitButton size="xs" variant="secondary" pendingText="…">
            {t("hr.doc.issue")} · {labelOf(HR_DOCUMENT_KIND, kind, locale).label}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function IssueFromRecordForm({ kind, field, id }: { kind: "APPOINTMENT_ORDER" | "TRANSFER_DECISION" | "TRAINING_DOCUMENT" | "DISCIPLINARY_DOCUMENT"; field: "careerEventId" | "transferId" | "trainingId" | "caseId"; id: string }) {
  const t = useT();
  return (
    <ActionForm action={issueDocumentAction} className="inline">
      {() => (
        <>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name={field} value={id} />
          <SubmitButton size="xs" variant="secondary" pendingText="…">
            {t("hr.doc.issue")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ServiceNoteForm() {
  const t = useT();
  return (
    <ActionForm action={issueDocumentAction}>
      {(s) => (
        <>
          <input type="hidden" name="kind" value="SERVICE_NOTE" />
          <Field label={t("hr.doc.title")} htmlFor="n-title" required error={s.fieldErrors?.title}>
            <input id="n-title" name="title" className="input" required minLength={3} maxLength={200} />
          </Field>
          <Field label={t("hr.doc.body")} htmlFor="n-body" required hint={t("hr.doc.bodyHint")} error={s.fieldErrors?.body}>
            <textarea id="n-body" name="body" rows={5} className="input" required minLength={10} maxLength={8000} />
          </Field>
          <SubmitButton size="sm" pendingText={t("hr.saving")}>
            {t("hr.doc.generate")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function UploadForm({ officerId, canDiscipline }: { officerId?: string; canDiscipline: boolean }) {
  const t = useT();
  const locale = useLocale();
  const kinds = ["ADMIN_FILE", "TRAINING_DOCUMENT", ...(canDiscipline ? ["DISCIPLINARY_DOCUMENT"] : [])];
  return (
    <ActionForm action={uploadDocumentAction}>
      {(s) => (
        <>
          {officerId ? <input type="hidden" name="officerId" value={officerId} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("hr.leave.type")} htmlFor="u-kind">
              <Select id="u-kind" name="kind" defaultValue="ADMIN_FILE" options={kinds.map((k) => ({ value: k, label: labelOf(HR_DOCUMENT_KIND, k, locale).label }))} />
            </Field>
            <Field label={t("hr.doc.title")} htmlFor="u-title" required error={s.fieldErrors?.title}>
              <input id="u-title" name="title" className="input" required minLength={3} maxLength={200} />
            </Field>
          </div>
          <Field label={t("hr.doc.file")} htmlFor="u-file" hint={t("hr.doc.fileHint")} required error={s.fieldErrors?.file}>
            <input id="u-file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" className="input" required />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="confidential" /> {t("hr.doc.confidential")}
          </label>
          <SubmitButton size="sm" pendingText={t("hr.saving")}>
            {t("hr.doc.upload")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function PhotoForm({ officerId }: { officerId: string }) {
  const t = useT();
  return (
    <ActionForm action={uploadPhotoAction} className="space-y-2">
      {() => (
        <>
          <input type="hidden" name="officerId" value={officerId} />
          <input name="file" type="file" accept=".png,.jpg,.jpeg" className="input text-xs" required aria-label={t("hr.doc.photo")} />
          <SubmitButton size="xs" variant="secondary" pendingText="…">
            {t("hr.doc.photo")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

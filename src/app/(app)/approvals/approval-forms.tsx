"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import { cancelApprovalAction, decideApprovalAction } from "@/server/approvals/actions";

export function ApprovalDecisionForm({ id }: { id: string }) {
  const t = useT();
  return (
    <ActionForm action={decideApprovalAction} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <Field label={t("approvals.decision")} htmlFor={`vote-${id}`} required>
            <Select id={`vote-${id}`} name="vote" required defaultValue="APPROVE" options={[{ value: "APPROVE", label: t("approvals.approve") }, { value: "REJECT", label: t("approvals.reject") }]} />
          </Field>
          <Field label={t("approvals.comment")} htmlFor={`comment-${id}`} hint={t("approvals.commentHint")} error={s.fieldErrors?.comment}>
            <textarea id={`comment-${id}`} name="comment" className="input" rows={2} maxLength={1000} />
          </Field>
          <SubmitButton pendingText={t("common.saving")}>{t("approvals.submit")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function CancelApprovalForm({ id }: { id: string }) {
  const t = useT();
  return (
    <ActionForm action={cancelApprovalAction}>
      {() => (
        <>
          <input type="hidden" name="id" value={id} />
          <SubmitButton pendingText={t("common.saving")}>{t("approvals.cancel")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

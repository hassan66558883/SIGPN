"use client";

import { useActionState } from "react";
import { issueResetAction } from "@/server/admin/actions";
import type { FormState } from "@/components/forms";
import { SubmitButton } from "@/components/forms";
import { Alert, Code } from "@/components/ui";
import { useMessageTranslator, useT } from "@/components/i18n-provider";

type S = FormState & { resetUrl?: string; expiresAt?: string };

export function IssueResetButton({ userId }: { userId: string }) {
  const [state, action] = useActionState<S, FormData>(issueResetAction, {});
  const t = useT();
  const tm = useMessageTranslator();
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={userId} />
      <SubmitButton variant="secondary" size="sm" pendingText={t("user.issuing")}>
        {t("user.issueReset")}
      </SubmitButton>
      {state.error ? <Alert tone="danger">{tm(state.error)}</Alert> : null}
      {state.ok && state.resetUrl ? (
        <Alert tone="warning" title={t("user.resetLinkTitle")}>
          <Code className="block bg-white p-2">{state.resetUrl}</Code>
          <p className="mt-1 text-xs">{t("user.resetExpires", { when: state.expiresAt ? new Date(state.expiresAt).toLocaleString() : "" })}</p>
        </Alert>
      ) : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { createApiKeyAction } from "@/server/auth/actions";
import type { FormState } from "@/components/forms";
import { SubmitButton } from "@/components/forms";
import { Alert, Code, Field } from "@/components/ui";
import { useMessageTranslator, useT } from "@/components/i18n-provider";

type S = FormState & { apiKey?: string };

export function ApiKeyForm() {
  const [state, action] = useActionState<S, FormData>(createApiKeyAction, {});
  const t = useT();
  const tm = useMessageTranslator();
  return (
    <form action={action} className="space-y-3 rounded-md border border-dashed border-line p-3">
      {state.error ? <Alert tone="danger">{tm(state.error)}</Alert> : null}
      {state.ok && state.apiKey ? (
        <Alert tone="success" title={t("apikey.createdTitle")}>
          <Code className="block bg-white p-2">{state.apiKey}</Code>
        </Alert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
        <Field label={t("apikey.name")} htmlFor="apikey-name" required>
          <input id="apikey-name" name="name" className="input" required maxLength={80} placeholder={t("apikey.namePlaceholder")} />
        </Field>
        <Field label={t("apikey.expiresIn")} htmlFor="apikey-exp" hint={t("apikey.expiresHint")}>
          <input id="apikey-exp" name="expiresInDays" type="number" min={0} max={730} defaultValue={90} className="input" />
        </Field>
        <SubmitButton variant="secondary" pendingText={t("common.creating")}>
          {t("apikey.create")}
        </SubmitButton>
      </div>
    </form>
  );
}

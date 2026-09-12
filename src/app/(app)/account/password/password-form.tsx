"use client";

import type { ReactNode } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field } from "@/components/ui";
import { changePasswordAction } from "@/server/auth/actions";
import { useT } from "@/components/i18n-provider";

export function PasswordForm({ minLength, forced, rules }: { minLength: number; forced: boolean; rules: ReactNode }) {
  const t = useT();
  return (
    <ActionForm action={changePasswordAction}>
      {(state) => (
        <>
          <Field label={t("pwdPage.current")} htmlFor="currentPassword" required>
            <input id="currentPassword" name="currentPassword" type="password" className="input" autoComplete="current-password" required maxLength={200} />
          </Field>
          <Field label={t("pwdPage.new")} htmlFor="newPassword" required error={state.fieldErrors?.newPassword}>
            <input id="newPassword" name="newPassword" type="password" className="input" autoComplete="new-password" required minLength={minLength} maxLength={128} />
          </Field>
          <Field label={t("pwdPage.confirm")} htmlFor="confirmPassword" required error={state.fieldErrors?.confirmPassword}>
            <input id="confirmPassword" name="confirmPassword" type="password" className="input" autoComplete="new-password" required minLength={minLength} maxLength={128} />
          </Field>
          {rules}
          <SubmitButton pendingText={t("common.saving")}>{t("pwdPage.submit")}</SubmitButton>
          {state.ok && forced ? (
            <p className="text-sm">
              <a href="/dashboard" className="font-semibold text-blue hover:underline">
                {t("common.continueDashboard")}
              </a>
            </p>
          ) : null}
        </>
      )}
    </ActionForm>
  );
}

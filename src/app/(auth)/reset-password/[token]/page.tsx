import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field } from "@/components/ui";
import { resetPasswordAction } from "@/server/auth/actions";
import { PasswordRules } from "@/components/password-rules";
import { getT } from "@/server/i18n";
import { env } from "@/server/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("reset.title") };
}

export default async function ResetPasswordPage({ params }: PageProps<"/reset-password/[token]">) {
  const [{ token }, t] = await Promise.all([params, getT()]);
  const min = env.password.minLength;
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">{t("reset.title")}</h1>
      <p className="mt-1 text-sm text-slate">{t("reset.subtitle")}</p>
      <ActionForm action={resetPasswordAction} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field label={t("reset.new")} htmlFor="newPassword" required>
          <input id="newPassword" name="newPassword" type="password" className="input" autoComplete="new-password" required minLength={min} maxLength={128} />
        </Field>
        <Field label={t("reset.confirm")} htmlFor="confirmPassword" required>
          <input id="confirmPassword" name="confirmPassword" type="password" className="input" autoComplete="new-password" required minLength={min} maxLength={128} />
        </Field>
        <PasswordRules minLength={min} />
        <SubmitButton className="w-full" pendingText={t("common.saving")}>
          {t("reset.submit")}
        </SubmitButton>
      </ActionForm>
    </div>
  );
}

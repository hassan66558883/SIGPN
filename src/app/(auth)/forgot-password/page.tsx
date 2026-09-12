import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field } from "@/components/ui";
import { forgotPasswordAction } from "@/server/auth/actions";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("forgot.title") };
}

export default async function ForgotPasswordPage() {
  const t = await getT();
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">{t("forgot.title")}</h1>
      <p className="mt-1 text-sm text-slate">{t("forgot.subtitle")}</p>
      <ActionForm action={forgotPasswordAction} className="mt-6 space-y-4">
        <Field label={t("login.identifier")} htmlFor="identifier" required>
          <input id="identifier" name="identifier" className="input" autoComplete="username" required maxLength={120} />
        </Field>
        <SubmitButton className="w-full" pendingText={t("forgot.pending")}>
          {t("forgot.submit")}
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-xs text-slate">
        <Link href="/login" className="font-semibold text-blue hover:underline">
          {t("login.backToSignIn")}
        </Link>
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMfaToken } from "@/server/auth/session";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field } from "@/components/ui";
import { verifyMfaAction } from "@/server/auth/actions";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("mfaLogin.title") };
}

export default async function MfaPage({ searchParams }: PageProps<"/login/mfa">) {
  const challenge = await getMfaToken();
  if (!challenge) redirect("/login");
  const [params, t] = await Promise.all([searchParams, getT()]);
  const next = typeof params.next === "string" ? params.next : "/dashboard";
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">{t("mfaLogin.title")}</h1>
      <p className="mt-1 text-sm text-slate">{t("mfaLogin.subtitle")}</p>
      <ActionForm action={verifyMfaAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label={t("mfaLogin.code")} htmlFor="code" required>
          <input id="code" name="code" className="input font-mono text-lg tracking-widest" inputMode="numeric" autoComplete="one-time-code" autoFocus required maxLength={12} placeholder="123 456" />
        </Field>
        <SubmitButton className="w-full" pendingText={t("mfaLogin.verifying")}>
          {t("mfaLogin.verify")}
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

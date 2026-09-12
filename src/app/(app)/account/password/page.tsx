import type { Metadata } from "next";
import { requireActor } from "@/server/auth/dal";
import { Alert, Card, PageHeader } from "@/components/ui";
import { PasswordRules } from "@/components/password-rules";
import { env } from "@/server/env";
import { getT } from "@/server/i18n";
import { PasswordForm } from "./password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("pwdPage.title") };
}

export default async function PasswordPage({ searchParams }: PageProps<"/account/password">) {
  const actor = await requireActor({ allowPending: true });
  const [params, t] = await Promise.all([searchParams, getT()]);
  const forced = params.forced === "1" || actor.mustChangePassword;
  const min = env.password.minLength;
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow={t("account.eyebrow")} title={t("pwdPage.title")} breadcrumbs={[{ href: "/account", label: t("account.title") }, { label: t("pwdPage.crumb") }]} />
      {forced ? (
        <Alert tone="warning" className="mb-4" title={t("pwdPage.forcedTitle")}>
          {t("pwdPage.forcedBody")}
        </Alert>
      ) : null}
      <Card>
        <PasswordForm minLength={min} forced={forced} rules={<PasswordRules minLength={min} />} />
      </Card>
    </div>
  );
}

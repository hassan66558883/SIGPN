import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/server/auth/dal";
import { Alert } from "@/components/ui";
import { LoginForm } from "./login-form";
import { env } from "@/server/env";
import { DEMO_ACCOUNTS } from "@/server/demo/accounts";
import { getLocale, getT } from "@/server/i18n";
import { roleName } from "@/lib/i18n/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("login.title") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [actor, params, t, locale] = await Promise.all([getActor(), searchParams, getT(), getLocale()]);
  if (actor && params.mfa !== "1") redirect("/dashboard");
  const next = typeof params.next === "string" ? params.next : "/dashboard";
  const showDemo = !env.isProduction;
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">{t("login.title")}</h1>
      <p className="mt-1 text-sm text-slate">{t("login.subtitle")}</p>
      {params.loggedOut === "1" ? (
        <Alert tone="success" className="mt-4">
          {t("login.loggedOut")}
        </Alert>
      ) : null}
      {params.reset === "1" ? (
        <Alert tone="success" className="mt-4">
          {t("login.resetDone")}
        </Alert>
      ) : null}
      {params.mfa === "1" ? (
        <Alert tone="warning" className="mt-4">
          {t("login.mfaAgain")}
        </Alert>
      ) : null}
      <LoginForm next={next} demo={showDemo ? { accounts: DEMO_ACCOUNTS.map((a) => ({ username: a.username, role: roleName(a.roleCode, a.roleName, locale), hint: a.hint })), password: env.demoPassword } : null} />
      <p className="mt-6 text-center text-xs text-slate">
        <Link href="/forgot-password" className="font-semibold text-blue hover:underline">
          {t("login.forgot")}
        </Link>
      </p>
    </div>
  );
}

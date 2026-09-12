import { getT } from "@/server/i18n";

export async function PasswordRules({ minLength = 12 }: { minLength?: number }) {
  const t = await getT();
  return (
    <ul className="rounded-md bg-mist px-3 py-2 text-xs text-slate">
      <li>{t("pwd.rule1", { n: minLength })}</li>
      <li>{t("pwd.rule2")}</li>
      <li>{t("pwd.rule3")}</li>
    </ul>
  );
}

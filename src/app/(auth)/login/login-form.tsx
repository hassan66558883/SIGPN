"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/server/auth/actions";
import type { FormState } from "@/components/forms";
import { SubmitButton } from "@/components/forms";
import { Alert, Field } from "@/components/ui";
import { useMessageTranslator, useT } from "@/components/i18n-provider";

type Demo = { accounts: { username: string; role: string; hint: string }[]; password: string } | null;

export function LoginForm({ next, demo }: { next: string; demo: Demo }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const t = useT();
  const tm = useMessageTranslator();
  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error ? <Alert tone="danger">{tm(state.error)}</Alert> : null}
      <Field label={t("login.identifier")} htmlFor="identifier" required>
        <input id="identifier" name="identifier" className="input" autoComplete="username" required maxLength={120} value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      </Field>
      <Field label={t("login.password")} htmlFor="password" required>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <SubmitButton className="w-full" pendingText={t("login.pending")}>
        {t("login.submit")}
      </SubmitButton>
      {demo ? (
        <details className="rounded-md border border-dashed border-line bg-mist p-3 text-xs text-slate">
          <summary className="cursor-pointer font-semibold text-ink">{t("login.demoSummary")}</summary>
          <p className="mt-2">
            {t("login.demoText")} <code className="rounded bg-white px-1 font-mono">{demo.password}</code>. {t("login.demoHint")}
          </p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {demo.accounts.map((a) => (
              <li key={a.username}>
                <button
                  type="button"
                  className="w-full rounded border border-line bg-white px-2 py-1 text-left hover:border-blue"
                  onClick={() => {
                    setIdentifier(a.username);
                    setPassword(demo.password);
                  }}
                >
                  <span className="block font-mono text-[11px] text-ink">{a.username}</span>
                  <span className="block text-[11px]">{a.role}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </form>
  );
}

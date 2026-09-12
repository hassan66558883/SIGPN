"use client";

import { useActionState, useState, useTransition } from "react";
import { beginMfaAction, confirmMfaAction, disableMfaAction, regenerateRecoveryCodesAction } from "@/server/auth/actions";
import type { FormState } from "@/components/forms";
import { SubmitButton } from "@/components/forms";
import { Alert, Button, Code, Field } from "@/components/ui";
import { useMessageTranslator, useT } from "@/components/i18n-provider";

function RecoveryCodes({ codes }: { codes: string[] }) {
  const t = useT();
  return (
    <Alert tone="warning" title={t("mfa.recoveryTitle")}>
      <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm sm:grid-cols-4">
        {codes.map((c) => (
          <li key={c} className="rounded bg-white px-2 py-1 text-center text-ink">
            {c}
          </li>
        ))}
      </ul>
    </Alert>
  );
}

export function MfaEnrol() {
  const [setup, setSetup] = useState<{ secret: string; uri: string; qr: string } | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [state, confirm] = useActionState<FormState & { recoveryCodes?: string[] }, FormData>(confirmMfaAction, {});
  const t = useT();
  const tm = useMessageTranslator();

  if (state.ok && state.recoveryCodes) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{tm(state.message)}</Alert>
        <RecoveryCodes codes={state.recoveryCodes} />
        <a href="/dashboard" className="inline-block rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white">
          {t("common.continueDashboard")}
        </a>
      </div>
    );
  }

  if (!setup) {
    return (
      <div className="space-y-3 text-sm text-slate">
        <ol className="list-decimal space-y-1 ps-5">
          <li>{t("mfa.step1")}</li>
          <li>{t("mfa.step2")}</li>
          <li>{t("mfa.step3")}</li>
        </ol>
        {startError ? <Alert tone="danger">{tm(startError)}</Alert> : null}
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await beginMfaAction();
              if (r.ok && r.secret && r.uri && r.qr) setSetup({ secret: r.secret, uri: r.uri, qr: r.qr });
              else setStartError(r.error ?? "Could not start enrolment.");
            })
          }
        >
          {pending ? t("mfa.preparing") : t("mfa.start")}
        </Button>
      </div>
    );
  }

  return (
    <form action={confirm} className="grid gap-5 sm:grid-cols-[240px_1fr]" noValidate>
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={setup.qr} alt={t("mfa.qrAlt")} width={220} height={220} className="mx-auto rounded-md border border-line bg-white p-1" />
        <p className="mt-2 text-xs text-slate">{t("mfa.cantScan")}</p>
        <Code className="mt-1 block">{setup.secret}</Code>
      </div>
      <div className="space-y-4">
        {state.error ? <Alert tone="danger">{tm(state.error)}</Alert> : null}
        <Field label={t("mfa.codeLabel")} htmlFor="mfa-code" required>
          <input id="mfa-code" name="code" className="input font-mono text-lg tracking-widest" inputMode="numeric" autoComplete="one-time-code" required maxLength={7} placeholder="123 456" />
        </Field>
        <SubmitButton pendingText={t("mfaLogin.verifying")}>{t("mfa.confirm")}</SubmitButton>
        <p className="text-xs text-slate">{t("mfa.afterConfirm")}</p>
      </div>
    </form>
  );
}

export function MfaManage({ recoveryRemaining, canDisable }: { recoveryRemaining: number; canDisable: boolean }) {
  const [regen, regenAction] = useActionState<FormState & { recoveryCodes?: string[] }, FormData>(regenerateRecoveryCodesAction, {});
  const [dis, disableAction] = useActionState<FormState, FormData>(disableMfaAction, {});
  const t = useT();
  const tm = useMessageTranslator();
  return (
    <div className="space-y-6 text-sm">
      <p className="text-slate">{t("mfa.protectedText", { n: recoveryRemaining })}</p>
      <form action={regenAction} className="space-y-3 rounded-md border border-line p-3" noValidate>
        <p className="font-semibold text-ink">{t("mfa.regenTitle")}</p>
        {regen.error ? <Alert tone="danger">{tm(regen.error)}</Alert> : null}
        {regen.ok && regen.recoveryCodes ? <RecoveryCodes codes={regen.recoveryCodes} /> : null}
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("mfa.currentCode")} htmlFor="regen-code" required>
            <input id="regen-code" name="code" className="input font-mono" inputMode="numeric" required maxLength={7} />
          </Field>
          <SubmitButton variant="secondary" pendingText={t("mfa.generating")}>
            {t("mfa.regenerate")}
          </SubmitButton>
        </div>
      </form>
      {canDisable ? (
        <form action={disableAction} className="space-y-3 rounded-md border border-danger/30 p-3" noValidate>
          <p className="font-semibold text-danger">{t("mfa.disableTitle")}</p>
          {dis.error ? <Alert tone="danger">{tm(dis.error)}</Alert> : null}
          {dis.ok ? <Alert tone="success">{tm(dis.message)}</Alert> : null}
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t("mfa.yourPassword")} htmlFor="dis-pw" required>
              <input id="dis-pw" name="password" type="password" className="input" autoComplete="current-password" required />
            </Field>
            <SubmitButton variant="danger" pendingText={t("mfa.disabling")}>
              {t("mfa.disable")}
            </SubmitButton>
          </div>
        </form>
      ) : (
        <p className="text-xs text-slate">{t("mfa.mandatory")}</p>
      )}
    </div>
  );
}

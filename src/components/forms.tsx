"use client";

import { useActionState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button } from "@/components/ui";
import { useMessageTranslator, useT } from "@/components/i18n-provider";

export type FormState = { error?: string; ok?: boolean; message?: string; id?: string; fieldErrors?: Record<string, string> };

export function SubmitButton({ children, pendingText, ...props }: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? pendingText ?? t("common.working") : children}
    </Button>
  );
}

/** Stand-alone server-action button with hidden fields, optional confirmation and inline feedback. */
export function ActionButton({
  action,
  fields = {},
  children,
  variant = "primary",
  size,
  confirm,
  className,
  pendingText,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields?: Record<string, string>;
  children: ReactNode;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: "sm" | "xs";
  confirm?: string;
  className?: string;
  pendingText?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const tm = useMessageTranslator();
  return (
    <form
      action={formAction}
      className={className ?? "inline-flex flex-col items-start gap-1"}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton variant={variant} size={size} pendingText={pendingText}>
        {children}
      </SubmitButton>
      {state.error ? (
        <span className="text-xs font-medium text-danger" role="alert">
          {tm(state.error)}
        </span>
      ) : null}
      {state.ok && state.message ? <span className="text-xs font-medium text-success">{tm(state.message)}</span> : null}
    </form>
  );
}

/** Full form with state displayed at the top; children may be a render-prop receiving the (translated) state. */
export function ActionForm({
  action,
  children,
  className,
  successMessage,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode | ((state: FormState) => ReactNode);
  className?: string;
  successMessage?: string;
  initial?: FormState;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, initial ?? {});
  const tm = useMessageTranslator();
  const translated: FormState = {
    ...state,
    error: tm(state.error),
    message: tm(state.message),
    fieldErrors: state.fieldErrors ? Object.fromEntries(Object.entries(state.fieldErrors).map(([k, v]) => [k, tm(v) ?? v])) : undefined,
  };
  return (
    <form action={formAction} className={className ?? "space-y-4"} noValidate>
      {translated.error ? <Alert tone="danger">{translated.error}</Alert> : null}
      {translated.ok ? <Alert tone="success">{translated.message ?? successMessage ?? "OK"}</Alert> : null}
      {typeof children === "function" ? children(translated) : children}
    </form>
  );
}

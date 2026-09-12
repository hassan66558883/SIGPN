"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select } from "@/components/ui";
import { createRoleAction, updateRoleAction } from "@/server/admin/actions";
import { useLocale, useT } from "@/components/i18n-provider";
import { SCOPE_LEVEL, optionsOf } from "@/lib/labels";

export type RoleFormValues = { id: string; name: string; description: string | null; scopeLevel: string; requiresMfa: boolean };

export function RoleForm({ mode, role }: { mode: "create"; role?: undefined } | { mode: "edit"; role: RoleFormValues }) {
  const t = useT();
  const locale = useLocale();
  return (
    <ActionForm action={mode === "create" ? createRoleAction : updateRoleAction}>
      {(state) => (
        <>
          {mode === "edit" ? <input type="hidden" name="id" value={role.id} /> : null}
          {mode === "create" ? (
            <Field label={t("roles.code")} htmlFor="code" required hint={t("roles.codeHint")} error={state.fieldErrors?.code}>
              <input id="code" name="code" className="input font-mono" required pattern="[A-Za-z][A-Za-z0-9_]*" maxLength={40} />
            </Field>
          ) : null}
          <Field label={t("roles.name")} htmlFor="name" required error={state.fieldErrors?.name}>
            <input id="name" name="name" className="input" required maxLength={80} defaultValue={mode === "edit" ? role.name : ""} />
          </Field>
          <Field label={t("roles.description")} htmlFor="description">
            <textarea id="description" name="description" className="input" rows={mode === "edit" ? 3 : 2} maxLength={300} defaultValue={mode === "edit" ? role.description ?? "" : ""} />
          </Field>
          <Field label={t("roles.scopeLevel")} htmlFor="scopeLevel" required>
            <Select id="scopeLevel" name="scopeLevel" defaultValue={mode === "edit" ? role.scopeLevel : "STATION"} options={optionsOf(SCOPE_LEVEL, locale)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="requiresMfa" defaultChecked={mode === "edit" ? role.requiresMfa : false} /> {t("roles.requireMfa")}
          </label>
          <SubmitButton pendingText={mode === "create" ? t("common.creating") : t("common.saving")}>{mode === "create" ? t("roles.create") : t("common.save")}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
